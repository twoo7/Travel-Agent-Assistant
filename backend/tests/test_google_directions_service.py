"""Tests for GoogleDirectionsService — mode parameter and cache-key isolation."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import fakeredis.aioredis as fake_aioredis
import pytest

from backend.src.services.google_directions_service import _cache_key, GoogleDirectionsService
from backend.src.models.trip import DayItem

import backend.src.services.redis_service as redis_svc


@pytest.fixture(autouse=True)
def patch_redis(monkeypatch: pytest.MonkeyPatch):
    fake = fake_aioredis.FakeRedis(decode_responses=True)
    monkeypatch.setattr(redis_svc, "_client", fake)
    yield fake


def _item(lat: float, lng: float) -> DayItem:
    return DayItem(type="poi", name="P", address="A", lat=lat, lng=lng)


class TestCacheKey:
    def test_same_route_different_modes_produce_different_keys(self):
        origin = "48.85,2.29"
        dest = "48.86,2.34"
        key_walk = _cache_key(origin, dest, "walking")
        key_drive = _cache_key(origin, dest, "driving")
        key_transit = _cache_key(origin, dest, "transit")
        assert key_walk != key_drive
        assert key_walk != key_transit
        assert key_drive != key_transit

    def test_same_route_same_mode_produces_same_key(self):
        origin = "48.85,2.29"
        dest = "48.86,2.34"
        assert _cache_key(origin, dest, "walking") == _cache_key(origin, dest, "walking")

    def test_key_prefixed_correctly(self):
        key = _cache_key("1,2", "3,4", "driving")
        assert key.startswith("cache:directions:")


class TestGetRoutes:
    def _mock_api_response(self, distance_m: int, duration_s: int, polyline: str) -> dict:
        return {
            "status": "OK",
            "routes": [
                {
                    "legs": [
                        {
                            "distance": {"value": distance_m},
                            "duration": {"value": duration_s},
                        }
                    ],
                    "overviewPolyline": {"points": polyline},
                }
            ],
        }

    def test_mode_included_in_result(self):
        """get_routes passes mode through to the result dict."""
        svc = GoogleDirectionsService(api_key="test")
        items = [_item(48.85, 2.29), _item(48.86, 2.34)]

        with patch("backend.src.services.google_directions_service.httpx.get") as mock_get:
            mock_resp = MagicMock()
            mock_resp.json.return_value = self._mock_api_response(1200, 900, "abc")
            mock_resp.raise_for_status.return_value = None
            mock_get.return_value = mock_resp

            routes = svc.get_routes(items, mode_per_hop=["driving"])

        assert len(routes) == 1
        assert routes[0]["mode"] == "driving"
        assert routes[0]["distance_km"] == 1.2

    def test_mode_defaults_to_walking(self):
        svc = GoogleDirectionsService(api_key="test")
        items = [_item(48.85, 2.29), _item(48.86, 2.34)]

        with patch("backend.src.services.google_directions_service.httpx.get") as mock_get:
            mock_resp = MagicMock()
            mock_resp.json.return_value = self._mock_api_response(500, 360, "xyz")
            mock_resp.raise_for_status.return_value = None
            mock_get.return_value = mock_resp

            routes = svc.get_routes(items)

        assert routes[0]["mode"] == "walking"

    def test_empty_items_returns_empty(self):
        svc = GoogleDirectionsService(api_key="test")
        assert svc.get_routes([]) == []
        assert svc.get_routes([_item(0, 0)]) == []

    @pytest.mark.asyncio
    async def test_cache_key_includes_mode_async(self, patch_redis):
        """Two async calls with same route but different modes hit different cache slots."""
        svc = GoogleDirectionsService(api_key="test")
        items = [_item(48.85, 2.29), _item(48.86, 2.34)]

        walk_result = {"distance_km": 0.5, "travel_time_mins": 6, "encoded_polyline": "w", "mode": "walking"}
        drive_result = {"distance_km": 0.5, "travel_time_mins": 2, "encoded_polyline": "d", "mode": "driving"}

        with patch.object(svc, "_fetch_route", side_effect=[walk_result, drive_result]):
            r1 = await svc.async_get_routes(items, mode_per_hop=["walking"])
            r2 = await svc.async_get_routes(items, mode_per_hop=["driving"])

        assert r1[0]["mode"] == "walking"
        assert r2[0]["mode"] == "driving"
