from __future__ import annotations

import asyncio
from typing import List

from amadeus import ResponseError
from fastapi import APIRouter, HTTPException, Query

from backend.src.agents.flight_agent import FlightAgent
from backend.src.models.flight import FlightOffer, FlightSearchRequest
from backend.src.services import redis_service
from backend.src.services.amadeus_service import AmadeusService

router = APIRouter(prefix="/flights", tags=["flights"])

TTL_FLIGHTS = 2 * 3600  # 2 hours


@router.post("/search", response_model=List[FlightOffer])
async def search_flights(
    req: FlightSearchRequest, nocache: bool = Query(False)
) -> List[FlightOffer]:
    # Normalize params for a stable cache key
    cache_params = {
        "origin": req.origin.upper(),
        "destination": req.destination.upper(),
        "departure_date": req.departure_date,
        "adults": req.adults,
        "max_results": req.max_results,
        "currency": (req.currency or "").upper() or None,
    }
    cache_key = f"cache:amadeus:flights:{redis_service.hash_params(cache_params)}"

    async def fetch() -> list:
        service = AmadeusService()
        offers = await asyncio.to_thread(
            service.search_flights,
            origin=req.origin,
            destination=req.destination,
            departure_date=req.departure_date,
            adults=req.adults,
            max_results=req.max_results,
            currency_code=req.currency or None,
        )
        return [o.model_dump() for o in offers]

    try:
        raw = await redis_service.cached_call(
            cache_key, TTL_FLIGHTS, fetch, bypass=nocache
        )
    except ResponseError as exc:
        if exc.response.status_code == 500:
            raise HTTPException(
                status_code=503,
                detail="Flight search is temporarily unavailable. Please try again later.",
            ) from exc
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Flight search failed: {exc}") from exc

    offers = [FlightOffer(**o) for o in (raw or [])]
    agent = FlightAgent()
    return agent.rank_and_recommend(offers, req.trip_context)
