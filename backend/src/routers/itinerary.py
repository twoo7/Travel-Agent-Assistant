from __future__ import annotations

from typing import Dict

from fastapi import APIRouter

from backend.src.agents.itinerary_agent import ItineraryAgent
from backend.src.models.trip import TripContext

router = APIRouter(prefix="/itinerary", tags=["itinerary"])


@router.post("/generate", response_model=Dict[str, str])
def generate_itinerary(trip_context: TripContext) -> Dict[str, str]:
    agent = ItineraryAgent()
    return agent.generate(trip_context)
