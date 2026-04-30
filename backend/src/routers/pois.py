from __future__ import annotations

import json
import logging
from typing import List

from fastapi import APIRouter, Query

from backend.src.agents.poi_agent import POIAgent
from backend.src.models.poi import DistancesRequest, POI, POISuggestRequest, RouteSegment
from backend.src.services.google_directions_service import GoogleDirectionsService
import backend.src.services.redis_service as redis_svc
from backend.src.services.redis_service import hash_params

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pois", tags=["pois"])

_POI_SUGGEST_TTL = 60 * 60 * 24  # 24h


@router.post("/suggest", response_model=List[POI])
async def suggest_pois(
    req: POISuggestRequest, nocache: bool = Query(False)
) -> List[POI]:
    leg = next((l for l in req.trip_context.legs if l.leg_number == req.leg_number), None)
    destination = leg.destination if leg else str(req.leg_number)
    exclude_names = sorted(req.exclude_names) if req.exclude_names else []
    bypass = nocache or bool(exclude_names)
    cache_key = f"cache:pois:suggest:{hash_params({'destination': destination, 'adults': req.trip_context.adults, 'children': req.trip_context.children, 'prompt': req.user_prompt, 'leg': req.leg_number, 'exclude': exclude_names})}"

    redis = redis_svc._client
    if redis and not bypass:
        try:
            cached = await redis.get(cache_key)
            if cached:
                logger.debug("POI suggest cache hit: %s", cache_key)
                return json.loads(cached)
        except Exception:
            pass

    agent = POIAgent()
    pois = await agent.async_suggest(
        req.trip_context,
        req.leg_number,
        user_prompt=req.user_prompt,
        exclude_names=exclude_names or None,
        bypass_cache=bypass,
    )

    if redis and pois:
        try:
            await redis.set(cache_key, json.dumps([p.model_dump() for p in pois]), ex=_POI_SUGGEST_TTL)
        except Exception:
            pass

    return pois


@router.post("/distances", response_model=List[RouteSegment])
async def get_distances(req: DistancesRequest) -> List[RouteSegment]:
    service = GoogleDirectionsService()
    raw = await service.async_get_routes(req.day_items, req.mode_per_hop)
    return [RouteSegment(**r) for r in raw]
