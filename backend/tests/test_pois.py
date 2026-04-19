"""Tests for /pois/distances with mode_per_hop, and POI category enum."""
from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import fakeredis.aioredis as fake_aioredis
import pytest
from fastapi.testclient import TestClient

import backend.src.services.redis_service as redis_svc
from backend.src.models.poi import POI, RouteSegment
from backend.src.agents.poi_agent import _normalize_category  # noqa: PLC2701


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def patch_redis(monkeypatch: pytest.MonkeyPatch):
    fake = fake_aioredis.FakeRedis(decode_responses=True)
    monkeypatch.setattr(redis_svc, "_client", fake)
    yield fake


@pytest.fixture
def client():
    from backend.src.main import app
    return TestClient(app)


def _base_trip_context() -> dict:
    return {
        "home_origin": "JFK",
        "adults": 2,
        "children": 0,
        "currency": "USD",
        "legs": [],
        "unscheduled_pois": [],
        "saved_pois": [],
    }


def _two_items() -> list[dict]:
    return [
        {"type": "poi", "name": "A", "address": "A", "lat": 48.85, "lng": 2.29},
        {"type": "poi", "name": "B", "address": "B", "lat": 48.86, "lng": 2.34},
    ]


# ---------------------------------------------------------------------------
# Category normalisation
# ---------------------------------------------------------------------------

class TestNormalizeCategory:
    def test_valid_categories_pass_through(self):
        for cat in ("activity", "restaurant", "sightseeing", "attraction"):
            assert _normalize_category(cat) == cat

    def test_legacy_museum_maps_to_sightseeing(self):
        assert _normalize_category("museum") == "sightseeing"

    def test_legacy_landmark_maps_to_sightseeing(self):
        assert _normalize_category("landmark") == "sightseeing"

    def test_legacy_restaurant_maps(self):
        assert _normalize_category("dining") == "restaurant"

    def test_unknown_defaults_to_activity(self):
        assert _normalize_category("mystery") == "activity"


# ---------------------------------------------------------------------------
# POI model — new fields
# ---------------------------------------------------------------------------

class TestPOIModel:
    def test_default_category_is_activity(self):
        poi = POI(id="x", name="X", address="X", lat=0, lng=0)
        assert poi.category == "activity"

    def test_theme_tags_default_empty(self):
        poi = POI(id="x", name="X", address="X", lat=0, lng=0)
        assert poi.theme_tags == []

    def test_neighborhood_default_none(self):
        poi = POI(id="x", name="X", address="X", lat=0, lng=0)
        assert poi.neighborhood is None

    def test_all_four_categories_valid(self):
        for cat in ("activity", "restaurant", "sightseeing", "attraction"):
            poi = POI(id="x", name="X", category=cat, address="X", lat=0, lng=0)
            assert poi.category == cat


# ---------------------------------------------------------------------------
# RouteSegment model
# ---------------------------------------------------------------------------

class TestRouteSegment:
    def test_default_mode_is_walking(self):
        seg = RouteSegment()
        assert seg.mode == "walking"

    def test_explicit_driving(self):
        seg = RouteSegment(distance_km=5.0, travel_time_mins=10, mode="driving")
        assert seg.mode == "driving"


# ---------------------------------------------------------------------------
# /pois/distances — mode_per_hop
# ---------------------------------------------------------------------------

