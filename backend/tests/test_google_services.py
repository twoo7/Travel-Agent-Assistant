import pytest
import httpx
import respx
from unittest.mock import MagicMock, patch
from backend.src.services.google_places_service import GooglePlacesService
from backend.src.services.google_directions_service import GoogleDirectionsService
from backend.src.models.trip import DayItem


MOCK_PLACES_SEARCH = {
    "places": [
        {
            "id": "ChIJN1t_tDeuEmsRUsoyG83frY4",
            "displayName": {"text": "Senso-ji Temple"},
            "formattedAddress": "2 Chome-3-1 Asakusa, Taito City, Tokyo",
            "location": {"latitude": 35.7147, "longitude": 139.7966},
            "rating": 4.7,
            "userRatingCount": 45000,
            "priceLevel": "PRICE_LEVEL_FREE",
            "currentOpeningHours": {"weekdayDescriptions": ["Monday: Open 24 hours"]},
        }
    ]
}

MOCK_DIRECTIONS = {
    "routes": [
        {
            "legs": [
                {
                    "distance": {"value": 1400},
                    "duration": {"value": 1080},
                    "steps": [],
                }
            ],
            "overviewPolyline": {"points": "abc123encodedpolyline"},
        }
    ],
    "status": "OK",
}


@respx.mock
def test_places_service_returns_result():
    respx.post("https://places.googleapis.com/v1/places:searchText").mock(
        return_value=httpx.Response(200, json=MOCK_PLACES_SEARCH)
    )

    service = GooglePlacesService(api_key="test_key")
    results = service.search_places("Senso-ji Temple", location_bias="Tokyo")

    assert len(results) == 1
    assert results[0]["name"] == "Senso-ji Temple"
    assert results[0]["place_id"] == "ChIJN1t_tDeuEmsRUsoyG83frY4"
    assert results[0]["rating"] == 4.7
    assert results[0]["price_level"] == 0  # PRICE_LEVEL_FREE → 0


@respx.mock
def test_places_service_empty_response():
    respx.post("https://places.googleapis.com/v1/places:searchText").mock(
        return_value=httpx.Response(200, json={"places": []})
    )

    service = GooglePlacesService(api_key="test_key")
    results = service.search_places("nonexistent place")
    assert results == []


def test_directions_service_returns_routes():
    with patch("backend.src.services.google_directions_service.httpx.get") as mock_get:
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: MOCK_DIRECTIONS,
        )

        service = GoogleDirectionsService(api_key="test_key")
        items = [
            DayItem(type="poi", name="A", address="Addr A", lat=35.71, lng=139.79),
            DayItem(type="poi", name="B", address="Addr B", lat=35.72, lng=139.80),
        ]
        routes = service.get_routes(items)

    assert len(routes) == 1
    assert routes[0]["distance_km"] == pytest.approx(1.4, abs=0.01)
    assert routes[0]["travel_time_mins"] == 18
    assert routes[0]["encoded_polyline"] == "abc123encodedpolyline"


def test_directions_service_single_item_returns_empty():
    service = GoogleDirectionsService(api_key="test_key")
    items = [DayItem(type="poi", name="A", address="Addr A", lat=35.71, lng=139.79)]
    routes = service.get_routes(items)
    assert routes == []
