from __future__ import annotations

import json
import logging
from typing import List

import anthropic

from backend.src.config import Config

logger = logging.getLogger(__name__)


class FlightAgent:
    """Uses Claude to rank and recommend flight offers."""

    def __init__(self) -> None:
        self.client = anthropic.Anthropic(api_key=Config.ANTHROPIC_API_KEY)

    def rank_and_recommend(
        self,
        offers: "List[FlightOffer]",  # noqa: F821
        trip_context: "TripContext",  # noqa: F821
    ) -> "List[FlightOffer]":  # noqa: F821
        """
        Ask Claude to pick the best flight offer and mark it ai_recommended.
        Returns the same list with one offer flagged.
        """
        if not offers:
            return offers

        offers_summary = []
        for o in offers:
            offers_summary.append(
                {
                    "id": o.id,
                    "price": o.price,
                    "currency": o.currency,
                    "stops": o.stops,
                    "total_duration": o.total_duration,
                    "segments": [
                        {
                            "departure_airport": s.departure_airport,
                            "arrival_airport": s.arrival_airport,
                            "departure_time": s.departure_time,
                            "arrival_time": s.arrival_time,
                            "carrier_code": s.carrier_code,
                        }
                        for s in o.segments
                    ],
                }
            )

        prompt = (
            f"You are a travel assistant. Given the following flight offers for a trip "
            f"from {trip_context.home_origin} with {trip_context.adults} adult(s), "
            f"recommend the single best offer balancing price, duration, and convenience.\n\n"
            f"Flight offers (JSON):\n{json.dumps(offers_summary, indent=2)}\n\n"
            f"Respond with ONLY a JSON object in this exact format:\n"
            f'  {{"recommended_id": "<offer id>", "reason_bullets": ["<bullet 1>", "<bullet 2>", "<bullet 3>", "<bullet 4>"]}}\n\n'
            f"Each bullet must be one short sentence (max 12 words) with an emoji prefix. "
            f"Cover these 4 aspects in order: price value (💰), duration/stops (⏱), carrier reliability (✈), timing (⏰). "
            f"Example bullet: '💰 Best value: $850/person — $120 cheaper than next option'"
        )

        try:
            message = self.client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=512,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = message.content[0].text.strip()
            # Strip markdown code fences if present
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            result = json.loads(raw)
            recommended_id = result["recommended_id"]
            reason_bullets = result.get("reason_bullets", [])
            if not isinstance(reason_bullets, list):
                reason_bullets = []
        except Exception as exc:
            logger.warning("FlightAgent failed to get recommendation: %s", exc)
            # Fall back: mark the cheapest offer
            recommended_id = min(offers, key=lambda o: o.price).id
            reason_bullets = []

        for offer in offers:
            if offer.id == recommended_id:
                offer.ai_recommended = True
                offer.ai_reason_bullets = reason_bullets
                offer.ai_reason = " ".join(reason_bullets)
            else:
                offer.ai_recommended = False

        return offers
