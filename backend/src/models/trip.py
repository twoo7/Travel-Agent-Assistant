from __future__ import annotations
from typing import Dict, List, Literal, Optional
from pydantic import BaseModel

TransportMode = Literal["flight", "train", "ferry", "car"]


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
    # Transport-aware fields
    transport_mode: Optional[TransportMode] = None
    spans_days: int = 1  # >1 for overnight ferry/sleeper train


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
from backend.src.models.flight import FlightOffer, FlightSearchRequest  # noqa: E402
from backend.src.models.hotel import HotelOffer, HotelStay, HotelSearchRequest  # noqa: E402
from backend.src.models.poi import POI, POISuggestRequest, DistancesRequest  # noqa: E402

_ns = {
    "FlightOffer": FlightOffer,
    "HotelOffer": HotelOffer,
    "HotelStay": HotelStay,
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
