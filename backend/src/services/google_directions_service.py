import logging
import math
from typing import Any, Dict, List
import httpx
from backend.src.config import Config
from backend.src.models.trip import DayItem

logger = logging.getLogger(__name__)

DIRECTIONS_BASE = "https://maps.googleapis.com/maps/api/directions/json"


class GoogleDirectionsService:
    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or Config.GOOGLE_MAPS_API_KEY

    def get_routes(self, items: List[DayItem]) -> List[Dict[str, Any]]:
        """
        Returns one route dict per consecutive pair in items.
        Each dict has: distance_km, travel_time_mins, encoded_polyline.
        Returns empty list if fewer than 2 items.
        """
        if len(items) < 2:
            return []

        routes = []
        for i in range(len(items) - 1):
            origin = f"{items[i].lat},{items[i].lng}"
            destination = f"{items[i + 1].lat},{items[i + 1].lng}"

            resp = httpx.get(
                DIRECTIONS_BASE,
                params={
                    "origin": origin,
                    "destination": destination,
                    "mode": "walking",
                    "key": self.api_key,
                },
                timeout=10.0,
            )
            resp.raise_for_status()
            data = resp.json()

            if data.get("status") != "OK" or not data.get("routes"):
                routes.append({
                    "distance_km": None,
                    "travel_time_mins": None,
                    "encoded_polyline": None,
                })
                continue

            leg = data["routes"][0]["legs"][0]
            routes.append({
                "distance_km": round(leg["distance"]["value"] / 1000, 2),
                "travel_time_mins": math.ceil(leg["duration"]["value"] / 60),
                "encoded_polyline": data["routes"][0]["overviewPolyline"]["points"],
            })

        return routes
