from __future__ import annotations

from typing import List

from fastapi import APIRouter, HTTPException

from backend.src.agents.hotel_agent import HotelAgent
from backend.src.models.hotel import HotelOffer, HotelSearchRequest
from backend.src.services.amadeus_service import AmadeusService

router = APIRouter(prefix="/hotels", tags=["hotels"])


@router.post("/search", response_model=List[HotelOffer])
def search_hotels(req: HotelSearchRequest) -> List[HotelOffer]:
    try:
        service = AmadeusService()
        offers = service.search_hotels(
            city_code=req.city_code,
            check_in=req.check_in,
            check_out=req.check_out,
            adults=req.adults,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Hotel search failed: {exc}") from exc

    agent = HotelAgent()
    return agent.rank_and_recommend(offers, req.trip_context)
