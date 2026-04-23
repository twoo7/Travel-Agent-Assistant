from __future__ import annotations
from typing import Dict, List, Literal, Optional
from pydantic import BaseModel

POICategory = Literal["activity", "restaurant", "sightseeing", "attraction"]


class POI(BaseModel):
    id: str
    name: str
    category: POICategory = "activity"
    address: str
    lat: float
    lng: float
    opening_hours: Optional[str] = None
    booking_required: bool = False
    indoor_outdoor: Optional[Literal["indoor", "outdoor", "both"]] = None
    busy_times: Optional[Dict[str, List[int]]] = None
    typical_visit_duration_mins: Optional[int] = None
    price_level: Optional[int] = None
    rating: Optional[float] = None
    review_count: Optional[int] = None
    photo_url: Optional[str] = None
    nearest_transit: Optional[str] = None
    claude_note: str = ""
    claude_best_time: Optional[str] = None
    claude_booking_tip: Optional[str] = None
    theme_tags: List[str] = []
    neighborhood: Optional[str] = None


class RouteSegment(BaseModel):
    distance_km: Optional[float] = None
    travel_time_mins: Optional[int] = None
    encoded_polyline: Optional[str] = None
    mode: str = "walking"


class POISuggestRequest(BaseModel):
    trip_context: "TripContext"
    leg_number: int
    user_prompt: Optional[str] = None


class DistancesRequest(BaseModel):
    day_items: List["DayItem"]
    mode_per_hop: Optional[List[str]] = None


# POISuggestRequest.model_rebuild() and DistancesRequest.model_rebuild()
# are called from trip.py after TripContext and DayItem are fully built
