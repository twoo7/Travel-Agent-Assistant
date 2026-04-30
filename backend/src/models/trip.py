from __future__ import annotations
from typing import Dict, List, Literal, Optional
from pydantic import BaseModel

TransportMode = Literal["flight", "train", "ferry", "car"]

# Routing modes used by Google Directions / DayItem hops
HopMode = Literal["walking", "driving", "transit"]


class DayItem(BaseModel):
    id: Optional[str] = None
    type: Literal["poi", "hotel", "airport"]
    name: str
    address: str
    lat: float
    lng: float
    duration_mins: Optional[int] = None
    notes: Optional[str] = None
    distance_to_next_km: Optional[float] = None
    travel_time_to_next_mins: Optional[int] = None
    route_polyline_to_next: Optional[str] = None
    # Routing mode for the hop to the next item (walking / driving / transit)
    transport_mode: Optional[HopMode] = None
    photo_url: Optional[str] = None
    photo_urls: Optional[List[str]] = None
    spans_days: int = 1  # >1 for overnight ferry/sleeper train
    # POI detail fields preserved when a POI is added to the itinerary
    rating: Optional[float] = None
    review_count: Optional[int] = None
    price_level: Optional[int] = None
    opening_hours: Optional[str] = None
    indoor_outdoor: Optional[Literal["indoor", "outdoor", "both"]] = None
    nearest_transit: Optional[str] = None
    neighborhood: Optional[str] = None
    booking_required: Optional[bool] = None
    theme_tags: Optional[List[str]] = None
    claude_best_time: Optional[str] = None
    claude_booking_tip: Optional[str] = None
    ai_reason: Optional[str] = None
    busy_times: Optional[Dict[str, List[int]]] = None


class DayPlan(BaseModel):
    day_number: int
    date: str
    leg_number: int
    city: str
    items: List[DayItem] = []


class TripLeg(BaseModel):
    leg_number: int
    origin: str
    destination: str
    departure_date: str
    transport_mode: TransportMode = "flight"
    selected_flight: Optional["FlightOffer"] = None
    flight_booking: Optional["FlightBooking"] = None
    hotel_stays: List["HotelStay"] = []
    days: List[DayPlan] = []
    flight_results: list = []
    hotel_results: list = []


class TripContext(BaseModel):
    home_origin: str
    adults: int
    children: int = 0
    currency: str = "USD"
    legs: List[TripLeg] = []
    unscheduled_pois: List["POI"] = []
    saved_pois: List["POI"] = []


# Resolve forward references after all models are imported
from backend.src.models.flight import FlightOffer, FlightBooking, FlightSearchRequest  # noqa: E402
from backend.src.models.hotel import HotelOffer, HotelStay, HotelBooking, HotelSearchRequest  # noqa: E402
from backend.src.models.poi import POI, POISuggestRequest, DistancesRequest  # noqa: E402

_ns = {
    "FlightOffer": FlightOffer,
    "FlightBooking": FlightBooking,
    "HotelOffer": HotelOffer,
    "HotelStay": HotelStay,
    "HotelBooking": HotelBooking,
    "POI": POI,
    "TripContext": TripContext,
    "DayItem": DayItem,
}

TripLeg.model_rebuild(_types_namespace=_ns)
TripContext.model_rebuild(_types_namespace=_ns)

# Now rebuild cross-module models that reference TripContext or DayItem
FlightSearchRequest.model_rebuild(_types_namespace=_ns)
HotelSearchRequest.model_rebuild(_types_namespace=_ns)
POISuggestRequest.model_rebuild(_types_namespace=_ns)
DistancesRequest.model_rebuild(_types_namespace=_ns)
