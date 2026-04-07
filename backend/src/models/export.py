from __future__ import annotations
from typing import List, Optional
from pydantic import BaseModel
from backend.src.models.trip import DayItem


class TransportSegment(BaseModel):
    """One leg's transport details for the export manifest."""
    leg_number: int
    mode: str  # "flight" | "train" | "ferry" | "car"
    origin: str
    destination: str
    departure_date: str
    operator: Optional[str] = None
    duration_mins: Optional[int] = None
    booking_link: Optional[str] = None  # Trainline / ferry operator URL
    booking_ref: Optional[str] = None   # Amadeus booking ref (flights)
    notes: Optional[str] = None


class ItineraryDay(BaseModel):
    day_number: int
    date: str
    city: str
    narrative: str
    items: List[DayItem]


class ExportPlan(BaseModel):
    schema_version: str = "1.1"
    trip_context: "TripContext"
    itinerary: List[ItineraryDay]
    transport_segments: List[TransportSegment] = []
    generated_at: str


class ExportRequest(BaseModel):
    trip_context: "TripContext"
    itinerary: List[ItineraryDay]
    transport_segments: List[TransportSegment] = []


from backend.src.models.trip import TripContext  # noqa: E402
_ns = {"TripContext": TripContext, "DayItem": DayItem}
ExportPlan.model_rebuild(_types_namespace=_ns)
ExportRequest.model_rebuild(_types_namespace=_ns)
