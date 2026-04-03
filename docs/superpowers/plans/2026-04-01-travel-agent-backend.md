# Travel Agent Assistant — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a stateless FastAPI backend with Pydantic data models, Amadeus/Google/Anthropic service wrappers, four Claude agents, and six REST endpoints powering the travel planning funnel.

**Architecture:** Six POST endpoints each accept a full `TripContext` payload alongside request-specific params. Services wrap external APIs; agents call Claude with structured prompts and return typed responses. No session state — every call is self-contained.

**Tech Stack:** Python 3.11 · FastAPI · Pydantic v2 · anthropic SDK · amadeus SDK · httpx · WeasyPrint · pytest

**Companion plan:** `2026-04-01-travel-agent-frontend.md` — run after this plan's Task 9 passes.

---

## File Map

| File | Responsibility |
|------|---------------|
| `backend/requirements.txt` | All Python dependencies |
| `backend/.gitignore` | Exclude venv, .env, pycache |
| `backend/main.py` | FastAPI app, router registration, CORS |
| `backend/src/config.py` | Load + validate env vars |
| `backend/src/models/trip.py` | TripContext, TripLeg, HotelStay, DayPlan, DayItem |
| `backend/src/models/flight.py` | FlightOffer, FlightSegment, FlightSearchRequest |
| `backend/src/models/hotel.py` | HotelOffer, HotelSearchRequest |
| `backend/src/models/poi.py` | POI, POISuggestRequest, DistancesRequest |
| `backend/src/models/export.py` | ExportPlan, ItineraryDay, ExportRequest |
| `backend/src/services/amadeus_service.py` | search_flights(), search_hotels() |
| `backend/src/services/google_places_service.py` | search_places(), get_place_details() |
| `backend/src/services/google_directions_service.py` | get_routes() |
| `backend/src/services/export_service.py` | generate_pdf(), generate_json() |
| `backend/src/agents/flight_agent.py` | rank_and_recommend() for flights |
| `backend/src/agents/hotel_agent.py` | rank_and_recommend() for hotels |
| `backend/src/agents/poi_agent.py` | suggest_pois() |
| `backend/src/agents/itinerary_agent.py` | generate_narrative() |
| `backend/src/routers/flights.py` | POST /flights/search |
| `backend/src/routers/hotels.py` | POST /hotels/search |
| `backend/src/routers/pois.py` | POST /pois/suggest, POST /pois/distances |
| `backend/src/routers/itinerary.py` | POST /itinerary/generate |
| `backend/src/routers/export.py` | POST /export/plan |
| `backend/tests/test_models.py` | Model validation tests |
| `backend/tests/test_amadeus_service.py` | Amadeus response transformation tests |
| `backend/tests/test_google_services.py` | Places + Directions tests |
| `backend/tests/test_agents.py` | Agent prompt + response parsing tests |
| `backend/tests/test_routers.py` | FastAPI endpoint integration tests |

---

### Task 1: Project Scaffolding

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/.gitignore`
- Create: `backend/src/__init__.py` (and all sub-package `__init__.py` files)

- [ ] **Step 1: Create backend directory structure**

```bash
cd "C:/Users/Timothy/Documents/GitHub/travel-agent-claude"
mkdir -p backend/src/models backend/src/services backend/src/agents backend/src/routers backend/src/utils backend/tests
touch backend/src/__init__.py
touch backend/src/models/__init__.py
touch backend/src/services/__init__.py
touch backend/src/agents/__init__.py
touch backend/src/routers/__init__.py
touch backend/src/utils/__init__.py
touch backend/tests/__init__.py
```

- [ ] **Step 2: Create `backend/requirements.txt`**

```
anthropic>=0.40.0
amadeus>=9.0.0
httpx>=0.27.0
python-dotenv>=1.0.0
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
pydantic>=2.9.0
weasyprint>=62.0
pytest>=8.0.0
pytest-asyncio>=0.24.0
httpx>=0.27.0
```

- [ ] **Step 3: Create `backend/.gitignore`**

```
venv/
.env
__pycache__/
*.pyc
.DS_Store
*.pdf
.pytest_cache/
```

- [ ] **Step 4: Create virtual environment and install dependencies**

```bash
cd backend
python -m venv venv
# Windows activation:
venv/Scripts/activate
pip install -r requirements.txt
```

Expected: all packages install without error.

- [ ] **Step 5: Verify imports work**

```bash
python -c "import fastapi; import anthropic; import amadeus; import pydantic; print('OK')"
```

Expected output: `OK`

- [ ] **Step 6: Commit**

```bash
git init
git add backend/requirements.txt backend/.gitignore backend/src/ backend/tests/
git commit -m "feat: backend project scaffolding"
```

---

### Task 2: Configuration

**Files:**
- Create: `backend/src/config.py`
- Create: `backend/tests/test_config.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_config.py`:

```python
import os
import pytest


def test_config_raises_when_missing_keys(monkeypatch):
    monkeypatch.delenv("AMADEUS_API_KEY", raising=False)
    monkeypatch.delenv("AMADEUS_API_SECRET", raising=False)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("GOOGLE_PLACES_API_KEY", raising=False)

    # Re-import to re-run load_dotenv with patched env
    import importlib
    import backend.src.config as cfg
    importlib.reload(cfg)

    with pytest.raises(ValueError, match="AMADEUS_API_KEY"):
        cfg.Config.validate()


def test_config_passes_when_all_keys_present(monkeypatch):
    monkeypatch.setenv("AMADEUS_API_KEY", "test_key")
    monkeypatch.setenv("AMADEUS_API_SECRET", "test_secret")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test_anthropic")
    monkeypatch.setenv("GOOGLE_PLACES_API_KEY", "test_google")

    import importlib
    import backend.src.config as cfg
    importlib.reload(cfg)

    cfg.Config.validate()  # should not raise
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd backend
pytest tests/test_config.py -v
```

Expected: `ImportError` or `ModuleNotFoundError` — config module doesn't exist yet.

- [ ] **Step 3: Create `backend/src/config.py`**

```python
from dotenv import load_dotenv
import os

load_dotenv()


