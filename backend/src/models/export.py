from __future__ import annotations
from typing import List
from pydantic import BaseModel
from backend.src.models.trip import DayItem


class ItineraryDay(BaseModel):
    day_number: int
    date: str
    city: str
    narrative: str
    items: List[DayItem]


class ExportPlan(BaseModel):
    schema_version: str = "1.0"
    trip_context: "TripContext"
    itinerary: List[ItineraryDay]
    generated_at: str


class ExportRequest(BaseModel):
    trip_context: "TripContext"
    itinerary: List[ItineraryDay]


from backend.src.models.trip import TripContext  # noqa: E402
ExportPlan.model_rebuild()
ExportRequest.model_rebuild()
