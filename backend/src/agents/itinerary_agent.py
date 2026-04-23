from __future__ import annotations

import json
import logging
from typing import Dict, List

from backend.src.agents.base import BaseAgent

logger = logging.getLogger(__name__)

ARRIVAL_LABELS = {
    "flight": "Fly in from",
    "train": "Train arrives from",
    "ferry": "Ferry arrives from",
    "car": "Drive from",
}


class ItineraryAgent(BaseAgent):
    """
    Uses Claude to generate a day-by-day narrative itinerary from a TripContext
    that already has legs, hotels, and day plans populated.
    """

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
            transport_mode = getattr(leg, "transport_mode", "flight")
            arrival_label = ARRIVAL_LABELS.get(transport_mode, "Fly in from")
            for i, day in enumerate(leg.days):
                items_desc = ", ".join(
                    f"{item.name} ({item.type})" for item in day.items
                ) or "no items scheduled"
                # Prepend the arrival label on the first day of each leg
                if i == 0:
                    items_desc = f"{arrival_label} {leg.origin}; {items_desc}"
                days_summary.append(
                    {
                        "day_number": day.day_number,
                        "date": day.date,
                        "city": day.city,
                        "transport_mode": transport_mode,
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
            f"For the first day of each leg, weave in the arrival transport "
            f"(e.g. 'After your Eurostar train journey from London...' or 'Landing in Paris...') "
            f"naturally into the narrative. "
            f"Return ONLY a JSON object where each key is 'day_<N>' and the value "
            f"is the narrative string. No markdown, no prose outside the JSON.\n"
            f"Example: {{\"day_1\": \"Begin your adventure...\", \"day_2\": \"...\"}}"
        )

        try:
            message = self._create_with_retry(
                model="claude-sonnet-4-6",
                max_tokens=1024,
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
