from __future__ import annotations

import json
import logging
from typing import List

import anthropic

from backend.src.config import Config

logger = logging.getLogger(__name__)


class HotelAgent:
    """Uses Claude to rank and recommend hotel offers."""

    def __init__(self) -> None:
        self.client = anthropic.Anthropic(api_key=Config.ANTHROPIC_API_KEY)

    def rank_and_recommend(
        self,
        offers: "List[HotelOffer]",  # noqa: F821
        trip_context: "TripContext",  # noqa: F821
    ) -> "List[HotelOffer]":  # noqa: F821
        """
        Ask Claude to pick the best hotel offer and mark it ai_recommended.
        Returns the same list with one offer flagged.
        """
        if not offers:
            return offers

        offers_summary = []
        for o in offers:
            offers_summary.append(
                {
                    "id": o.id,
                    "name": o.name,
                    "address": o.address,
                    "price_per_night": o.price_per_night,
                    "currency": o.currency,
                    "rating": o.rating,
                }
            )

        prompt = (
            f"You are a travel assistant. Given the following hotel offers for a trip "
            f"with {trip_context.adults} adult(s) and {trip_context.children} child(ren), "
            f"recommend the single best hotel balancing price, rating, and location.\n\n"
            f"Hotel offers (JSON):\n{json.dumps(offers_summary, indent=2)}\n\n"
            f"Respond with ONLY a JSON object in this exact format:\n"
            f'  {{"recommended_id": "<offer id>", "reason": "<one sentence reason>"}}'
        )

        try:
            message = self.client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=256,
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
            reason = result.get("reason", "")
        except Exception as exc:
            logger.warning("HotelAgent failed to get recommendation: %s", exc)
            # Fall back: mark the best-rated offer (or cheapest if no ratings)
            rated = [o for o in offers if o.rating is not None]
            if rated:
                recommended_id = max(rated, key=lambda o: o.rating).id  # type: ignore[arg-type]
            else:
                recommended_id = min(offers, key=lambda o: o.price_per_night).id
            reason = "Selected as best rated / lowest price (AI recommendation unavailable)."

        for offer in offers:
            if offer.id == recommended_id:
                offer.ai_recommended = True
                offer.ai_reason = reason
            else:
                offer.ai_recommended = False

        return offers
