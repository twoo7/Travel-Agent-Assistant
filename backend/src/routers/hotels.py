from __future__ import annotations

import asyncio
from typing import List

from amadeus import ResponseError
from fastapi import APIRouter, HTTPException, Query

from backend.src.agents.hotel_agent import HotelAgent
from backend.src.models.hotel import HotelOffer, HotelSearchRequest
from backend.src.services import redis_service
from backend.src.services.amadeus_service import AmadeusService

router = APIRouter(prefix="/hotels", tags=["hotels"])

TTL_HOTELS = 2 * 3600  # 2 hours


@router.post("/search", response_model=List[HotelOffer])
async def search_hotels(
    req: HotelSearchRequest, nocache: bool = Query(False)
) -> List[HotelOffer]:
    # Normalize params for a stable cache key
    cache_params = {
        "city_code": req.city_code.upper(),
        "check_in": req.check_in,
        "check_out": req.check_out,
        "adults": req.adults,
        "currency": (req.currency or "").upper() or None,
    }
    cache_key = f"cache:amadeus:hotels:{redis_service.hash_params(cache_params)}"

    async def fetch() -> list:
        service = AmadeusService()
        offers = await asyncio.to_thread(
            service.search_hotels,
            city_code=req.city_code,
            check_in=req.check_in,
            check_out=req.check_out,
            adults=req.adults,
            currency_code=req.currency or None,
        )
        return [o.model_dump() for o in offers]

    try:
        raw = await redis_service.cached_call(
            cache_key, TTL_HOTELS, fetch, bypass=nocache
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

    offers = [HotelOffer(**o) for o in (raw or [])]
    agent = HotelAgent()
    return agent.rank_and_recommend(offers, req.trip_context)
