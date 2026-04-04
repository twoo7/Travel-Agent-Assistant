from __future__ import annotations

import json
import logging
from typing import Dict, List

import anthropic

from backend.src.config import Config

logger = logging.getLogger(__name__)


class ItineraryAgent:
    """
    Uses Claude to generate a day-by-day narrative itinerary from a TripContext
    that already has legs, hotels, and day plans populated.
    """

    def __init__(self) -> None:
        self.client = anthropic.Anthropic(api_key=Config.ANTHROPIC_API_KEY)

    def generate(
        self,
        trip_context: "TripContext",  # noqa: F821
    ) -> Dict[str, str]:
        """
        Returns a dict mapping "day_<n>" -> narrative prose string.
        e.g. {"day_1": "Start your morning at ...", "day_2": "..."}
        """
        # Build a compact summary of the trip for the prompt
        days_summary = []
        for leg in trip_context.legs:
            for day in leg.days:
                items_desc = ", ".join(
                    f"{item.name} ({item.type})" for item in day.items
                ) or "no items scheduled"
                days_summary.append(
                    {
                        "day_number": day.day_number,
                        "date": day.date,
                        "city": day.city,
                        "items": items_desc,
                    }
                )

        if not days_summary:
            return {}

        prompt = (
            f"You are an enthusiastic travel writer. Write an engaging day-by-day "
            f"narrative itinerary for a trip from {trip_context.home_origin} with "
            f"{trip_context.adults} adult(s) and {trip_context.children} child(ren).\n\n"
            f"Trip schedule (JSON):\n{json.dumps(days_summary, indent=2)}\n\n"
            f"For each day write 2-4 sentences of vivid, practical narrative. "
            f"Return ONLY a JSON object where each key is 'day_<N>' and the value "
            f"is the narrative string. No markdown, no prose outside the JSON.\n"
            f"Example: {{\"day_1\": \"Begin your adventure...\", \"day_2\": \"...\"}}"
        )

        try:
            message = self.client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=2048,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = message.content[0].text.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            result = json.loads(raw)
            if not isinstance(result, dict):
                raise ValueError("Expected a JSON object")
            return {k: str(v) for k, v in result.items()}
        except Exception as exc:
            logger.warning("ItineraryAgent Claude call failed: %s", exc)
            # Fallback: return a plain summary for each day
            return {
                f"day_{d['day_number']}": (
                    f"Day {d['day_number']} in {d['city']} ({d['date']}): {d['items']}."
                )
                for d in days_summary
            }