class TestDistancesEndpoint:
    def test_distances_accepts_mode_per_hop(self, client):
        """POST /pois/distances with mode_per_hop returns per-hop mode in response."""
        mock_route = {
            "distance_km": 1.2,
            "travel_time_mins": 15,
            "encoded_polyline": "abc",
            "mode": "driving",
        }

        with patch(
            "backend.src.routers.pois.GoogleDirectionsService"
        ) as MockSvc:
            instance = MockSvc.return_value
            instance.async_get_routes = AsyncMock(return_value=[mock_route])

            resp = client.post(
                "/pois/distances",
                json={
                    "day_items": _two_items(),
                    "mode_per_hop": ["driving"],
                },
            )

        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["mode"] == "driving"
        assert data[0]["distance_km"] == 1.2

    def test_distances_defaults_mode_walking(self, client):
        """Without mode_per_hop, mode defaults to walking."""
        mock_route = {
            "distance_km": 0.5,
            "travel_time_mins": 6,
            "encoded_polyline": "xyz",
            "mode": "walking",
        }

        with patch(
            "backend.src.routers.pois.GoogleDirectionsService"
        ) as MockSvc:
            instance = MockSvc.return_value
            instance.async_get_routes = AsyncMock(return_value=[mock_route])

            resp = client.post(
                "/pois/distances",
                json={"day_items": _two_items()},
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data[0]["mode"] == "walking"

    def test_distances_mixed_modes(self, client):
        """Three items with two different modes returns correct per-hop modes."""
        items = _two_items() + [
            {"type": "poi", "name": "C", "address": "C", "lat": 48.87, "lng": 2.35}
        ]
        mock_routes = [
            {"distance_km": 0.4, "travel_time_mins": 5, "encoded_polyline": "a", "mode": "walking"},
            {"distance_km": 5.0, "travel_time_mins": 12, "encoded_polyline": "b", "mode": "driving"},
        ]

        with patch(
            "backend.src.routers.pois.GoogleDirectionsService"
        ) as MockSvc:
            instance = MockSvc.return_value
            instance.async_get_routes = AsyncMock(return_value=mock_routes)

            resp = client.post(
                "/pois/distances",
                json={
                    "day_items": items,
                    "mode_per_hop": ["walking", "driving"],
                },
            )

        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["mode"] == "walking"
        assert data[1]["mode"] == "driving"


# ---------------------------------------------------------------------------
# /pois/suggest — 4-category response pass-through
# ---------------------------------------------------------------------------

_FOUR_CATEGORY_RESPONSE = json.dumps([
    {"name": "Tour Eiffel", "category": "sightseeing", "neighborhood": "7th", "theme_tags": ["morning"], "claude_note": "n", "claude_best_time": "b", "claude_booking_tip": None},
    {"name": "Le Jules Verne", "category": "restaurant", "neighborhood": "7th", "theme_tags": ["evening"], "claude_note": "n", "claude_best_time": "b", "claude_booking_tip": "Reserve"},
    {"name": "Bateau-Mouche", "category": "activity", "neighborhood": "8th", "theme_tags": ["afternoon"], "claude_note": "n", "claude_best_time": "b", "claude_booking_tip": None},
    {"name": "Palais Royal", "category": "attraction", "neighborhood": "1st", "theme_tags": ["morning", "outdoor"], "claude_note": "n", "claude_best_time": "b", "claude_booking_tip": None},
])


class TestSuggestEndpoint:
    def test_suggest_returns_4_categories(self, client):
        """Mock Claude response with all four categories; assert all are preserved."""
        def _block(text):
            b = MagicMock()
            b.text = text
            msg = MagicMock()
            msg.content = [b]
            return msg

        mock_claude = MagicMock()
        mock_claude.messages.create.return_value = _block(_FOUR_CATEGORY_RESPONSE)

        mock_places = MagicMock()
        mock_places.search_places.return_value = []
        mock_places.async_search_places_cached = AsyncMock(return_value=[])

        with patch("backend.src.agents.base.Config") as mock_cfg, \
             patch("backend.src.agents.base.anthropic.Anthropic", return_value=mock_claude), \
             patch("backend.src.routers.pois.POIAgent") as MockAgent:
            mock_cfg.ANTHROPIC_API_KEY = "test"

            from backend.src.agents.poi_agent import POIAgent
            real_agent = POIAgent(places_service=mock_places)

            async def _async_suggest(*args, **kwargs):
                kwargs.pop("bypass_cache", None)
                return real_agent.suggest(*args, **kwargs)

            MockAgent.return_value.async_suggest = AsyncMock(side_effect=_async_suggest)

            leg = {
                "leg_number": 1,
                "origin": "JFK",
                "destination": "Paris",
                "departure_date": "2025-06-01",
                "hotel_stays": [],
                "days": [],
            }
            ctx = {**_base_trip_context(), "legs": [leg]}

            resp = client.post("/pois/suggest", json={"trip_context": ctx, "leg_number": 1})

        assert resp.status_code == 200
        pois = resp.json()
        categories = {p["category"] for p in pois}
        assert "sightseeing" in categories
        assert "restaurant" in categories
        assert "activity" in categories
        assert "attraction" in categories
