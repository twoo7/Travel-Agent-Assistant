from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, Query

from backend.src.agents.poi_agent import POIAgent
from backend.src.models.poi import DistancesRequest, POI, POISuggestRequest
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


@router.post("/distances", response_model=List[Dict[str, Any]])
def get_distances(req: DistancesRequest) -> List[Dict[str, Any]]:
    service = GoogleDirectionsService()
    return service.get_routes(req.day_items)
