"""Tests for the /segments router (drive-time endpoint)."""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from backend.src.main import app
    return TestClient(app)


def _directions_ok_response(distance_m: int = 450_000, duration_s: int = 14400) -> dict:
    """Simulate a successful Google Directions API response."""
    return {
        "status": "OK",
        "routes": [
            {
                "legs": [
                    {
                        "distance": {"value": distance_m, "text": f"{distance_m // 1000} km"},
                        "duration": {"value": duration_s, "text": "4 hours"},
                    }
                ]
            }
        ],
    }


# ---------------------------------------------------------------------------
# POST /segments/drive-time
# ---------------------------------------------------------------------------

class TestDriveTime:
    def test_returns_distance_and_duration_when_api_succeeds(self, client):
        mock_resp = MagicMock()
        mock_resp.raise_for_status = MagicMock()
        mock_resp.json.return_value = _directions_ok_response(distance_m=450_000, duration_s=14400)

        with patch("backend.src.routers.segments.httpx.get", return_value=mock_resp) as mock_get:
            with patch("backend.src.routers.segments.Config") as mock_cfg:
                mock_cfg.GOOGLE_MAPS_API_KEY = "test-key"
                resp = client.post(
                    "/segments/drive-time",
                    json={
                        "origin": "London",
                        "destination": "Paris",
                        "departure_date": "2026-06-01",
                    },
                )

        assert resp.status_code == 200
        data = resp.json()
        assert data["origin"] == "London"
        assert data["destination"] == "Paris"
        assert data["distance_km"] == 450.0
        # 14400s → 240 min (ceil)
        assert data["duration_mins"] == 240
        assert "maps_url" in data
        assert "London" in data["maps_url"] or "London" in data["maps_url"].replace("+", " ")

    def test_returns_null_fields_when_api_returns_zero_routes(self, client):
        mock_resp = MagicMock()
        mock_resp.raise_for_status = MagicMock()
        mock_resp.json.return_value = {"status": "OK", "routes": []}

        with patch("backend.src.routers.segments.httpx.get", return_value=mock_resp):
            with patch("backend.src.routers.segments.Config") as mock_cfg:
                mock_cfg.GOOGLE_MAPS_API_KEY = "test-key"
                resp = client.post(
                    "/segments/drive-time",
                    json={
                        "origin": "JFK",
                        "destination": "LAX",
                        "departure_date": "2026-06-01",
                    },
                )

        assert resp.status_code == 200
        data = resp.json()
        assert data["distance_km"] is None
        assert data["duration_mins"] is None
        assert "maps_url" in data

    def test_returns_null_fields_when_api_returns_not_ok_status(self, client):
        mock_resp = MagicMock()
        mock_resp.raise_for_status = MagicMock()
        mock_resp.json.return_value = {"status": "ZERO_RESULTS", "routes": []}

        with patch("backend.src.routers.segments.httpx.get", return_value=mock_resp):
            with patch("backend.src.routers.segments.Config") as mock_cfg:
                mock_cfg.GOOGLE_MAPS_API_KEY = "test-key"
                resp = client.post(
                    "/segments/drive-time",
                    json={
                        "origin": "NYC",
                        "destination": "Tokyo",
                        "departure_date": "2026-06-01",
                    },
                )

        assert resp.status_code == 200
        data = resp.json()
        assert data["distance_km"] is None
        assert data["duration_mins"] is None

    def test_returns_null_fields_when_api_raises_exception(self, client):
        with patch("backend.src.routers.segments.httpx.get", side_effect=Exception("timeout")):
            with patch("backend.src.routers.segments.Config") as mock_cfg:
                mock_cfg.GOOGLE_MAPS_API_KEY = "test-key"
                resp = client.post(
                    "/segments/drive-time",
                    json={
                        "origin": "Berlin",
                        "destination": "Munich",
                        "departure_date": "2026-06-01",
                    },
                )

        assert resp.status_code == 200
        data = resp.json()
        assert data["distance_km"] is None
        assert data["duration_mins"] is None

    def test_maps_url_contains_origin_and_destination(self, client):
        mock_resp = MagicMock()
        mock_resp.raise_for_status = MagicMock()
        mock_resp.json.return_value = _directions_ok_response()

        with patch("backend.src.routers.segments.httpx.get", return_value=mock_resp):
            with patch("backend.src.routers.segments.Config") as mock_cfg:
                mock_cfg.GOOGLE_MAPS_API_KEY = "test-key"
                resp = client.post(
                    "/segments/drive-time",
                    json={
                        "origin": "Amsterdam",
                        "destination": "Brussels",
                        "departure_date": "2026-06-01",
                    },
                )

        assert resp.status_code == 200
        maps_url = resp.json()["maps_url"]
        assert "Amsterdam" in maps_url or "Amsterdam" in maps_url.replace("+", " ")
        assert "Brussels" in maps_url or "Brussels" in maps_url.replace("+", " ")

    def test_duration_is_ceiled_to_nearest_minute(self, client):
        # 14401 seconds → 240.016... minutes → ceil to 241
        mock_resp = MagicMock()
        mock_resp.raise_for_status = MagicMock()
        mock_resp.json.return_value = _directions_ok_response(duration_s=14401)

        with patch("backend.src.routers.segments.httpx.get", return_value=mock_resp):
            with patch("backend.src.routers.segments.Config") as mock_cfg:
                mock_cfg.GOOGLE_MAPS_API_KEY = "test-key"
                resp = client.post(
                    "/segments/drive-time",
                    json={
                        "origin": "A",
                        "destination": "B",
                        "departure_date": "2026-06-01",
                    },
                )

        assert resp.status_code == 200
        assert resp.json()["duration_mins"] == 241
