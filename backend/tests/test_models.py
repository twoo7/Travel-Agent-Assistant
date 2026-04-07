import pytest
from backend.src.models.trip import TripContext, TripLeg, DayPlan, DayItem
from backend.src.models.flight import FlightOffer, FlightSegment, FlightSearchRequest
from backend.src.models.hotel import HotelOffer, HotelStay, HotelSearchRequest
from backend.src.models.poi import POI, POISuggestRequest, DistancesRequest
from backend.src.models.export import ExportPlan, ItineraryDay


def test_trip_context_defaults():
    ctx = TripContext(home_origin="JFK", adults=2, legs=[])
    assert ctx.children == 0
    assert ctx.unscheduled_pois == []
    assert ctx.saved_pois == []


def test_day_item_type_validation():
    with pytest.raises(Exception):
        DayItem(type="invalid", name="X", address="Y", lat=0.0, lng=0.0)


def test_flight_offer_defaults():
    seg = FlightSegment(
        departure_airport="JFK",
        arrival_airport="NRT",
        departure_time="2026-06-10T10:00:00",
        arrival_time="2026-06-11T14:00:00",
        duration="PT14H",
        carrier_code="JL",
        flight_number="JL006",
    )
    offer = FlightOffer(
        id="offer_1",
        price=850.0,
        currency="USD",
        segments=[seg],
        total_duration="PT14H",
        stops=0,
    )
    assert offer.ai_recommended is False
    assert offer.ai_reason is None


def test_poi_model_full():
    poi = POI(
        id="place_abc",
        name="Eiffel Tower",
        category="Landmark",
        address="Champ de Mars, Paris",
        lat=48.8584,
        lng=2.2945,
        claude_note="Iconic iron lattice tower with panoramic city views",
    )
    assert poi.booking_required is False
    assert poi.busy_times is None


def test_export_plan_schema_version():
    plan = ExportPlan(
        trip_context=TripContext(home_origin="JFK", adults=2, legs=[]),
        itinerary=[],
        generated_at="2026-06-01T12:00:00",
    )
    assert plan.schema_version == "1.1"