class Config:
    AMADEUS_API_KEY: str = os.getenv("AMADEUS_API_KEY", "")
    AMADEUS_API_SECRET: str = os.getenv("AMADEUS_API_SECRET", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    GOOGLE_PLACES_API_KEY: str = os.getenv("GOOGLE_PLACES_API_KEY", "")
    GOOGLE_MAPS_API_KEY: str = os.getenv("GOOGLE_MAPS_API_KEY", "")

    @classmethod
    def validate(cls) -> None:
        required = [
            "AMADEUS_API_KEY",
            "AMADEUS_API_SECRET",
            "ANTHROPIC_API_KEY",
            "GOOGLE_PLACES_API_KEY",
        ]
        missing = [k for k in required if not getattr(cls, k)]
        if missing:
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_config.py -v
```

Expected: 2 passed.

- [ ] **Step 5: Add `GOOGLE_PLACES_API_KEY` to `.env`**

Open `backend/.env` and add:
```
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

(Keep existing AMADEUS and ANTHROPIC keys.)

- [ ] **Step 6: Commit**

```bash
git add backend/src/config.py backend/tests/test_config.py backend/.env
git commit -m "feat: config module with env var validation"
```

---

### Task 3: Pydantic Data Models

**Files:**
- Create: `backend/src/models/trip.py`
- Create: `backend/src/models/flight.py`
- Create: `backend/src/models/hotel.py`
- Create: `backend/src/models/poi.py`
- Create: `backend/src/models/export.py`
- Create: `backend/tests/test_models.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_models.py`:

```python
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
    assert plan.schema_version == "1.0"
```

- [ ] **Step 2: Run to verify they fail**

```bash
pytest tests/test_models.py -v
```

Expected: `ModuleNotFoundError`.

- [ ] **Step 3: Create `backend/src/models/trip.py`**

```python
from __future__ import annotations
from typing import Dict, List, Literal, Optional
from pydantic import BaseModel


class DayItem(BaseModel):
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


class DayPlan(BaseModel):
    day_number: int
    date: str
    leg_number: int
    city: str
    items: List[DayItem] = []


class HotelStay(BaseModel):
    hotel: "HotelOffer"
    check_in: str
    check_out: str


class TripLeg(BaseModel):
    leg_number: int
    origin: str
    destination: str
    departure_date: str
    selected_flight: Optional["FlightOffer"] = None
    hotel_stays: List[HotelStay] = []
    days: List[DayPlan] = []


class TripContext(BaseModel):
    home_origin: str
    adults: int
    children: int = 0
    legs: List[TripLeg] = []
    unscheduled_pois: List["POI"] = []
    saved_pois: List["POI"] = []


# Resolve forward references after all models are imported
from backend.src.models.flight import FlightOffer  # noqa: E402
from backend.src.models.hotel import HotelOffer  # noqa: E402
from backend.src.models.poi import POI  # noqa: E402

TripLeg.model_rebuild()
HotelStay.model_rebuild()
TripContext.model_rebuild()
```

- [ ] **Step 4: Create `backend/src/models/flight.py`**

```python
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


class FlightOffer(BaseModel):
    id: str
    price: float
    currency: str
    segments: List[FlightSegment]
    total_duration: str
    stops: int
    ai_recommended: bool = False
    ai_reason: Optional[str] = None


class FlightSearchRequest(BaseModel):
    trip_context: "TripContext"
    leg_number: int
    origin: str
    destination: str
    departure_date: str
    adults: int
    max_results: int = 10


from backend.src.models.trip import TripContext  # noqa: E402
FlightSearchRequest.model_rebuild()
```

- [ ] **Step 5: Create `backend/src/models/hotel.py`**

```python
from typing import Optional
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


class HotelSearchRequest(BaseModel):
    trip_context: "TripContext"
    leg_number: int
    city_code: str
    check_in: str
    check_out: str
    adults: int


from backend.src.models.trip import TripContext  # noqa: E402
HotelSearchRequest.model_rebuild()
```

- [ ] **Step 6: Create `backend/src/models/poi.py`**

```python
from typing import Dict, List, Literal, Optional
from pydantic import BaseModel


class POI(BaseModel):
    id: str
    name: str
    category: str
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
    claude_note: str
    claude_best_time: Optional[str] = None
    claude_booking_tip: Optional[str] = None


class POISuggestRequest(BaseModel):
    trip_context: "TripContext"
    leg_number: int


class DistancesRequest(BaseModel):
    day_items: List["DayItem"]


from backend.src.models.trip import TripContext, DayItem  # noqa: E402
POISuggestRequest.model_rebuild()
DistancesRequest.model_rebuild()
```

- [ ] **Step 7: Create `backend/src/models/export.py`**

```python
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
```

- [ ] **Step 8: Run tests to verify they pass**

```bash
pytest tests/test_models.py -v
```

Expected: 5 passed.

- [ ] **Step 9: Commit**

```bash
git add backend/src/models/ backend/tests/test_models.py
git commit -m "feat: Pydantic data models for trip, flights, hotels, POIs, export"
```

---

### Task 4: Amadeus Service

**Files:**
- Create: `backend/src/services/amadeus_service.py`
- Create: `backend/tests/test_amadeus_service.py`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_amadeus_service.py`:

```python
from unittest.mock import MagicMock, patch
from backend.src.services.amadeus_service import AmadeusService
from backend.src.models.flight import FlightOffer
from backend.src.models.hotel import HotelOffer


MOCK_FLIGHT_RESPONSE = {
    "data": [
        {
            "id": "offer_1",
            "price": {"grandTotal": "850.00", "currency": "USD"},
            "itineraries": [
                {
                    "duration": "PT14H",
                    "segments": [
                        {
                            "departure": {"iataCode": "JFK", "at": "2026-06-10T10:00:00"},
                            "arrival": {"iataCode": "NRT", "at": "2026-06-11T14:00:00"},
                            "duration": "PT14H",
                            "carrierCode": "JL",
                            "number": "006",
                            "numberOfStops": 0,
                        }
                    ],
                }
            ],
        }
    ]
}

MOCK_HOTEL_RESPONSE = {
    "data": [
        {
            "hotel": {
                "hotelId": "hotel_1",
                "name": "Tokyo Grand Hotel",
                "address": {"lines": ["1-1 Chiyoda"], "cityName": "Tokyo"},
                "latitude": 35.6762,
                "longitude": 139.6503,
                "rating": "4",
            },
            "offers": [{"price": {"total": "180.00", "currency": "USD"}}],
        }
    ]
}


def test_search_flights_returns_flight_offers():
    with patch("backend.src.services.amadeus_service.Client") as MockClient:
        mock_client = MagicMock()
        MockClient.return_value = mock_client
        mock_client.shopping.flight_offers_search.get.return_value.data = MOCK_FLIGHT_RESPONSE["data"]

        service = AmadeusService()
        offers = service.search_flights(
            origin="JFK", destination="NRT",
            departure_date="2026-06-10", adults=2, max_results=10
        )

    assert len(offers) == 1
    assert isinstance(offers[0], FlightOffer)
    assert offers[0].price == 850.0
    assert offers[0].stops == 0
    assert offers[0].segments[0].carrier_code == "JL"


def test_search_hotels_returns_hotel_offers():
    with patch("backend.src.services.amadeus_service.Client") as MockClient:
        mock_client = MagicMock()
        MockClient.return_value = mock_client
        mock_client.shopping.hotel_offers_search.get.return_value.data = MOCK_HOTEL_RESPONSE["data"]

        service = AmadeusService()
        offers = service.search_hotels(
            city_code="TYO", check_in="2026-06-10",
            check_out="2026-06-14", adults=2
        )

    assert len(offers) == 1
    assert isinstance(offers[0], HotelOffer)
    assert offers[0].name == "Tokyo Grand Hotel"
    assert offers[0].price_per_night == 180.0
```

- [ ] **Step 2: Run to verify they fail**

```bash
pytest tests/test_amadeus_service.py -v
```

Expected: `ModuleNotFoundError`.

- [ ] **Step 3: Create `backend/src/services/amadeus_service.py`**

```python
import logging
from typing import List
from amadeus import Client, ResponseError
from backend.src.config import Config
from backend.src.models.flight import FlightOffer, FlightSegment
from backend.src.models.hotel import HotelOffer

logger = logging.getLogger(__name__)


class AmadeusService:
    def __init__(self) -> None:
        Config.validate()
        self.client = Client(
            client_id=Config.AMADEUS_API_KEY,
            client_secret=Config.AMADEUS_API_SECRET,
        )

    def search_flights(
        self,
        origin: str,
        destination: str,
        departure_date: str,
        adults: int,
        max_results: int = 10,
        return_date: str | None = None,
    ) -> List[FlightOffer]:
        try:
            params: dict = {
                "originLocationCode": origin,
                "destinationLocationCode": destination,
                "departureDate": departure_date,
                "adults": adults,
                "max": max_results,
            }
            if return_date:
                params["returnDate"] = return_date

            response = self.client.shopping.flight_offers_search.get(**params)
            offers: List[FlightOffer] = []
            for raw in response.data:
                itinerary = raw["itineraries"][0]
                segments = [
                    FlightSegment(
                        departure_airport=seg["departure"]["iataCode"],
                        arrival_airport=seg["arrival"]["iataCode"],
                        departure_time=seg["departure"]["at"],
                        arrival_time=seg["arrival"]["at"],
                        duration=seg["duration"],
                        carrier_code=seg["carrierCode"],
                        flight_number=seg["number"],
                    )
                    for seg in itinerary["segments"]
                ]
                offers.append(
                    FlightOffer(
                        id=raw["id"],
                        price=float(raw["price"]["grandTotal"]),
                        currency=raw["price"]["currency"],
                        segments=segments,
                        total_duration=itinerary["duration"],
                        stops=sum(seg.get("numberOfStops", 0) for seg in itinerary["segments"]),
                    )
                )
            logger.info("Found %d flight offers for %s→%s", len(offers), origin, destination)
            return offers
        except ResponseError as e:
            logger.error("Amadeus flight search error: %s", e)
            raise

    def search_hotels(
        self,
        city_code: str,
        check_in: str,
        check_out: str,
        adults: int,
    ) -> List[HotelOffer]:
        try:
            response = self.client.shopping.hotel_offers_search.get(
                cityCode=city_code,
                checkInDate=check_in,
                checkOutDate=check_out,
                adults=adults,
            )
            offers: List[HotelOffer] = []
            for raw in response.data:
                hotel = raw["hotel"]
                price = float(raw["offers"][0]["price"]["total"])
                currency = raw["offers"][0]["price"]["currency"]
                address_lines = hotel.get("address", {}).get("lines", [])
                offers.append(
                    HotelOffer(
                        id=hotel["hotelId"],
                        name=hotel["name"],
                        address=", ".join(address_lines),
                        lat=hotel.get("latitude", 0.0),
                        lng=hotel.get("longitude", 0.0),
                        price_per_night=price,
                        currency=currency,
                        rating=float(hotel["rating"]) if hotel.get("rating") else None,
                    )
                )
            logger.info("Found %d hotel offers for %s", len(offers), city_code)
            return offers
        except ResponseError as e:
            logger.error("Amadeus hotel search error: %s", e)
            raise
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_amadeus_service.py -v
```

Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/amadeus_service.py backend/tests/test_amadeus_service.py
git commit -m "feat: AmadeusService with flight and hotel search"
```

---

### Task 5: Google Places Service & Google Directions Service

**Files:**
- Create: `backend/src/services/google_places_service.py`
- Create: `backend/src/services/google_directions_service.py`
- Create: `backend/tests/test_google_services.py`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_google_services.py`:

```python
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from backend.src.services.google_places_service import GooglePlacesService
from backend.src.services.google_directions_service import GoogleDirectionsService
from backend.src.models.poi import POI
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


def test_places_service_returns_poi(respx_mock):
    import respx, httpx

    respx.post("https://places.googleapis.com/v1/places:searchText").mock(
        return_value=httpx.Response(200, json=MOCK_PLACES_SEARCH)
    )

    service = GooglePlacesService(api_key="test_key")
    results = service.search_places("Senso-ji Temple", location_bias="Tokyo")

    assert len(results) == 1
    assert results[0]["name"] == "Senso-ji Temple"
    assert results[0]["place_id"] == "ChIJN1t_tDeuEmsRUsoyG83frY4"


def test_directions_service_returns_routes():
    import httpx
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
    assert routes[0]["distance_km"] == pytest.approx(1.4, 0.01)
    assert routes[0]["travel_time_mins"] == 18
    assert routes[0]["encoded_polyline"] == "abc123encodedpolyline"
```

- [ ] **Step 2: Install respx for mocking httpx**

```bash
pip install respx
echo "respx>=0.21.0" >> requirements.txt
```

- [ ] **Step 3: Run to verify they fail**

```bash
pytest tests/test_google_services.py -v
```

Expected: `ModuleNotFoundError`.

- [ ] **Step 4: Create `backend/src/services/google_places_service.py`**

```python
import logging
from typing import Any, Dict, List, Optional
import httpx
from backend.src.config import Config

logger = logging.getLogger(__name__)

PLACES_BASE = "https://places.googleapis.com/v1"
FIELD_MASK = (
    "places.id,places.displayName,places.formattedAddress,places.location,"
    "places.rating,places.userRatingCount,places.priceLevel,"
    "places.currentOpeningHours,places.regularOpeningHours,"
    "places.photos,places.websiteUri,places.accessibilityOptions"
)


class GooglePlacesService:
    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or Config.GOOGLE_PLACES_API_KEY

    def search_places(
        self, query: str, location_bias: str = "", max_results: int = 10
    ) -> List[Dict[str, Any]]:
        payload: Dict[str, Any] = {
            "textQuery": query,
            "maxResultCount": max_results,
        }
        if location_bias:
            payload["locationBias"] = {"circle": {"center": {"latitude": 0, "longitude": 0}, "radius": 50000.0}}

        resp = httpx.post(
            f"{PLACES_BASE}/places:searchText",
            json=payload,
            headers={
                "X-Goog-Api-Key": self.api_key,
                "X-Goog-FieldMask": FIELD_MASK,
            },
            timeout=10.0,
        )
        resp.raise_for_status()
        data = resp.json()

        results = []
        for place in data.get("places", []):
            results.append({
                "place_id": place["id"],
                "name": place["displayName"]["text"],
                "address": place.get("formattedAddress", ""),
                "lat": place["location"]["latitude"],
                "lng": place["location"]["longitude"],
                "rating": place.get("rating"),
                "review_count": place.get("userRatingCount"),
                "price_level": _parse_price_level(place.get("priceLevel")),
                "opening_hours": _parse_opening_hours(place.get("currentOpeningHours")),
                "photo_url": _parse_photo_url(place.get("photos", []), self.api_key),
            })
        return results

    def get_place_details(self, place_id: str) -> Dict[str, Any]:
        resp = httpx.get(
            f"{PLACES_BASE}/places/{place_id}",
            headers={
                "X-Goog-Api-Key": self.api_key,
                "X-Goog-FieldMask": FIELD_MASK,
            },
            timeout=10.0,
        )
        resp.raise_for_status()
        return resp.json()


def _parse_price_level(level: Optional[str]) -> Optional[int]:
    mapping = {
        "PRICE_LEVEL_FREE": 0,
        "PRICE_LEVEL_INEXPENSIVE": 1,
        "PRICE_LEVEL_MODERATE": 2,
        "PRICE_LEVEL_EXPENSIVE": 3,
        "PRICE_LEVEL_VERY_EXPENSIVE": 4,
    }
    return mapping.get(level) if level else None


def _parse_opening_hours(hours_data: Optional[Dict]) -> Optional[str]:
    if not hours_data:
        return None
    descriptions = hours_data.get("weekdayDescriptions", [])
    return "; ".join(descriptions) if descriptions else None


def _parse_photo_url(photos: List[Dict], api_key: str) -> Optional[str]:
    if not photos:
        return None
    name = photos[0].get("name", "")
    return f"https://places.googleapis.com/v1/{name}/media?maxHeightPx=400&key={api_key}"
```

- [ ] **Step 5: Create `backend/src/services/google_directions_service.py`**

```python
import logging
import math
from typing import Any, Dict, List
import httpx
from backend.src.config import Config
from backend.src.models.trip import DayItem

logger = logging.getLogger(__name__)

DIRECTIONS_BASE = "https://maps.googleapis.com/maps/api/directions/json"


class GoogleDirectionsService:
    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or Config.GOOGLE_MAPS_API_KEY

    def get_routes(self, items: List[DayItem]) -> List[Dict[str, Any]]:
        """
        Returns one route dict per consecutive pair in items.
        Each dict has: distance_km, travel_time_mins, encoded_polyline.
        Returns empty list if fewer than 2 items.
        """
        if len(items) < 2:
            return []

        routes = []
        for i in range(len(items) - 1):
            origin = f"{items[i].lat},{items[i].lng}"
            destination = f"{items[i + 1].lat},{items[i + 1].lng}"

            resp = httpx.get(
                DIRECTIONS_BASE,
                params={
                    "origin": origin,
                    "destination": destination,
                    "mode": "walking",
                    "key": self.api_key,
                },
                timeout=10.0,
            )
            resp.raise_for_status()
            data = resp.json()

            if data.get("status") != "OK" or not data.get("routes"):
                routes.append({
                    "distance_km": None,
                    "travel_time_mins": None,
                    "encoded_polyline": None,
                })
                continue

            leg = data["routes"][0]["legs"][0]
            routes.append({
                "distance_km": round(leg["distance"]["value"] / 1000, 2),
                "travel_time_mins": math.ceil(leg["duration"]["value"] / 60),
                "encoded_polyline": data["routes"][0]["overviewPolyline"]["points"],
            })

        return routes
```

- [ ] **Step 6: Run tests**

```bash
pytest tests/test_google_services.py -v
```

Expected: 2 passed.

- [ ] **Step 7: Commit**

```bash
git add backend/src/services/google_places_service.py backend/src/services/google_directions_service.py backend/tests/test_google_services.py
git commit -m "feat: GooglePlacesService and GoogleDirectionsService"
```

---

### Task 6: Export Service

**Files:**
- Create: `backend/src/services/export_service.py`
- Create: `backend/tests/test_export_service.py`

- [ ] **Step 1: Write failing test**

Create `backend/tests/test_export_service.py`:

```python
import json
from backend.src.services.export_service import ExportService
from backend.src.models.export import ExportPlan, ExportRequest, ItineraryDay
from backend.src.models.trip import TripContext


def _make_request() -> ExportRequest:
    ctx = TripContext(home_origin="JFK", adults=2, legs=[])
    day = ItineraryDay(
        day_number=1,
        date="2026-06-10",
        city="Tokyo",
        narrative="A wonderful first day in Tokyo.",
        items=[],
    )
    return ExportRequest(trip_context=ctx, itinerary=[day])


def test_generate_json_is_valid():
    service = ExportService()
    req = _make_request()
    result = service.generate_json(req)
    parsed = json.loads(result)
    assert parsed["schema_version"] == "1.0"
    assert parsed["trip_context"]["home_origin"] == "JFK"
    assert len(parsed["itinerary"]) == 1


def test_generate_pdf_returns_bytes():
    service = ExportService()
    req = _make_request()
    pdf_bytes = service.generate_pdf(req)
    assert isinstance(pdf_bytes, bytes)
    assert pdf_bytes[:4] == b"%PDF"
```

- [ ] **Step 2: Run to verify they fail**

```bash
pytest tests/test_export_service.py -v
```

Expected: `ModuleNotFoundError`.

- [ ] **Step 3: Create `backend/src/services/export_service.py`**

```python
import json
from datetime import datetime
from weasyprint import HTML
from backend.src.models.export import ExportPlan, ExportRequest, ItineraryDay


class ExportService:
    def generate_json(self, request: ExportRequest) -> str:
        plan = ExportPlan(
            trip_context=request.trip_context,
            itinerary=request.itinerary,
            generated_at=datetime.utcnow().isoformat(),
        )
        return plan.model_dump_json(indent=2)

    def generate_pdf(self, request: ExportRequest) -> bytes:
        html = _build_html(request)
        return HTML(string=html).write_pdf()


def _build_html(request: ExportRequest) -> str:
    ctx = request.trip_context
    legs_summary = ""
    for leg in ctx.legs:
        flight_info = ""
        if leg.selected_flight:
            f = leg.selected_flight
            seg = f.segments[0]
            flight_info = f"<p>✈ {seg.departure_airport} → {seg.arrival_airport} · {f.price} {f.currency}</p>"
        stays = "".join(
            f"<p>🏨 {s.hotel.name} ({s.check_in} – {s.check_out})</p>"
            for s in leg.hotel_stays
        )
        legs_summary += f"<div class='leg'><h3>Leg {leg.leg_number}: {leg.origin} → {leg.destination}</h3>{flight_info}{stays}</div>"

    days_html = ""
    for day in request.itinerary:
        items_html = "".join(
            f"<li>{item.name} — {item.address}"
            + (f" ({item.duration_mins} min)" if item.duration_mins else "")
            + (f" <span class='distance'>{item.travel_time_to_next_mins} min · {item.distance_to_next_km} km →</span>" if item.distance_to_next_km else "")
            + "</li>"
            for item in day.items
        )
        days_html += f"""
        <div class='day'>
            <h3>Day {day.day_number} — {day.date} · {day.city}</h3>
            <p class='narrative'>{day.narrative}</p>
            <ul>{items_html}</ul>
        </div>"""

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset='utf-8'>
<style>
  body {{ font-family: Georgia, serif; max-width: 800px; margin: 40px auto; color: #333; }}
  h1 {{ color: #1a1a2e; }}
  h2 {{ color: #16213e; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; }}
  h3 {{ color: #0f3460; }}
  .leg {{ background: #f8f9fa; padding: 12px; border-radius: 4px; margin: 8px 0; }}
  .day {{ margin: 24px 0; }}
  .narrative {{ font-style: italic; color: #555; }}
  .distance {{ color: #888; font-size: 0.85em; }}
  ul {{ list-style: none; padding: 0; }}
  li {{ padding: 4px 0; border-bottom: 1px solid #eee; }}
</style>
</head>
<body>
<h1>Trip Plan</h1>
<p>{ctx.adults} adults{f' + {ctx.children} children' if ctx.children else ''} · Departing from {ctx.home_origin}</p>
<h2>Flight & Hotel Summary</h2>
{legs_summary}
<h2>Itinerary</h2>
{days_html}
<p style='color:#aaa;font-size:0.8em;margin-top:40px;'>Generated by Travel Agent Assistant</p>
</body>
</html>"""
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_export_service.py -v
```

Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/export_service.py backend/tests/test_export_service.py
git commit -m "feat: ExportService with PDF and JSON generation"
```

---

### Task 7: Flight Agent & Hotel Agent

**Files:**
- Create: `backend/src/agents/flight_agent.py`
- Create: `backend/src/agents/hotel_agent.py`
- Create: `backend/tests/test_agents.py`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_agents.py`:

```python
from unittest.mock import MagicMock, patch
from backend.src.agents.flight_agent import FlightAgent
from backend.src.agents.hotel_agent import HotelAgent
from backend.src.models.flight import FlightOffer, FlightSegment
from backend.src.models.hotel import HotelOffer
from backend.src.models.trip import TripContext


def _make_flight_offers():
    seg = FlightSegment(
        departure_airport="JFK", arrival_airport="NRT",
        departure_time="2026-06-10T10:00:00",
        arrival_time="2026-06-11T14:00:00",
        duration="PT14H", carrier_code="JL", flight_number="006",
    )
    return [
        FlightOffer(id="f1", price=850.0, currency="USD", segments=[seg], total_duration="PT14H", stops=0),
        FlightOffer(id="f2", price=1200.0, currency="USD", segments=[seg], total_duration="PT18H", stops=1),
    ]


def _make_hotel_offers():
    return [
        HotelOffer(id="h1", name="Budget Inn", address="Tokyo", lat=35.6, lng=139.6, price_per_night=80.0, currency="USD", rating=3.8),
        HotelOffer(id="h2", name="Grand Hotel", address="Tokyo", lat=35.7, lng=139.7, price_per_night=220.0, currency="USD", rating=4.6),
    ]


def test_flight_agent_marks_recommendation():
    mock_response = MagicMock()
    mock_response.content[0].text = '{"recommended_id": "f1", "reason": "Cheapest direct flight"}'

    with patch("backend.src.agents.flight_agent.anthropic.Anthropic") as MockAnthropic:
        mock_client = MagicMock()
        MockAnthropic.return_value = mock_client
        mock_client.messages.create.return_value = mock_response

        ctx = TripContext(home_origin="JFK", adults=2, legs=[])
        agent = FlightAgent()
        offers = agent.rank_and_recommend(_make_flight_offers(), ctx)

    recommended = [o for o in offers if o.ai_recommended]
    assert len(recommended) == 1
    assert recommended[0].id == "f1"
    assert "Cheapest" in recommended[0].ai_reason


def test_hotel_agent_marks_recommendation():
    mock_response = MagicMock()
    mock_response.content[0].text = '{"recommended_id": "h2", "reason": "Best rated, close to city center"}'

    with patch("backend.src.agents.hotel_agent.anthropic.Anthropic") as MockAnthropic:
        mock_client = MagicMock()
        MockAnthropic.return_value = mock_client
        mock_client.messages.create.return_value = mock_response

        ctx = TripContext(home_origin="JFK", adults=2, legs=[])
        agent = HotelAgent()
        offers = agent.rank_and_recommend(_make_hotel_offers(), ctx)

    recommended = [o for o in offers if o.ai_recommended]
    assert len(recommended) == 1
    assert recommended[0].id == "h2"
```

- [ ] **Step 2: Run to verify they fail**

```bash
pytest tests/test_agents.py::test_flight_agent_marks_recommendation tests/test_agents.py::test_hotel_agent_marks_recommendation -v
```

Expected: `ModuleNotFoundError`.

- [ ] **Step 3: Create `backend/src/agents/flight_agent.py`**

```python
import json
import logging
from typing import List
import anthropic
from backend.src.config import Config
from backend.src.models.flight import FlightOffer
from backend.src.models.trip import TripContext

logger = logging.getLogger(__name__)
MODEL = "claude-sonnet-4-6"


class FlightAgent:
    def __init__(self) -> None:
        self.client = anthropic.Anthropic(api_key=Config.ANTHROPIC_API_KEY)

    def rank_and_recommend(
        self, offers: List[FlightOffer], trip_context: TripContext
    ) -> List[FlightOffer]:
        if not offers:
            return offers

        offers_summary = "\n".join(
            f"ID: {o.id} | Price: {o.price} {o.currency} | Stops: {o.stops} | Duration: {o.total_duration}"
            for o in offers
        )
        prompt = f"""You are a travel assistant helping select the best flight.

Trip context: {trip_context.adults} adults, departing from {trip_context.home_origin}.

Flight options:
{offers_summary}

Select the single best option balancing price, stops, and duration.
Respond with ONLY valid JSON in this exact format:
{{"recommended_id": "<id>", "reason": "<one sentence reason>"}}"""

        response = self.client.messages.create(
            model=MODEL,
            max_tokens=256,
            messages=[{"role": "user", "content": prompt}],
        )

        try:
            result = json.loads(response.content[0].text.strip())
            rec_id = result["recommended_id"]
            reason = result["reason"]
        except (json.JSONDecodeError, KeyError) as e:
            logger.warning("FlightAgent failed to parse response: %s", e)
            return offers

        for offer in offers:
            if offer.id == rec_id:
                offer.ai_recommended = True
                offer.ai_reason = reason
        return offers
```

- [ ] **Step 4: Create `backend/src/agents/hotel_agent.py`**

```python
import json
import logging
from typing import List
import anthropic
from backend.src.config import Config
from backend.src.models.hotel import HotelOffer
from backend.src.models.trip import TripContext

logger = logging.getLogger(__name__)
MODEL = "claude-sonnet-4-6"


class HotelAgent:
    def __init__(self) -> None:
        self.client = anthropic.Anthropic(api_key=Config.ANTHROPIC_API_KEY)

    def rank_and_recommend(
        self, offers: List[HotelOffer], trip_context: TripContext
    ) -> List[HotelOffer]:
        if not offers:
            return offers

        offers_summary = "\n".join(
            f"ID: {o.id} | Name: {o.name} | Price/night: {o.price_per_night} {o.currency} | Rating: {o.rating or 'N/A'} | Address: {o.address}"
            for o in offers
        )
        prompt = f"""You are a travel assistant helping select the best hotel.

Trip context: {trip_context.adults} adults, {trip_context.children} children.

Hotel options:
{offers_summary}

Select the single best option balancing price, rating, and location.
Respond with ONLY valid JSON in this exact format:
{{"recommended_id": "<id>", "reason": "<one sentence reason>"}}"""

        response = self.client.messages.create(
            model=MODEL,
            max_tokens=256,
            messages=[{"role": "user", "content": prompt}],
        )

        try:
            result = json.loads(response.content[0].text.strip())
            rec_id = result["recommended_id"]
            reason = result["reason"]
        except (json.JSONDecodeError, KeyError) as e:
            logger.warning("HotelAgent failed to parse response: %s", e)
            return offers

        for offer in offers:
            if offer.id == rec_id:
                offer.ai_recommended = True
                offer.ai_reason = reason
        return offers
```

- [ ] **Step 5: Run tests**

```bash
pytest tests/test_agents.py::test_flight_agent_marks_recommendation tests/test_agents.py::test_hotel_agent_marks_recommendation -v
```

Expected: 2 passed.

- [ ] **Step 6: Commit**

```bash
git add backend/src/agents/flight_agent.py backend/src/agents/hotel_agent.py backend/tests/test_agents.py
git commit -m "feat: FlightAgent and HotelAgent with Claude recommendations"
```

---

### Task 8: POI Agent & Itinerary Agent

**Files:**
- Create: `backend/src/agents/poi_agent.py`
- Create: `backend/src/agents/itinerary_agent.py`
- Modify: `backend/tests/test_agents.py`

- [ ] **Step 1: Write failing tests (append to `test_agents.py`)**

```python
from backend.src.agents.poi_agent import POIAgent
from backend.src.agents.itinerary_agent import ItineraryAgent
from backend.src.models.poi import POI
from backend.src.models.trip import DayPlan, DayItem
from backend.src.models.export import ItineraryDay


def test_poi_agent_returns_poi_list():
    mock_claude_response = MagicMock()
    mock_claude_response.content[0].text = json.dumps([
        {
            "name": "Senso-ji Temple",
            "category": "Landmark",
            "claude_note": "Tokyo's oldest temple in the historic Asakusa district",
            "claude_best_time": "Arrive before 8am to beat the crowds",
            "claude_booking_tip": None,
        }
    ])

    mock_places_results = [{
        "place_id": "place_senso",
        "name": "Senso-ji Temple",
        "address": "2-3-1 Asakusa, Taito City, Tokyo",
        "lat": 35.7147,
        "lng": 139.7966,
        "rating": 4.7,
        "review_count": 45000,
        "price_level": 0,
        "opening_hours": "Monday: Open 24 hours",
        "photo_url": "https://example.com/photo.jpg",
    }]

    with patch("backend.src.agents.poi_agent.anthropic.Anthropic") as MockAnthropic, \
         patch("backend.src.agents.poi_agent.GooglePlacesService") as MockPlaces:

        mock_client = MagicMock()
        MockAnthropic.return_value = mock_client
        mock_client.messages.create.return_value = mock_claude_response

        mock_places = MagicMock()
        MockPlaces.return_value = mock_places
        mock_places.search_places.return_value = mock_places_results

        ctx = TripContext(home_origin="JFK", adults=2, legs=[])
        agent = POIAgent()
        pois = agent.suggest_pois(destination="Tokyo", trip_context=ctx, num_suggestions=1)

    assert len(pois) == 1
    assert isinstance(pois[0], POI)
    assert pois[0].name == "Senso-ji Temple"
    assert pois[0].lat == 35.7147


def test_itinerary_agent_returns_narrative():
    mock_response = MagicMock()
    mock_response.content[0].text = json.dumps([
        {"day_number": 1, "date": "2026-06-10", "city": "Tokyo", "narrative": "Start your Tokyo adventure at Senso-ji."}
    ])

    with patch("backend.src.agents.itinerary_agent.anthropic.Anthropic") as MockAnthropic:
        mock_client = MagicMock()
        MockAnthropic.return_value = mock_client
        mock_client.messages.create.return_value = mock_response

        days = [DayPlan(day_number=1, date="2026-06-10", leg_number=1, city="Tokyo", items=[])]
        ctx = TripContext(home_origin="JFK", adults=2, legs=[])
        agent = ItineraryAgent()
        result = agent.generate_narrative(days, ctx)

    assert len(result) == 1
    assert isinstance(result[0], ItineraryDay)
    assert "Tokyo" in result[0].narrative
```

Also add these imports at the top of `test_agents.py`:
```python
import json
from unittest.mock import MagicMock, patch
```

- [ ] **Step 2: Run to verify they fail**

```bash
pytest tests/test_agents.py::test_poi_agent_returns_poi_list tests/test_agents.py::test_itinerary_agent_returns_narrative -v
```

Expected: `ModuleNotFoundError`.

- [ ] **Step 3: Create `backend/src/agents/poi_agent.py`**

```python
import json
import logging
from typing import List
import anthropic
from backend.src.config import Config
from backend.src.models.poi import POI
from backend.src.models.trip import TripContext
from backend.src.services.google_places_service import GooglePlacesService

logger = logging.getLogger(__name__)
MODEL = "claude-sonnet-4-6"


class POIAgent:
    def __init__(self) -> None:
        self.client = anthropic.Anthropic(api_key=Config.ANTHROPIC_API_KEY)
        self.places = GooglePlacesService()

    def suggest_pois(
        self,
        destination: str,
        trip_context: TripContext,
        num_suggestions: int = 12,
    ) -> List[POI]:
        prompt = f"""You are a knowledgeable travel guide for {destination}.

Trip: {trip_context.adults} adults, {trip_context.children} children.

Suggest {num_suggestions} must-visit points of interest covering a mix of: landmarks, museums, restaurants, parks, and neighborhoods.

For each, provide:
- name: exact name as it appears on Google Maps
- category: one of Landmark | Museum | Restaurant | Park | Neighborhood
- claude_note: one sentence on why it's worth visiting
- claude_best_time: one sentence on the best time to visit (mention busy times if relevant)
- claude_booking_tip: one sentence booking advice, or null if no booking needed

Respond with ONLY a valid JSON array of objects with exactly those 5 keys."""

        response = self.client.messages.create(
            model=MODEL,
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}],
        )

        try:
            suggestions = json.loads(response.content[0].text.strip())
        except json.JSONDecodeError as e:
            logger.error("POIAgent failed to parse Claude response: %s", e)
            return []

        pois: List[POI] = []
        for suggestion in suggestions[:num_suggestions]:
            places_results = self.places.search_places(
                query=f"{suggestion['name']} {destination}",
                location_bias=destination,
                max_results=1,
            )
            if not places_results:
                logger.warning("No Places result for: %s", suggestion["name"])
                continue

            place = places_results[0]
            pois.append(POI(
                id=place["place_id"],
                name=place["name"],
                category=suggestion.get("category", "Landmark"),
                address=place["address"],
                lat=place["lat"],
                lng=place["lng"],
                rating=place.get("rating"),
                review_count=place.get("review_count"),
                price_level=place.get("price_level"),
                opening_hours=place.get("opening_hours"),
                photo_url=place.get("photo_url"),
                claude_note=suggestion.get("claude_note", ""),
                claude_best_time=suggestion.get("claude_best_time"),
                claude_booking_tip=suggestion.get("claude_booking_tip"),
            ))

        logger.info("POIAgent returned %d enriched POIs for %s", len(pois), destination)
        return pois
```

- [ ] **Step 4: Create `backend/src/agents/itinerary_agent.py`**

```python
import json
import logging
from typing import List
import anthropic
from backend.src.config import Config
from backend.src.models.trip import DayPlan
from backend.src.models.trip import TripContext
from backend.src.models.export import ItineraryDay

logger = logging.getLogger(__name__)
MODEL = "claude-sonnet-4-6"


class ItineraryAgent:
    def __init__(self) -> None:
        self.client = anthropic.Anthropic(api_key=Config.ANTHROPIC_API_KEY)

    def generate_narrative(
        self, days: List[DayPlan], trip_context: TripContext
    ) -> List[ItineraryDay]:
        days_summary = "\n".join(
            f"Day {d.day_number} ({d.date}) in {d.city}:\n"
            + "\n".join(
                f"  - {item.name} ({item.type})"
                + (f", {item.travel_time_to_next_mins} min to next" if item.travel_time_to_next_mins else "")
                for item in d.items
            )
            for d in days
        )

        prompt = f"""You are a travel writer crafting a personalised trip narrative.

Trip: {trip_context.adults} adults{', ' + str(trip_context.children) + ' children' if trip_context.children else ''}.

Itinerary:
{days_summary}

For each day, write 2-3 sentences of engaging narrative prose that:
- Captures the feel and highlights of the day
- Notes any travel time between major stops where relevant
- Includes a practical tip or local insight

Respond with ONLY a valid JSON array, one object per day:
[{{"day_number": 1, "date": "YYYY-MM-DD", "city": "CityName", "narrative": "..."}}]"""

        response = self.client.messages.create(
            model=MODEL,
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )

        try:
            raw_days = json.loads(response.content[0].text.strip())
        except json.JSONDecodeError as e:
            logger.error("ItineraryAgent failed to parse response: %s", e)
            return [
                ItineraryDay(
                    day_number=d.day_number,
                    date=d.date,
                    city=d.city,
                    narrative="Itinerary narrative unavailable.",
                    items=d.items,
                )
                for d in days
            ]

        day_map = {d.day_number: d for d in days}
        result: List[ItineraryDay] = []
        for raw in raw_days:
            day = day_map.get(raw["day_number"])
            result.append(ItineraryDay(
                day_number=raw["day_number"],
                date=raw["date"],
                city=raw["city"],
                narrative=raw["narrative"],
                items=day.items if day else [],
            ))
        return result
```

- [ ] **Step 5: Run all agent tests**

```bash
pytest tests/test_agents.py -v
```

Expected: 4 passed.

- [ ] **Step 6: Commit**

```bash
git add backend/src/agents/poi_agent.py backend/src/agents/itinerary_agent.py backend/tests/test_agents.py
git commit -m "feat: POIAgent and ItineraryAgent with Claude narration"
```

---

### Task 9: FastAPI App & Routers

**Files:**
- Create: `backend/src/routers/flights.py`
- Create: `backend/src/routers/hotels.py`
- Create: `backend/src/routers/pois.py`
- Create: `backend/src/routers/itinerary.py`
- Create: `backend/src/routers/export.py`
- Create: `backend/main.py`
- Create: `backend/tests/test_routers.py`

- [ ] **Step 1: Create `backend/src/routers/flights.py`**

```python
from fastapi import APIRouter, HTTPException
from backend.src.models.flight import FlightSearchRequest, FlightOffer
from backend.src.services.amadeus_service import AmadeusService
from backend.src.agents.flight_agent import FlightAgent
from typing import List

router = APIRouter(prefix="/flights", tags=["flights"])


@router.post("/search", response_model=List[FlightOffer])
def search_flights(request: FlightSearchRequest) -> List[FlightOffer]:
    try:
        service = AmadeusService()
        offers = service.search_flights(
            origin=request.origin,
            destination=request.destination,
            departure_date=request.departure_date,
            adults=request.adults,
            max_results=request.max_results,
        )
        agent = FlightAgent()
        return agent.rank_and_recommend(offers, request.trip_context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

- [ ] **Step 2: Create `backend/src/routers/hotels.py`**

```python
from fastapi import APIRouter, HTTPException
from backend.src.models.hotel import HotelSearchRequest, HotelOffer
from backend.src.services.amadeus_service import AmadeusService
from backend.src.agents.hotel_agent import HotelAgent
from typing import List

router = APIRouter(prefix="/hotels", tags=["hotels"])


@router.post("/search", response_model=List[HotelOffer])
def search_hotels(request: HotelSearchRequest) -> List[HotelOffer]:
    try:
        service = AmadeusService()
        offers = service.search_hotels(
            city_code=request.city_code,
            check_in=request.check_in,
            check_out=request.check_out,
            adults=request.adults,
        )
        agent = HotelAgent()
        return agent.rank_and_recommend(offers, request.trip_context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

- [ ] **Step 3: Create `backend/src/routers/pois.py`**

```python
from fastapi import APIRouter, HTTPException
from backend.src.models.poi import POI, POISuggestRequest, DistancesRequest
from backend.src.agents.poi_agent import POIAgent
from backend.src.services.google_directions_service import GoogleDirectionsService
from typing import Any, Dict, List

router = APIRouter(prefix="/pois", tags=["pois"])


@router.post("/suggest", response_model=List[POI])
def suggest_pois(request: POISuggestRequest) -> List[POI]:
    try:
        leg = next(
            (l for l in request.trip_context.legs if l.leg_number == request.leg_number),
            None,
        )
        destination = leg.destination if leg else "unknown"
        agent = POIAgent()
        return agent.suggest_pois(destination, request.trip_context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/distances")
def get_distances(request: DistancesRequest) -> List[Dict[str, Any]]:
    try:
        service = GoogleDirectionsService()
        return service.get_routes(request.day_items)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

- [ ] **Step 4: Create `backend/src/routers/itinerary.py`**

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.src.models.trip import TripContext, DayPlan
from backend.src.models.export import ItineraryDay
from backend.src.agents.itinerary_agent import ItineraryAgent
from typing import List

router = APIRouter(prefix="/itinerary", tags=["itinerary"])


class GenerateRequest(BaseModel):
    trip_context: TripContext
    days: List[DayPlan]


@router.post("/generate", response_model=List[ItineraryDay])
def generate_itinerary(request: GenerateRequest) -> List[ItineraryDay]:
    try:
        agent = ItineraryAgent()
        return agent.generate_narrative(request.days, request.trip_context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

- [ ] **Step 5: Create `backend/src/routers/export.py`**

```python
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response, JSONResponse
from backend.src.models.export import ExportRequest
from backend.src.services.export_service import ExportService

router = APIRouter(prefix="/export", tags=["export"])


@router.post("/plan/pdf")
def export_pdf(request: ExportRequest) -> Response:
    try:
        service = ExportService()
        pdf_bytes = service.generate_pdf(request)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=trip-plan.pdf"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/plan/json")
def export_json(request: ExportRequest) -> JSONResponse:
    try:
        service = ExportService()
        json_str = service.generate_json(request)
        return JSONResponse(content={"data": json_str})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

- [ ] **Step 6: Create `backend/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.src.routers import flights, hotels, pois, itinerary, export

app = FastAPI(title="Travel Agent Assistant API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(flights.router)
app.include_router(hotels.router)
app.include_router(pois.router)
app.include_router(itinerary.router)
app.include_router(export.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
```

- [ ] **Step 7: Write router integration tests**

Create `backend/tests/test_routers.py`:

```python
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from backend.main import app
from backend.src.models.flight import FlightOffer, FlightSegment
from backend.src.models.hotel import HotelOffer

client = TestClient(app)

BASE_CONTEXT = {
    "home_origin": "JFK",
    "adults": 2,
    "children": 0,
    "legs": [],
    "unscheduled_pois": [],
    "saved_pois": [],
}


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_flights_search_endpoint():
    seg = FlightSegment(
        departure_airport="JFK", arrival_airport="NRT",
        departure_time="2026-06-10T10:00:00",
        arrival_time="2026-06-11T14:00:00",
        duration="PT14H", carrier_code="JL", flight_number="006",
    )
    mock_offers = [FlightOffer(id="f1", price=850.0, currency="USD", segments=[seg], total_duration="PT14H", stops=0)]

    with patch("backend.src.routers.flights.AmadeusService") as MockAmadeus, \
         patch("backend.src.routers.flights.FlightAgent") as MockAgent:

        MockAmadeus.return_value.search_flights.return_value = mock_offers
        MockAgent.return_value.rank_and_recommend.return_value = mock_offers

        response = client.post("/flights/search", json={
            "trip_context": BASE_CONTEXT,
            "leg_number": 1,
            "origin": "JFK",
            "destination": "NRT",
            "departure_date": "2026-06-10",
            "adults": 2,
            "max_results": 10,
        })

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == "f1"


def test_pois_distances_endpoint():
    with patch("backend.src.routers.pois.GoogleDirectionsService") as MockDirections:
        MockDirections.return_value.get_routes.return_value = [
            {"distance_km": 1.4, "travel_time_mins": 18, "encoded_polyline": "abc123"}
        ]

        response = client.post("/pois/distances", json={
            "day_items": [
                {"type": "poi", "name": "A", "address": "Addr A", "lat": 35.71, "lng": 139.79},
                {"type": "poi", "name": "B", "address": "Addr B", "lat": 35.72, "lng": 139.80},
            ]
        })

    assert response.status_code == 200
    data = response.json()
    assert data[0]["distance_km"] == 1.4
    assert data[0]["encoded_polyline"] == "abc123"
```

- [ ] **Step 8: Run all tests**

```bash
pytest tests/ -v
```

Expected: all tests pass.

- [ ] **Step 9: Start the server and verify manually**

```bash
uvicorn backend.main:app --reload --port 8000
```

Open http://localhost:8000/docs — all 7 endpoints should be listed in the Swagger UI.

- [ ] **Step 10: Commit**

```bash
git add backend/src/routers/ backend/main.py backend/tests/test_routers.py
git commit -m "feat: FastAPI routers for all 6 endpoints + health check"
```

---

## Backend Complete ✓

Run the full test suite one final time:

```bash
cd backend
pytest tests/ -v --tb=short
```

Expected: all tests pass.

Then start for frontend development:

```bash
uvicorn backend.main:app --reload --port 8000
```

**Next:** Follow `docs/superpowers/plans/2026-04-01-travel-agent-frontend.md`.
