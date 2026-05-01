from __future__ import annotations

import asyncio
import json
import logging
import uuid
from typing import List

from backend.src.agents.base import BaseAgent
from backend.src.models.poi import POI, POICategory
from backend.src.services.google_places_service import GooglePlacesService

logger = logging.getLogger(__name__)

_SUGGEST_COUNT = 16
_VALID_CATEGORIES: set[str] = {"activity", "restaurant", "sightseeing", "attraction"}


def _normalize_category(raw: str) -> POICategory:
    cleaned = raw.strip().lower()
    if cleaned in _VALID_CATEGORIES:
        return cleaned  # type: ignore[return-value]
    # Best-effort mapping from legacy free-form values
    if any(k in cleaned for k in ("restaurant", "food", "dining", "cafe", "bar", "eat")):
        return "restaurant"
    if any(k in cleaned for k in ("museum", "monument", "historic", "landmark", "sight", "view")):
        return "sightseeing"
    if any(k in cleaned for k in ("attraction", "tourist", "theme")):
        return "attraction"
    return "activity"


_PROMPT_TEMPLATE = """\
You are an expert travel guide. Suggest exactly {count} outstanding points of interest in {destination} \
for {adults} adult(s) and {children} child(ren).

Return EXACTLY 4 items per category, balanced across ALL four categories:
  - "activity"     — outdoor adventures, tours, experiences, cultural classes
  - "restaurant"   — notable local dining (breakfast, lunch, or dinner)
  - "sightseeing"  — monuments, museums, historic sites, scenic viewpoints
  - "attraction"   — theme parks, markets, entertainment, must-see tourist spots

Cluster POIs so that items sharing the same neighborhood flow naturally back-to-back or day-to-day.

Example of good clustering:
[
  {{"name": "Musée d'Orsay", "category": "sightseeing", "neighborhood": "7th Arrondissement", "theme_tags": ["morning", "indoor", "family-friendly"], ...}},
  {{"name": "Café de Flore", "category": "restaurant", "neighborhood": "7th Arrondissement", "theme_tags": ["morning", "outdoor"], ...}},
  {{"name": "Luxembourg Gardens", "category": "activity", "neighborhood": "6th Arrondissement", "theme_tags": ["afternoon", "outdoor", "family-friendly"], ...}}
]

Respond with ONLY a JSON array of {count} objects. Each object MUST have these exact keys:
  "name"              : string — official name of the place
  "category"          : one of "activity", "restaurant", "sightseeing", "attraction"
  "neighborhood"      : string or null — district/neighborhood name
  "theme_tags"        : array of strings from: ["morning", "afternoon", "evening", "family-friendly", "outdoor", "indoor", "rainy-day", "romantic", "budget-friendly"]
  "claude_note"       : string — 1-2 sentence insider tip
  "claude_best_time"  : string — best time of day or season to visit
  "claude_booking_tip": string or null — booking advice

Output the raw JSON array only — no markdown, no prose.\
"""


