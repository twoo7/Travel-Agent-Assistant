import asyncio
import hashlib
import json
import logging
import math
from typing import Any, Dict, List, Literal, Optional
import httpx
from backend.src.config import Config
from backend.src.models.trip import DayItem

logger = logging.getLogger(__name__)

DIRECTIONS_BASE = "https://maps.googleapis.com/maps/api/directions/json"
TransportMode = Literal["walking", "driving", "transit"]
_CACHE_TTL = 60 * 60 * 24 * 7  # 7 days


def _cache_key(origin: str, destination: str, mode: str) -> str:
    raw = f"directions:{origin}:{destination}:{mode}"
    return "cache:directions:" + hashlib.md5(raw.encode()).hexdigest()


class GoogleDirectionsService:
    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or Config.GOOGLE_MAPS_API_KEY

    def _fetch_route(self, origin: str, destination: str, mode: str) -> Dict[str, Any]:
        try:
            resp = httpx.get(
                DIRECTIONS_BASE,
                params={
                    "origin": origin,
                    "destination": destination,
                    "mode": mode,
                    "key": self.api_key,
                },
                timeout=10.0,
            )
            resp.raise_for_status()
            data = resp.json()
        except httpx.HTTPError as e:
            logger.error("Directions API error for %s→%s: %s", origin, destination, e)
            return {"distance_km": None, "travel_time_mins": None, "encoded_polyline": None, "mode": mode}

        if data.get("status") != "OK" or not data.get("routes"):
            return {"distance_km": None, "travel_time_mins": None, "encoded_polyline": None, "mode": mode}

        leg = data["routes"][0]["legs"][0]
        return {
            "distance_km": round(leg["distance"]["value"] / 1000, 2),
            "travel_time_mins": math.ceil(leg["duration"]["value"] / 60),
            "encoded_polyline": data["routes"][0].get("overview_polyline", {}).get("points"),
            "mode": mode,
        }

    def get_routes(
        self,
        items: List[DayItem],
        mode_per_hop: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Returns one route dict per consecutive pair in items.
        Each dict has: distance_km, travel_time_mins, encoded_polyline, mode.
        """
        if len(items) < 2:
            return []

        routes = []
        for i in range(len(items) - 1):
            mode: str = "walking"
            if mode_per_hop and i < len(mode_per_hop):
                mode = mode_per_hop[i]
            elif items[i].transport_mode:
                mode = items[i].transport_mode  # type: ignore[assignment]

            origin = f"{items[i].lat},{items[i].lng}"
            destination = f"{items[i + 1].lat},{items[i + 1].lng}"
            routes.append(self._fetch_route(origin, destination, mode))

        return routes

    async def async_get_routes(
        self,
        items: List[DayItem],
        mode_per_hop: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """Async version with Redis caching per (origin, dest, mode)."""
        if len(items) < 2:
            return []

        try:
            import backend.src.services.redis_service as redis_svc
            redis = redis_svc._client
        except Exception:
            redis = None

        async def _get_hop(i: int) -> Dict[str, Any]:
            mode: str = "walking"
            if mode_per_hop and i < len(mode_per_hop):
                mode = mode_per_hop[i]
            elif items[i].transport_mode:
                mode = items[i].transport_mode  # type: ignore[assignment]

            origin = f"{items[i].lat},{items[i].lng}"
            destination = f"{items[i + 1].lat},{items[i + 1].lng}"
            key = _cache_key(origin, destination, mode)

            if redis:
                try:
                    cached = await redis.get(key)
                    if cached:
                        return json.loads(cached)  # type: ignore[no-any-return]
                except Exception:
                    pass

            result = await asyncio.to_thread(self._fetch_route, origin, destination, mode)

            if redis:
                try:
                    await redis.set(key, json.dumps(result), ex=_CACHE_TTL)
                except Exception:
                    pass

            return result  # type: ignore[return-value]

        return list(await asyncio.gather(*[_get_hop(i) for i in range(len(items) - 1)]))
