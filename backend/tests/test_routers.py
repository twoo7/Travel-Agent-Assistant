"""FastAPI router integration tests — all services and agents mocked."""
from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

import fakeredis.aioredis as fake_aioredis
import pytest
from fastapi.testclient import TestClient

import backend.src.services.redis_service as redis_svc


async def _coro(value):
    """Return a coroutine that resolves to *value* — used for async mock side_effects."""
    return value
from backend.src.models.flight import FlightOffer, FlightSegment
from backend.src.models.hotel import HotelOffer
from backend.src.models.poi import POI
from backend.src.models.trip import DayItem, DayPlan, TripContext, TripLeg

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def patch_redis(monkeypatch: pytest.MonkeyPatch):
    """Provide a fakeredis client for every test so cached_call doesn't error."""
    fake = fake_aioredis.FakeRedis(decode_responses=True)
    monkeypatch.setattr(redis_svc, "_client", fake)
    yield fake


@pytest.fixture
def client():
    from backend.src.main import app
    return TestClient(app)


def _base_trip_context() -> dict:
    return {"home_origin": "JFK", "adults": 2, "children": 0, "currency": "USD", "legs": [], "unscheduled_pois": [], "saved_pois": []}


def _flight_offer_dict(offer_id: str = "F1") -> dict:
    return {
        "id": offer_id,
        "price": 350.0,
        "currency": "USD",
        "segments": [
            {
                "departure_airport": "JFK",
                "arrival_airport": "CDG",
                "departure_time": "2025-06-01T08:00:00",
                "arrival_time": "2025-06-01T20:00:00",
                "duration": "PT7H",
                "carrier_code": "AF",
                "flight_number": "AF006",
            }
        ],
        "total_duration": "PT7H",
        "stops": 0,
        "ai_recommended": False,
        "ai_reason": None,
    }


def _hotel_offer_dict(offer_id: str = "H1") -> dict:
    return {
        "id": offer_id,
        "name": "Grand Paris Hotel",
        "address": "1 Rue de Rivoli",
        "lat": 48.8566,
        "lng": 2.3522,
        "price_per_night": 200.0,
        "currency": "EUR",
        "rating": 4.5,
        "ai_recommended": False,
        "ai_reason": None,
    }


def _poi_dict(poi_id: str = "P1") -> dict:
    return {
        "id": poi_id,
        "name": "Eiffel Tower",
        "category": "landmark",
        "address": "Champ de Mars, Paris",
        "lat": 48.8584,
        "lng": 2.2945,
        "opening_hours": None,
        "booking_required": False,
        "indoor_outdoor": None,
        "busy_times": None,
        "typical_visit_duration_mins": None,
        "price_level": None,
        "rating": 4.7,
        "review_count": None,
        "photo_url": None,
        "nearest_transit": None,
        "claude_note": "Iconic Paris landmark.",
        "claude_best_time": "Sunset",
        "claude_booking_tip": "Book ahead.",
    }


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

def test_cors_header_present(client):
    resp = client.options(
        "/health",
        headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "GET"},
    )
    assert resp.headers.get("access-control-allow-origin") == "http://localhost:3000"


# ---------------------------------------------------------------------------
# POST /flights/search
# ---------------------------------------------------------------------------

def test_flights_search_returns_offers(client):
    offer = FlightOffer(**{**_flight_offer_dict(), "ai_recommended": True, "ai_reason": "Best deal."})

    with patch("backend.src.routers.flights.AmadeusService") as MockSvc, \
         patch("backend.src.routers.flights.FlightAgent") as MockAgent:
        MockSvc.return_value.search_flights.return_value = [offer]
        MockAgent.return_value.rank_and_recommend.return_value = [offer]

        resp = client.post(
            "/flights/search",
            json={
                "trip_context": _base_trip_context(),
                "leg_number": 1,
                "origin": "JFK",
                "destination": "CDG",
                "departure_date": "2025-06-01",
                "adults": 2,
                "max_results": 5,
            },
        )

    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert data[0]["id"] == "F1"
    assert data[0]["ai_recommended"] is True