class POIAgent(BaseAgent):
    """
    Uses Claude to brainstorm POI suggestions, then enriches each one
    with real place data from Google Places.
    """

    def __init__(
        self,
        places_service: GooglePlacesService | None = None,
    ) -> None:
        super().__init__()
        self.places = places_service or GooglePlacesService()

    @staticmethod
    def _deduplicate(pois: List[POI]) -> List[POI]:
        seen: set[str] = set()
        unique: list[POI] = []
        for p in pois:
            if p.id not in seen:
                seen.add(p.id)
                unique.append(p)
        return unique

    def _build_prompt(self, destination: str, adults: int, children: int, user_prompt: str | None, exclude_names: list[str] | None = None) -> str:
        prompt = _PROMPT_TEMPLATE.format(
            count=_SUGGEST_COUNT,
            destination=destination,
            adults=adults,
            children=children,
        )
        if user_prompt:
            prompt += f"\n\nUser request: {user_prompt}. Prioritize suggestions matching this request."
        if exclude_names:
            exclude_str = ", ".join(f'"{n}"' for n in exclude_names[:40])
            prompt += f"\n\nDo NOT suggest any of these already-shown places: {exclude_str}. Suggest entirely different locations the user hasn't seen yet."
        return prompt

    def _build_poi(self, s: dict, place: dict | None, destination: str, name: str) -> POI:
        category = _normalize_category(s.get("category", "activity"))
        theme_tags = s.get("theme_tags") or []
        if not isinstance(theme_tags, list):
            theme_tags = []
        neighborhood = s.get("neighborhood") or None

        if place:
            return POI(
                id=place.get("place_id") or str(uuid.uuid4()),
                name=place.get("name") or name,
                category=category,
                address=place.get("address", ""),
                lat=place.get("lat", 0.0),
                lng=place.get("lng", 0.0),
                rating=place.get("rating"),
                review_count=place.get("review_count"),
                price_level=place.get("price_level"),
                opening_hours=place.get("opening_hours"),
                photo_url=place.get("photo_url"),
                photo_urls=place.get("photo_urls"),
                claude_note=s.get("claude_note", ""),
                claude_best_time=s.get("claude_best_time"),
                claude_booking_tip=s.get("claude_booking_tip"),
                theme_tags=theme_tags,
                neighborhood=neighborhood,
            )
        return POI(
            id=str(uuid.uuid4()),
            name=name,
            category=category,
            address=destination,
            lat=0.0,
            lng=0.0,
            claude_note=s.get("claude_note", ""),
            claude_best_time=s.get("claude_best_time"),
            claude_booking_tip=s.get("claude_booking_tip"),
            theme_tags=theme_tags,
            neighborhood=neighborhood,
        )

    def suggest(
        self,
        trip_context: "TripContext",  # noqa: F821
        leg_number: int,
        user_prompt: str | None = None,
        exclude_names: list[str] | None = None,
    ) -> List[POI]:
        leg = next(
            (l for l in trip_context.legs if l.leg_number == leg_number), None
        )
        destination = leg.destination if leg else "the destination"
        prompt = self._build_prompt(destination, trip_context.adults, trip_context.children, user_prompt, exclude_names)

        suggestions: list[dict] = []
        try:
            message = self._create_with_retry(
                model="claude-sonnet-4-6",
                max_tokens=4096,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = self._extract_json(message.content[0].text.strip())
            suggestions = json.loads(raw)
            if not isinstance(suggestions, list):
                raise ValueError("Expected a JSON array")
        except Exception as exc:
            logger.warning("POIAgent Claude call failed: %s", exc)
            return []

        pois: List[POI] = []
        for s in suggestions[:_SUGGEST_COUNT]:
            name = s.get("name", "")
            if not name:
                continue
            places = self.places.search_places(query=f"{name} {destination}", max_results=1)
            place = places[0] if places else None
            pois.append(self._build_poi(s, place, destination, name))

        return self._deduplicate(pois)

    async def async_suggest(
        self,
        trip_context: "TripContext",  # noqa: F821
        leg_number: int,
        user_prompt: str | None = None,
        exclude_names: list[str] | None = None,
        bypass_cache: bool = False,
    ) -> List[POI]:
        """Async version of suggest() using Redis-cached Google Places lookups."""
        leg = next(
            (l for l in trip_context.legs if l.leg_number == leg_number), None
        )
        destination = leg.destination if leg else "the destination"
        prompt = self._build_prompt(destination, trip_context.adults, trip_context.children, user_prompt, exclude_names)

        suggestions: list[dict] = []
        try:
            message = await asyncio.to_thread(
                self._create_with_retry,
                model="claude-sonnet-4-6",
                max_tokens=4096,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = self._extract_json(message.content[0].text.strip())
            suggestions = json.loads(raw)
            if not isinstance(suggestions, list):
                raise ValueError("Expected a JSON array")
        except Exception as exc:
            logger.warning("POIAgent Claude call failed: %s", exc)
            return []

        valid = [s for s in suggestions[:_SUGGEST_COUNT] if s.get("name")]

        async def _lookup(s: dict) -> POI:
            name = s["name"]
            try:
                places = await self.places.async_search_places_cached(
                    query=f"{name} {destination}", max_results=1, bypass=bypass_cache
                )
                place = places[0] if places else None
            except Exception:
                place = None
            return self._build_poi(s, place, destination, name)

        pois: List[POI] = list(await asyncio.gather(*[_lookup(s) for s in valid]))
        return self._deduplicate(pois)
