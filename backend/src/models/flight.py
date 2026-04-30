from __future__ import annotations
from typing import List, Optional
from pydantic import BaseModel


class FlightSegment(BaseModel):
    departure_airport: str
    arrival_airport: str
    departure_time: str
    arrival_time: str
    duration: str
    carrier_code: str
    flight_number: str


class FlightBooking(BaseModel):
    confirmation_ref: Optional[str] = None
    booking_url: Optional[str] = None
    manual_override: Optional[dict] = None


class FlightOffer(BaseModel):
    id: str
    price: float
    currency: str
    segments: List[FlightSegment]
    total_duration: str
    stops: int
    ai_recommended: bool = False
    ai_reason: Optional[str] = None
    ai_reason_bullets: List[str] = []


class FlightSearchRequest(BaseModel):
    trip_context: "TripContext"
    leg_number: int
    origin: str
    destination: str
    departure_date: str
    adults: int
    max_results: int = 10
    currency: str = "USD"


# FlightSearchRequest.model_rebuild() is called from trip.py after TripContext is fully built
