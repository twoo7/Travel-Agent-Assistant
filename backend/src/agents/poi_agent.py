from __future__ import annotations

import asyncio
import json
import logging
import uuid
from typing import List

from backend.src.agents.base import BaseAgent
from backend.src.models.poi import POI
from backend.src.services.google_places_service import GooglePlacesService

logger = logging.getLogger(__name__)

_SUGGEST_COUNT = 12


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

    def suggest(
        self,
        trip_context: "TripContext",  # noqa: F821
        leg_number: int,
        user_prompt: str | None = None,
    ) -> List[POI]:
        """
        Return up to _SUGGEST_COUNT enriched POIs for the requested trip leg.
        """
        leg = next(
            (l for l in trip_context.legs if l.leg_number == leg_number), None
        )
        destination = leg.destination if leg else "the destination"

        prompt = (
            f"You are a knowledgeable travel guide. Suggest exactly {_SUGGEST_COUNT} "
            f"must-see points of interest in {destination} for a trip with "
            f"{trip_context.adults} adult(s) and {trip_context.children} child(ren).\n\n"
            f"Respond with ONLY a JSON array of objects, each with these keys:\n"
            f'  "name": string (official name of the place)\n'
            f'  "category": string (e.g. museum, park, restaurant, landmark)\n'
            f'  "claude_note": string (1-2 sentence insider tip)\n'
            f'  "claude_best_time": string (best time of day or season to visit)\n'
            f'  "claude_booking_tip": string (booking advice or null)\n\n'
            f"Output the raw JSON array only — no markdown, no prose."
        )
        if user_prompt:
            prompt += f"\n\nUser request: {user_prompt}. Prioritize suggestions matching this request."

        suggestions: list[dict] = []
        try:
            message = self._create_with_retry(
                model="claude-sonnet-4-6",
                max_tokens=2048,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = message.content[0].text.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            suggestions = json.loads(raw)
            if not isinstance(suggestions, list):
                raise ValueError("Expected a JSON array")
        except Exception as exc:
            logger.warning("POIAgent Claude call failed: %s", exc)
            return []

        pois: List[POI] = []
        for s in suggestions[:_SUGGEST_COUNT]:
            name = s.get("name", "")
            category = s.get("category", "attraction")
            if not name:
                continue

            # Enrich with real place data from Google
            places = self.places.search_places(
                query=f"{name} {destination}", max_results=1
            )

            if places:
                p = places[0]
                poi = POI(
                    id=p.get("place_id") or str(uuid.uuid4()),
                    name=p.get("name") or name,
                    category=category,
                    address=p.get("address", ""),
                    lat=p.get("lat", 0.0),
                    lng=p.get("lng", 0.0),
                    rating=p.get("rating"),
                    review_count=p.get("review_count"),
                    price_level=p.get("price_level"),
                    opening_hours=p.get("opening_hours"),
                    photo_url=p.get("photo_url"),
                    claude_note=s.get("claude_note", ""),
                    claude_best_time=s.get("claude_best_time"),
                    claude_booking_tip=s.get("claude_booking_tip"),
                )
            else:
                # Places lookup failed — keep Claude's suggestion with minimal data
                poi = POI(
                    id=str(uuid.uuid4()),
                    name=name,
                    category=category,
                    address=destination,
                    lat=0.0,
                    lng=0.0,
                    claude_note=s.get("claude_note", ""),
                    claude_best_time=s.get("claude_best_time"),
                    claude_booking_tip=s.get("claude_booking_tip"),
                )

            pois.append(poi)

        # Deduplicate by place_id
        seen: set[str] = set()
        unique: list[POI] = []
        for p in pois:
            if p.id not in seen:
                seen.add(p.id)
                unique.append(p)
        pois = unique

        return pois

    async def async_suggest(
        self,
        trip_context: "TripContext",  # noqa: F821
        leg_number: int,
        user_prompt: str | None = None,
        bypass_cache: bool = False,
    ) -> List[POI]:
        """Async version of suggest() using Redis-cached Google Places lookups."""
        leg = next(
            (l for l in trip_context.legs if l.leg_number == leg_number), None
        )
        destination = leg.destination if leg else "the destination"

        prompt = (
            f"You are a knowledgeable travel guide. Suggest exactly {_SUGGEST_COUNT} "
            f"must-see points of interest in {destination} for a trip with "
            f"{trip_context.adults} adult(s) and {trip_context.children} child(ren).\n\n"
            f"Respond with ONLY a JSON array of objects, each with these keys:\n"
            f'  "name": string (official name of the place)\n'
            f'  "category": string (e.g. museum, park, restaurant, landmark)\n'
            f'  "claude_note": string (1-2 sentence insider tip)\n'
            f'  "claude_best_time": string (best time of day or season to visit)\n'
            f'  "claude_booking_tip": string (booking advice or null)\n\n'
            f"Output the raw JSON array only — no markdown, no prose."
        )
        if user_prompt:
            prompt += f"\n\nUser request: {user_prompt}. Prioritize suggestions matching this request."

        suggestions: list[dict] = []
        try:
            message = await asyncio.to_thread(
                self._create_with_retry,
                model="claude-sonnet-4-6",
                max_tokens=2048,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = message.content[0].text.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            suggestions = json.loads(raw)
            if not isinstance(suggestions, list):
                raise ValueError("Expected a JSON array")
        except Exception as exc:
            logger.warning("POIAgent Claude call failed: %s", exc)
            return []

        pois: List[POI] = []
        for s in suggestions[:_SUGGEST_COUNT]:
            name = s.get("name", "")
            category = s.get("category", "attraction")
            if not name:
                continue

            places = await self.places.async_search_places_cached(
                query=f"{name} {destination}", max_results=1, bypass=bypass_cache
            )

            if places:
                p = places[0]
                poi = POI(
                    id=p.get("place_id") or str(uuid.uuid4()),
                    name=p.get("name") or name,
                    category=category,
                    address=p.get("address", ""),
                    lat=p.get("lat", 0.0),
                    lng=p.get("lng", 0.0),
                    rating=p.get("rating"),
                    review_count=p.get("review_count"),
                    price_level=p.get("price_level"),
                    opening_hours=p.get("opening_hours"),
                    photo_url=p.get("photo_url"),
                    claude_note=s.get("claude_note", ""),
                    claude_best_time=s.get("claude_best_time"),
                    claude_booking_tip=s.get("claude_booking_tip"),
                )
            else:
                poi = POI(
                    id=str(uuid.uuid4()),
                    name=name,
                    category=category,
                    address=destination,
                    lat=0.0,
                    lng=0.0,
                    claude_note=s.get("claude_note", ""),
                    claude_best_time=s.get("claude_best_time"),
                    claude_booking_tip=s.get("claude_booking_tip"),
                )

            pois.append(poi)

        # Deduplicate by place_id
        seen: set[str] = set()
        unique: list[POI] = []
        for p in pois:
            if p.id not in seen:
                seen.add(p.id)
                unique.append(p)
        pois = unique

        return pois
