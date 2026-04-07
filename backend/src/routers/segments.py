from __future__ import annotations

import logging
import math
from typing import Optional
from urllib.parse import quote_plus

import httpx
from fastapi import APIRouter
from pydantic import BaseModel

from backend.src.config import Config

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/segments", tags=["segments"])

DIRECTIONS_BASE = "https://maps.googleapis.com/maps/api/directions/json"


class DriveTimeRequest(BaseModel):
    origin: str
    destination: str
    departure_date: str  # used for context only, not passed to Directions


class DriveTimeResponse(BaseModel):
    origin: str
    destination: str
    distance_km: Optional[float] = None
    duration_mins: Optional[int] = None
    maps_url: str


@router.post("/drive-time", response_model=DriveTimeResponse)
def get_drive_time(req: DriveTimeRequest) -> DriveTimeResponse:
    maps_url = (
        f"https://www.google.com/maps/dir/{quote_plus(req.origin)}/{quote_plus(req.destination)}"
    )

    distance_km: Optional[float] = None
    duration_mins: Optional[int] = None

    try:
        api_key = Config.GOOGLE_MAPS_API_KEY
        resp = httpx.get(
            DIRECTIONS_BASE,
            params={
                "origin": req.origin,
                "destination": req.destination,
                "mode": "driving",
                "key": api_key,
            },
            timeout=10.0,
        )
        resp.raise_for_status()
        data = resp.json()

        if data.get("status") == "OK" and data.get("routes"):
            leg = data["routes"][0]["legs"][0]
            distance_km = round(leg["distance"]["value"] / 1000, 2)
            duration_mins = math.ceil(leg["duration"]["value"] / 60)
    except Exception as e:
        logger.error(
            "Drive time lookup failed for %s → %s: %s", req.origin, req.destination, e
        )

    return DriveTimeResponse(
        origin=req.origin,
        destination=req.destination,
        distance_km=distance_km,
        duration_mins=duration_mins,
        maps_url=maps_url,
    )
