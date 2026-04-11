from __future__ import annotations

from typing import List

from amadeus import ResponseError
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
            currency_code=req.currency or None,
        )
    except ResponseError as exc:
        if exc.response.status_code == 500:
            raise HTTPException(
                status_code=503,
                detail="Hotel search is temporarily unavailable. Please try again later.",
            ) from exc
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Hotel search failed: {exc}") from exc

    agent = HotelAgent()
    return agent.rank_and_recommend(offers, req.trip_context)
