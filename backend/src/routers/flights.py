from __future__ import annotations

from typing import List

from fastapi import APIRouter, HTTPException

from backend.src.agents.flight_agent import FlightAgent
from backend.src.models.flight import FlightOffer, FlightSearchRequest
from backend.src.services.amadeus_service import AmadeusService

router = APIRouter(prefix="/flights", tags=["flights"])


@router.post("/search", response_model=List[FlightOffer])
def search_flights(req: FlightSearchRequest) -> List[FlightOffer]:
    try:
        service = AmadeusService()
        offers = service.search_flights(
            origin=req.origin,
            destination=req.destination,
            departure_date=req.departure_date,
            adults=req.adults,
            max_results=req.max_results,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Flight search failed: {exc}") from exc

    agent = FlightAgent()
    return agent.rank_and_recommend(offers, req.trip_context)
