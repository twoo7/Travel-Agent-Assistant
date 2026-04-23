from __future__ import annotations

from typing import List

from fastapi import APIRouter, Query

from backend.src.agents.poi_agent import POIAgent
from backend.src.models.poi import DistancesRequest, POI, POISuggestRequest, RouteSegment
from backend.src.services.google_directions_service import GoogleDirectionsService

router = APIRouter(prefix="/pois", tags=["pois"])


@router.post("/suggest", response_model=List[POI])
async def suggest_pois(
    req: POISuggestRequest, nocache: bool = Query(False)
) -> List[POI]:
    agent = POIAgent()
    return await agent.async_suggest(
        req.trip_context,
        req.leg_number,
        user_prompt=req.user_prompt,
        bypass_cache=nocache,
    )


@router.post("/distances", response_model=List[RouteSegment])
async def get_distances(req: DistancesRequest) -> List[RouteSegment]:
    service = GoogleDirectionsService()
    raw = await service.async_get_routes(req.day_items, req.mode_per_hop)
    return [RouteSegment(**r) for r in raw]