def test_flights_search_passes_currency(client):
    offer = FlightOffer(**{**_flight_offer_dict(), "ai_recommended": False})

    with patch("backend.src.routers.flights.AmadeusService") as MockSvc, \
         patch("backend.src.routers.flights.FlightAgent") as MockAgent:
        MockSvc.return_value.search_flights.return_value = [offer]
        MockAgent.return_value.rank_and_recommend.return_value = [offer]

        client.post(
            "/flights/search",
            json={
                "trip_context": {**_base_trip_context(), "currency": "EUR"},
                "leg_number": 1,
                "origin": "JFK",
                "destination": "CDG",
                "departure_date": "2025-06-01",
                "adults": 2,
                "currency": "EUR",
            },
        )

    MockSvc.return_value.search_flights.assert_called_once()
    call_kwargs = MockSvc.return_value.search_flights.call_args.kwargs
    assert call_kwargs.get("currency_code") == "EUR"


def test_flights_search_503_on_amadeus_500(client):
    from amadeus import ResponseError as AmadeusResponseError
    mock_resp = MagicMock()
    mock_resp.status_code = 500
    err = AmadeusResponseError(mock_resp)

    with patch("backend.src.routers.flights.AmadeusService") as MockSvc:
        MockSvc.return_value.search_flights.side_effect = err

        resp = client.post(
            "/flights/search",
            json={
                "trip_context": _base_trip_context(),
                "leg_number": 1,
                "origin": "JFK",
                "destination": "CDG",
                "departure_date": "2025-06-01",
                "adults": 2,
            },
        )

    assert resp.status_code == 503
    assert "temporarily unavailable" in resp.json()["detail"].lower()


def test_flights_search_502_on_service_error(client):
    with patch("backend.src.routers.flights.AmadeusService") as MockSvc:
        MockSvc.return_value.search_flights.side_effect = RuntimeError("Amadeus down")

        resp = client.post(
            "/flights/search",
            json={
                "trip_context": _base_trip_context(),
                "leg_number": 1,
                "origin": "JFK",
                "destination": "CDG",
                "departure_date": "2025-06-01",
                "adults": 2,
            },
        )

    assert resp.status_code == 502
    assert "Flight search failed" in resp.json()["detail"]


def test_flights_search_cache_hit(client):
    """Second identical request should not call AmadeusService again."""
    offer = FlightOffer(**{**_flight_offer_dict(), "ai_recommended": True, "ai_reason": "Best deal."})
    req_body = {
        "trip_context": _base_trip_context(),
        "leg_number": 1,
        "origin": "JFK",
        "destination": "CDG",
        "departure_date": "2025-06-01",
        "adults": 2,
    }

    with patch("backend.src.routers.flights.AmadeusService") as MockSvc, \
         patch("backend.src.routers.flights.FlightAgent") as MockAgent:
        MockSvc.return_value.search_flights.return_value = [offer]
        MockAgent.return_value.rank_and_recommend.return_value = [offer]

        client.post("/flights/search", json=req_body)
        client.post("/flights/search", json=req_body)

    assert MockSvc.return_value.search_flights.call_count == 1


def test_flights_search_nocache_bypasses_cache(client):
    """?nocache=true forces a fresh fetch even when cache is warm."""
    offer = FlightOffer(**{**_flight_offer_dict(), "ai_recommended": False})
    req_body = {
        "trip_context": _base_trip_context(),
        "leg_number": 1,
        "origin": "JFK",
        "destination": "CDG",
        "departure_date": "2025-06-01",
        "adults": 2,
    }

    with patch("backend.src.routers.flights.AmadeusService") as MockSvc, \
         patch("backend.src.routers.flights.FlightAgent") as MockAgent:
        MockSvc.return_value.search_flights.return_value = [offer]
        MockAgent.return_value.rank_and_recommend.return_value = [offer]

        client.post("/flights/search?nocache=true", json=req_body)
        client.post("/flights/search?nocache=true", json=req_body)

    assert MockSvc.return_value.search_flights.call_count == 2


# ---------------------------------------------------------------------------
# POST /hotels/search
# ---------------------------------------------------------------------------

