from __future__ import annotations
from typing import List, Optional
from pydantic import BaseModel


class HotelOffer(BaseModel):
    id: str
    name: str
    address: str
    lat: float
    lng: float
    price_per_night: float
    currency: str
    rating: Optional[float] = None
    ai_recommended: bool = False
    ai_reason: Optional[str] = None
    ai_reason_bullets: List[str] = []


class HotelBooking(BaseModel):
    confirmation_ref: Optional[str] = None
    booking_url: Optional[str] = None
    manual_override: Optional[dict] = None


class HotelStay(BaseModel):
    hotel: HotelOffer
    check_in: str
    check_out: str
    accommodation_type: str = "hotel"  # "hotel" | "ferry_cabin" | "sleeper_train"
    booking: Optional[HotelBooking] = None


class HotelSearchRequest(BaseModel):
    trip_context: "TripContext"
    leg_number: int
    city_code: str
    check_in: str
    check_out: str
    adults: int
    currency: str = "USD"


# HotelSearchRequest.model_rebuild() is called from trip.py after TripContext is fully built