def test_hotels_search_returns_offers(client):
    offer = HotelOffer(**{**_hotel_offer_dict(), "ai_recommended": True, "ai_reason": "Best rated."})

    with patch("backend.src.routers.hotels.AmadeusService") as MockSvc, \
         patch("backend.src.routers.hotels.HotelAgent") as MockAgent:
        MockSvc.return_value.search_hotels.return_value = [offer]
        MockAgent.return_value.rank_and_recommend.return_value = [offer]

        resp = client.post(
            "/hotels/search",
            json={
                "trip_context": _base_trip_context(),
                "leg_number": 1,
                "city_code": "PAR",
                "check_in": "2025-06-01",
                "check_out": "2025-06-05",
                "adults": 2,
            },
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data[0]["id"] == "H1"
    assert data[0]["ai_recommended"] is True


def test_hotels_search_503_on_amadeus_500(client):
    from amadeus import ResponseError as AmadeusResponseError
    mock_resp = MagicMock()
    mock_resp.status_code = 500
    err = AmadeusResponseError(mock_resp)

    with patch("backend.src.routers.hotels.AmadeusService") as MockSvc:
        MockSvc.return_value.search_hotels.side_effect = err

        resp = client.post(
            "/hotels/search",
            json={
                "trip_context": _base_trip_context(),
                "leg_number": 1,
                "city_code": "PAR",
                "check_in": "2025-06-01",
                "check_out": "2025-06-05",
                "adults": 2,
            },
        )

    assert resp.status_code == 503
    assert "temporarily unavailable" in resp.json()["detail"].lower()


def test_hotels_search_502_on_service_error(client):
    with patch("backend.src.routers.hotels.AmadeusService") as MockSvc:
        MockSvc.return_value.search_hotels.side_effect = RuntimeError("Amadeus down")

        resp = client.post(
            "/hotels/search",
            json={
                "trip_context": _base_trip_context(),
                "leg_number": 1,
                "city_code": "PAR",
                "check_in": "2025-06-01",
                "check_out": "2025-06-05",
                "adults": 2,
            },
        )

    assert resp.status_code == 502


def test_hotels_search_cache_hit(client):
    """Second identical request should not call AmadeusService again."""
    offer = HotelOffer(**{**_hotel_offer_dict(), "ai_recommended": True, "ai_reason": "Best rated."})
    req_body = {
        "trip_context": _base_trip_context(),
        "leg_number": 1,
        "city_code": "PAR",
        "check_in": "2025-06-01",
        "check_out": "2025-06-05",
        "adults": 2,
    }

    with patch("backend.src.routers.hotels.AmadeusService") as MockSvc, \
         patch("backend.src.routers.hotels.HotelAgent") as MockAgent:
        MockSvc.return_value.search_hotels.return_value = [offer]
        MockAgent.return_value.rank_and_recommend.return_value = [offer]

        client.post("/hotels/search", json=req_body)
        client.post("/hotels/search", json=req_body)

    assert MockSvc.return_value.search_hotels.call_count == 1


def test_hotels_search_nocache_bypasses_cache(client):
    """?nocache=true forces a fresh fetch even when cache is warm."""
    offer = HotelOffer(**{**_hotel_offer_dict(), "ai_recommended": False})
    req_body = {
        "trip_context": _base_trip_context(),
        "leg_number": 1,
        "city_code": "PAR",
        "check_in": "2025-06-01",
        "check_out": "2025-06-05",
        "adults": 2,
    }

    with patch("backend.src.routers.hotels.AmadeusService") as MockSvc, \
         patch("backend.src.routers.hotels.HotelAgent") as MockAgent:
        MockSvc.return_value.search_hotels.return_value = [offer]
        MockAgent.return_value.rank_and_recommend.return_value = [offer]

        client.post("/hotels/search?nocache=true", json=req_body)
        client.post("/hotels/search?nocache=true", json=req_body)

    assert MockSvc.return_value.search_hotels.call_count == 2


# ---------------------------------------------------------------------------
# POST /pois/suggest
# ---------------------------------------------------------------------------

def test_pois_suggest_returns_pois(client):
    poi = POI(**_poi_dict())

    with patch("backend.src.routers.pois.POIAgent") as MockAgent:
        MockAgent.return_value.async_suggest = MagicMock(return_value=_coro([poi]))

        resp = client.post(
            "/pois/suggest",
            json={"trip_context": _base_trip_context(), "leg_number": 1},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data[0]["name"] == "Eiffel Tower"
    assert data[0]["claude_note"] == "Iconic Paris landmark."


def test_pois_suggest_with_user_prompt(client):
    import unittest.mock
    poi = POI(**_poi_dict())
    with patch("backend.src.routers.pois.POIAgent") as MockAgent:
        MockAgent.return_value.async_suggest = MagicMock(return_value=_coro([poi]))
        resp = client.post(
            "/pois/suggest",
            json={"trip_context": _base_trip_context(), "leg_number": 1, "user_prompt": "more museums"},
        )
    assert resp.status_code == 200
    MockAgent.return_value.async_suggest.assert_called_once_with(
        unittest.mock.ANY, 1, user_prompt="more museums", bypass_cache=False
    )


# ---------------------------------------------------------------------------
# POST /pois/distances
# ---------------------------------------------------------------------------

def test_pois_distances_returns_routes(client):
    routes = [{"distance_km": 1.2, "travel_time_mins": 15, "encoded_polyline": "abc123"}]

    with patch("backend.src.routers.pois.GoogleDirectionsService") as MockSvc:
        MockSvc.return_value.get_routes.return_value = routes

        resp = client.post(
            "/pois/distances",
            json={
                "day_items": [
                    {"type": "poi", "name": "Eiffel Tower", "address": "Paris", "lat": 48.8584, "lng": 2.2945},
                    {"type": "poi", "name": "Louvre", "address": "Paris", "lat": 48.8606, "lng": 2.3376},
                ]
            },
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data[0]["distance_km"] == 1.2
    assert data[0]["encoded_polyline"] == "abc123"


def test_pois_distances_empty_for_single_item(client):
    with patch("backend.src.routers.pois.GoogleDirectionsService") as MockSvc:
        MockSvc.return_value.get_routes.return_value = []

        resp = client.post(
            "/pois/distances",
            json={
                "day_items": [
                    {"type": "poi", "name": "Eiffel Tower", "address": "Paris", "lat": 48.8584, "lng": 2.2945},
                ]
            },
        )

    assert resp.status_code == 200
    assert resp.json() == []


# ---------------------------------------------------------------------------
# POST /itinerary/generate
# ---------------------------------------------------------------------------

def test_itinerary_generate_returns_narratives(client):
    narratives = {"day_1": "Start at the Eiffel Tower.", "day_2": "Explore Montmartre."}

    with patch("backend.src.routers.itinerary.ItineraryAgent") as MockAgent:
        MockAgent.return_value.generate.return_value = narratives

        resp = client.post("/itinerary/generate", json=_base_trip_context())

    assert resp.status_code == 200
    data = resp.json()
    assert data["day_1"] == "Start at the Eiffel Tower."
    assert data["day_2"] == "Explore Montmartre."


# ---------------------------------------------------------------------------
# POST /export/plan
# ---------------------------------------------------------------------------

def _export_request_body() -> dict:
    return {
        "trip_context": _base_trip_context(),
        "itinerary": [
            {
                "day_number": 1,
                "date": "2025-06-01",
                "city": "Paris",
                "narrative": "A wonderful day.",
                "items": [],
            }
        ],
    }


def test_export_plan_json(client):
    exported = {
        "schema_version": "1.0",
        "trip_context": _base_trip_context(),
        "itinerary": [],
        "generated_at": "2025-06-01T00:00:00+00:00",
    }

    with patch("backend.src.routers.export._service") as mock_svc:
        mock_svc.generate_json.return_value = exported

        resp = client.post("/export/plan?format=json", json=_export_request_body())

    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("application/json")
    assert resp.json()["schema_version"] == "1.0"


def test_export_plan_pdf(client):
    pdf_bytes = b"%PDF-1.4 fake pdf content"

    with patch("backend.src.routers.export._service") as mock_svc:
        mock_svc.generate_pdf.return_value = pdf_bytes

        resp = client.post("/export/plan?format=pdf", json=_export_request_body())

    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert resp.content == pdf_bytes


def test_export_plan_invalid_format(client):
    resp = client.post("/export/plan?format=xml", json=_export_request_body())
    assert resp.status_code == 422


def test_pdf_export_returns_bytes(client):
    """PDF export endpoint must return valid PDF bytes without raising."""
    payload = {
        "trip_context": {
            "home_origin": "JFK", "adults": 2, "children": 0, "currency": "USD",
            "legs": [], "unscheduled_pois": [], "saved_pois": []
        },
        "itinerary": [],
        "transport_segments": []
    }
    resp = client.post("/export/plan?format=pdf", json=payload)
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert resp.content[:4] == b"%PDF"


def test_config_anthropic_key_available_without_flight_search(monkeypatch):
    """ANTHROPIC_API_KEY must be populated at startup, not lazily on first AmadeusService init."""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test-key")
    monkeypatch.setenv("AMADEUS_API_KEY", "amadeus-key")
    monkeypatch.setenv("AMADEUS_API_SECRET", "amadeus-secret")
    monkeypatch.setenv("GOOGLE_PLACES_API_KEY", "gplaces-key")
    from backend.src.config import Config
    Config.validate()
    assert Config.ANTHROPIC_API_KEY == "sk-test-key"
    assert Config.ANTHROPIC_API_KEY != ""


def test_poi_suggest_no_duplicate_ids(client, mocker):
    """POI suggestions must not contain duplicate IDs even if Google Places returns same place_id."""
    # Mock the Claude API to return two identical suggestions
    dup_suggestion = {
        "name": "Eiffel Tower",
        "category": "landmark",
        "claude_note": "Iconic tower",
        "claude_best_time": "sunset",
        "claude_booking_tip": "Book online",
    }
    mocker.patch(
        "backend.src.agents.poi_agent.BaseAgent._create_with_retry",
        return_value=mocker.MagicMock(
            content=[mocker.MagicMock(text=json.dumps([dup_suggestion, dup_suggestion]))]
        ),
    )
    # Mock GooglePlacesService to return the same place_id for both queries
    mock_places_service = mocker.MagicMock()
    mock_places_service.async_search_places_cached = mocker.AsyncMock(
        return_value=[
            {
                "place_id": "ChIJW89M-SAME",
                "name": "Eiffel Tower",
                "address": "Champ de Mars, Paris",
                "lat": 48.858,
                "lng": 2.294,
                "rating": 4.9,
            }
        ]
    )
    mocker.patch(
        "backend.src.agents.poi_agent.GooglePlacesService",
        return_value=mock_places_service,
    )
    resp = client.post(
        "/pois/suggest",
        json={
            "trip_context": {
                "home_origin": "JFK",
                "adults": 2,
                "children": 0,
                "currency": "USD",
                "legs": [{
                    "leg_number": 1,
                    "origin": "JFK",
                    "destination": "Paris",
                    "departure_date": "2025-06-01",
                    "selected_flight": None,
                    "hotel_stays": [],
                    "days": [],
                }],
                "unscheduled_pois": [],
                "saved_pois": [],
            },
            "leg_number": 1,
        },
    )
    assert resp.status_code == 200
    ids = [p["id"] for p in resp.json()]
    assert len(ids) == len(set(ids)), f"Duplicate POI ids returned: {ids}"


def test_hotel_search_sends_room_quantity_for_4_adults(mocker):
    """Hotel search with 4 adults must send adults=2 and roomQuantity=2 to Amadeus."""
    from backend.src.services.amadeus_service import AmadeusService
    # Patch the Amadeus client constructor to avoid real credentials
    mocker.patch("backend.src.services.amadeus_service.Client", return_value=mocker.MagicMock())
    mocker.patch("backend.src.config.Config.validate")
    svc = AmadeusService()
    captured_params = {}
    def fake_hotel_offers_search(**kwargs):
        captured_params.update(kwargs)
        raise Exception("stop")
    svc.client.shopping.hotel_offers_search.get.side_effect = fake_hotel_offers_search
    # Also mock the by_city call to return fake hotel ids
    mock_hotel = {"hotelId": "HOTEL1"}
    svc.client.reference_data.locations.hotels.by_city.get.return_value = mocker.MagicMock(data=[mock_hotel])
    try:
        svc.search_hotels("TYO", "2026-06-01", "2026-06-05", 4)
    except Exception:
        pass
    assert captured_params.get("adults") == "2", f"Expected adults=2, got {captured_params.get('adults')}"
    assert captured_params.get("roomQuantity") == "2", f"Expected roomQuantity=2, got {captured_params.get('roomQuantity')}"
