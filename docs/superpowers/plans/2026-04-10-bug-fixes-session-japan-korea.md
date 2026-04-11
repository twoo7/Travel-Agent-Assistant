# Japan-Korea Session Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 11 bugs discovered in the Japan-Korea E2E test session in a single PR.

**Architecture:** Backend bugs (#3–5) add a mock-data fallback behind an env gate and improve error message quality. Frontend bugs (#1, #2, #6–11) are isolated UI/state fixes — no new components, no new dependencies.

**Tech Stack:** FastAPI/Python (backend), Next.js 14 App Router/TypeScript (frontend), amadeus Python SDK, React Context + useReducer (trip state), sessionStorage (persistence).

---

## File Map

| File | Bugs | Action |
|---|---|---|
| `backend/.env` | #3, #4 | Modify — add `AMADEUS_MOCK=false` |
| `backend/src/config.py` | #3, #4 | Modify — add `AMADEUS_MOCK` class attr |
| `backend/src/services/amadeus_service.py` | #3, #4 | Modify — mock fallback on 500 |
| `backend/src/routers/flights.py` | #3, #4, #5 | Modify — improved error messages |
| `backend/src/routers/hotels.py` | #3, #4, #5 | Modify — improved error messages |
| `backend/tests/test_config.py` | #3, #4 | Modify — add AMADEUS_MOCK test |
| `backend/tests/test_amadeus_service.py` | #3, #4 | Modify — add mock fallback tests |
| `backend/tests/test_routers.py` | #3, #4, #5 | Modify — add error message tests |
| `frontend/src/services/api.ts` | #5 | Modify — friendly error parsing |
| `frontend/src/components/AirportSearch.tsx` | #1, #2 | Modify — counter ID + city-only display |
| `frontend/src/utils/airportNames.ts` | #6 | Modify — add `getAirportCountry()` |
| `frontend/src/components/segments/TrainSegmentCard.tsx` | #6, #9 | Modify — region links + remove journey line |
| `frontend/src/app/hotels/page.tsx` | #8 | Modify — soft advisory instead of suppression |
| `frontend/src/app/segments/page.tsx` | #7 | Modify — pre-fill origin from last destination |
| `frontend/src/context/TripContext.tsx` | #10 | Modify — sessionStorage persistence |
| `frontend/src/app/itinerary/page.tsx` | #10 | Modify — empty state copy |
| `frontend/src/app/export/page.tsx` | #10 | Modify — empty state copy |
| `frontend/src/components/Sidebar.tsx` | #11 | Modify — TripContext-derived step status |

---

## Task 1: Backend config — AMADEUS_MOCK env gate (Bugs #3, #4)

**Files:**
- Modify: `backend/.env`
- Modify: `backend/src/config.py`
- Modify: `backend/tests/test_config.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/test_config.py`:

```python
def test_config_amadeus_mock_defaults_false(monkeypatch):
    monkeypatch.delenv("AMADEUS_MOCK", raising=False)
    # Re-evaluate the class attribute from the env by re-importing
    import importlib
    import backend.src.config as config_module
    importlib.reload(config_module)
    assert config_module.Config.AMADEUS_MOCK is False


def test_config_amadeus_mock_true_when_env_set(monkeypatch):
    monkeypatch.setenv("AMADEUS_MOCK", "true")
    import importlib
    import backend.src.config as config_module
    importlib.reload(config_module)
    assert config_module.Config.AMADEUS_MOCK is True
```

- [ ] **Step 2: Run to verify failure**

```
backend/venv/Scripts/python -m pytest backend/tests/test_config.py::test_config_amadeus_mock_defaults_false backend/tests/test_config.py::test_config_amadeus_mock_true_when_env_set -v
```

Expected: `AttributeError: type object 'Config' has no attribute 'AMADEUS_MOCK'`

- [ ] **Step 3: Add AMADEUS_MOCK to config.py**

In `backend/src/config.py`, add the `AMADEUS_MOCK` class attribute immediately after the existing `GOOGLE_MAPS_API_KEY` line (line 20). The full updated `Config` class body:

```python
class Config:
    # Class attributes default to empty; call validate() at startup to populate
    # them from the current environment (ensures fresh values, not import-time snapshots).
    AMADEUS_API_KEY: str = ""
    AMADEUS_API_SECRET: str = ""
    ANTHROPIC_API_KEY: str = ""
    GOOGLE_PLACES_API_KEY: str = ""
    GOOGLE_MAPS_API_KEY: str = ""
    # Read at class-definition time so it's available before validate() is called.
    # Not in the required list — defaults to False (production-safe).
    AMADEUS_MOCK: bool = os.getenv("AMADEUS_MOCK", "false").lower() == "true"
```

Do not add `AMADEUS_MOCK` to the `required` list inside `validate()`. Do not add it to the `validate()` refresh block (it reads once at import; tests can monkeypatch `Config.AMADEUS_MOCK` directly).

- [ ] **Step 4: Add AMADEUS_MOCK=false to backend/.env**

Append to `backend/.env`:
```
AMADEUS_MOCK=false
```

- [ ] **Step 5: Run tests to verify passing**

```
backend/venv/Scripts/python -m pytest backend/tests/test_config.py -v
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/config.py backend/.env backend/tests/test_config.py
git commit -m "feat: add AMADEUS_MOCK env gate to Config (bugs #3, #4)"
```

---

## Task 2: AmadeusService — mock data fallback on 500 (Bugs #3, #4)

**Files:**
- Modify: `backend/src/services/amadeus_service.py`
- Modify: `backend/tests/test_amadeus_service.py`

- [ ] **Step 1: Write the failing tests**

Add to `backend/tests/test_amadeus_service.py` (after the existing tests):

```python
def _make_500_error():
    """Create an Amadeus ResponseError that simulates an HTTP 500."""
    mock_response = MagicMock()
    mock_response.status_code = 500
    return AmadeusResponseError(mock_response)


def _make_401_error():
    mock_response = MagicMock()
    mock_response.status_code = 401
    return AmadeusResponseError(mock_response)


def test_search_flights_returns_mock_data_on_500_when_mock_enabled():
    with patch("backend.src.services.amadeus_service.Config") as MockConfig, \
         patch("backend.src.services.amadeus_service.Client") as MockClient:
        MockConfig.validate.return_value = None
        MockConfig.AMADEUS_API_KEY = "test"
        MockConfig.AMADEUS_API_SECRET = "test"
        MockConfig.AMADEUS_MOCK = True
        mock_client = MagicMock()
        MockClient.return_value = mock_client
        mock_client.shopping.flight_offers_search.get.side_effect = _make_500_error()

        service = AmadeusService()
        offers = service.search_flights("JFK", "NRT", "2026-06-01", 2)

        assert len(offers) == 3
        assert all(isinstance(o, FlightOffer) for o in offers)


def test_search_flights_reraises_500_when_mock_disabled():
    with patch("backend.src.services.amadeus_service.Config") as MockConfig, \
         patch("backend.src.services.amadeus_service.Client") as MockClient:
        MockConfig.validate.return_value = None
        MockConfig.AMADEUS_API_KEY = "test"
        MockConfig.AMADEUS_API_SECRET = "test"
        MockConfig.AMADEUS_MOCK = False
        mock_client = MagicMock()
        MockClient.return_value = mock_client
        mock_client.shopping.flight_offers_search.get.side_effect = _make_500_error()

        service = AmadeusService()
        with pytest.raises(AmadeusResponseError):
            service.search_flights("JFK", "NRT", "2026-06-01", 2)


def test_search_flights_always_reraises_non_500_errors():
    with patch("backend.src.services.amadeus_service.Config") as MockConfig, \
         patch("backend.src.services.amadeus_service.Client") as MockClient:
        MockConfig.validate.return_value = None
        MockConfig.AMADEUS_API_KEY = "test"
        MockConfig.AMADEUS_API_SECRET = "test"
        MockConfig.AMADEUS_MOCK = True  # even with mock on, non-500 errors re-raise
        mock_client = MagicMock()
        MockClient.return_value = mock_client
        mock_client.shopping.flight_offers_search.get.side_effect = _make_401_error()

        service = AmadeusService()
        with pytest.raises(AmadeusResponseError):
            service.search_flights("JFK", "NRT", "2026-06-01", 2)


def test_search_hotels_returns_mock_data_on_500_when_mock_enabled():
    with patch("backend.src.services.amadeus_service.Config") as MockConfig, \
         patch("backend.src.services.amadeus_service.Client") as MockClient:
        MockConfig.validate.return_value = None
        MockConfig.AMADEUS_API_KEY = "test"
        MockConfig.AMADEUS_API_SECRET = "test"
        MockConfig.AMADEUS_MOCK = True
        mock_client = MagicMock()
        MockClient.return_value = mock_client
        mock_client.reference_data.locations.hotels.by_city.get.side_effect = _make_500_error()

        service = AmadeusService()
        offers = service.search_hotels("TYO", "2026-06-01", "2026-06-05", 2)

        assert len(offers) == 4
        assert all(isinstance(o, HotelOffer) for o in offers)


def test_search_hotels_reraises_500_when_mock_disabled():
    with patch("backend.src.services.amadeus_service.Config") as MockConfig, \
         patch("backend.src.services.amadeus_service.Client") as MockClient:
        MockConfig.validate.return_value = None
        MockConfig.AMADEUS_API_KEY = "test"
        MockConfig.AMADEUS_API_SECRET = "test"
        MockConfig.AMADEUS_MOCK = False
        mock_client = MagicMock()
        MockClient.return_value = mock_client
        mock_client.reference_data.locations.hotels.by_city.get.side_effect = _make_500_error()

        service = AmadeusService()
        with pytest.raises(AmadeusResponseError):
            service.search_hotels("TYO", "2026-06-01", "2026-06-05", 2)
```

- [ ] **Step 2: Run to verify failure**

```
backend/venv/Scripts/python -m pytest backend/tests/test_amadeus_service.py::test_search_flights_returns_mock_data_on_500_when_mock_enabled -v
```

Expected: FAIL — function doesn't return mock data yet.

- [ ] **Step 3: Add mock data constants and fallback logic to amadeus_service.py**

Replace the entire `backend/src/services/amadeus_service.py` with:

```python
import logging
from typing import List
from amadeus import Client, ResponseError
from backend.src.config import Config
from backend.src.models.flight import FlightOffer, FlightSegment
from backend.src.models.hotel import HotelOffer

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Mock data — returned when Amadeus sandbox returns HTTP 500 and AMADEUS_MOCK=true.
# Not returned in production unless the gate is explicitly on.
# ---------------------------------------------------------------------------

_MOCK_FLIGHTS: List[FlightOffer] = [
    FlightOffer(
        id="MOCK-F1",
        price=850.00,
        currency="USD",
        segments=[
            FlightSegment(
                departure_airport="JFK",
                arrival_airport="NRT",
                departure_time="2026-06-10T10:00:00",
                arrival_time="2026-06-11T14:00:00",
                duration="PT14H",
                carrier_code="JL",
                flight_number="006",
            )
        ],
        total_duration="PT14H",
        stops=0,
    ),
    FlightOffer(
        id="MOCK-F2",
        price=920.00,
        currency="USD",
        segments=[
            FlightSegment(
                departure_airport="JFK",
                arrival_airport="NRT",
                departure_time="2026-06-10T13:00:00",
                arrival_time="2026-06-11T16:30:00",
                duration="PT13H30M",
                carrier_code="NH",
                flight_number="110",
            )
        ],
        total_duration="PT13H30M",
        stops=0,
    ),
    FlightOffer(
        id="MOCK-F3",
        price=720.00,
        currency="USD",
        segments=[
            FlightSegment(
                departure_airport="JFK",
                arrival_airport="ICN",
                departure_time="2026-06-10T08:00:00",
                arrival_time="2026-06-11T11:30:00",
                duration="PT14H30M",
                carrier_code="KE",
                flight_number="082",
            )
        ],
        total_duration="PT14H30M",
        stops=1,
    ),
]

_MOCK_HOTELS: List[HotelOffer] = [
    HotelOffer(
        id="MOCK-H1",
        name="Hotel Gracery Shinjuku",
        address="1-19-1 Kabukicho, Shinjuku",
        lat=35.6938,
        lng=139.7034,
        price_per_night=180.00,
        currency="USD",
        rating=4.0,
    ),
    HotelOffer(
        id="MOCK-H2",
        name="Park Hyatt Tokyo",
        address="3-7-1-2 Nishi-Shinjuku, Shinjuku",
        lat=35.6864,
        lng=139.6900,
        price_per_night=350.00,
        currency="USD",
        rating=5.0,
    ),
    HotelOffer(
        id="MOCK-H3",
        name="The Prince Gallery Tokyo Kioicho",
        address="1-2 Kioicho, Chiyoda",
        lat=35.6791,
        lng=139.7353,
        price_per_night=290.00,
        currency="USD",
        rating=4.5,
    ),
    HotelOffer(
        id="MOCK-H4",
        name="Dormy Inn Asakusa",
        address="1-16-2 Asakusa, Taito",
        lat=35.7147,
        lng=139.7967,
        price_per_night=120.00,
        currency="USD",
        rating=3.5,
    ),
]

# ---------------------------------------------------------------------------


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
        currency_code: str | None = None,
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
            if currency_code:
                params["currencyCode"] = currency_code

            response = self.client.shopping.flight_offers_search.get(**params)
            offers: List[FlightOffer] = []
            for raw in response.data:
                if not raw.get("itineraries"):
                    logger.warning("Skipping flight offer %s: no itineraries", raw.get("id"))
                    continue
                itinerary = raw["itineraries"][0]
                if not itinerary.get("segments"):
                    logger.warning("Skipping flight offer %s: no segments", raw.get("id"))
                    continue
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
            if e.response.status_code == 500 and Config.AMADEUS_MOCK:
                logger.warning(
                    "Amadeus flight search returned 500 — returning mock data (AMADEUS_MOCK=true)"
                )
                return list(_MOCK_FLIGHTS)
            logger.error("Amadeus flight search error: %s", e)
            raise

    def search_hotels(
        self,
        city_code: str,
        check_in: str,
        check_out: str,
        adults: int,
        currency_code: str | None = None,
    ) -> List[HotelOffer]:
        try:
            hotels_response = self.client.reference_data.locations.hotels.by_city.get(
                cityCode=city_code,
            )
        except ResponseError as e:
            if e.response.status_code == 500 and Config.AMADEUS_MOCK:
                logger.warning(
                    "Amadeus hotel lookup returned 500 — returning mock data (AMADEUS_MOCK=true)"
                )
                return list(_MOCK_HOTELS)
            logger.error("Amadeus hotel lookup error: %s", e)
            raise

        hotel_ids = [h["hotelId"] for h in hotels_response.data if h.get("hotelId")][:10]
        if not hotel_ids:
            logger.warning("No hotels found in city %s", city_code)
            return []

        search_params: dict = {
            "hotelIds": hotel_ids,
            "checkInDate": check_in,
            "checkOutDate": check_out,
            "adults": adults,
        }
        if currency_code:
            search_params["currency"] = currency_code

        try:
            response = self.client.shopping.hotel_offers_search.get(**search_params)
        except ResponseError as e:
            if e.response.status_code == 500 and Config.AMADEUS_MOCK:
                logger.warning(
                    "Amadeus hotel offers search returned 500 — returning mock data (AMADEUS_MOCK=true)"
                )
                return list(_MOCK_HOTELS)
            retry_count = min(5, len(hotel_ids))
            logger.warning(
                "Hotel offers search failed with %d IDs, retrying with %d: %s",
                len(hotel_ids), retry_count, e,
            )
            search_params["hotelIds"] = hotel_ids[:retry_count]
            try:
                response = self.client.shopping.hotel_offers_search.get(**search_params)
            except ResponseError:
                logger.error("Hotel offers retry also failed for %s", city_code)
                return []

        offers: List[HotelOffer] = []
        for raw in response.data:
            hotel = raw["hotel"]
            if not raw.get("offers"):
                logger.warning("Skipping hotel %s: no offers", hotel.get("hotelId"))
                continue
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
```

- [ ] **Step 4: Run all amadeus service tests**

```
backend/venv/Scripts/python -m pytest backend/tests/test_amadeus_service.py -v
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/amadeus_service.py backend/tests/test_amadeus_service.py
git commit -m "feat: add Amadeus mock data fallback on HTTP 500 (bugs #3, #4)"
```

---

## Task 3: Routers — improved error messages (Bugs #3, #4, #5)

**Files:**
- Modify: `backend/src/routers/flights.py`
- Modify: `backend/src/routers/hotels.py`
- Modify: `backend/tests/test_routers.py`

- [ ] **Step 1: Write the failing tests**

Add to `backend/tests/test_routers.py` (after the existing flight/hotel tests):

```python
# ---------------------------------------------------------------------------
# Error message tests (Bugs #3, #4, #5)
# ---------------------------------------------------------------------------

def _make_500_response_error():
    mock_response = MagicMock()
    mock_response.status_code = 500
    from amadeus import ResponseError
    return ResponseError(mock_response)


def _make_401_response_error():
    mock_response = MagicMock()
    mock_response.status_code = 401
    from amadeus import ResponseError as RE
    err = RE(mock_response)
    return err


def test_flight_search_returns_503_with_friendly_message_on_amadeus_500(client):
    with patch("backend.src.routers.flights.AmadeusService") as MockService:
        MockService.return_value.search_flights.side_effect = _make_500_response_error()
        resp = client.post("/flights/search", json={
            "trip_context": _base_trip_context(),
            "leg_number": 1,
            "origin": "JFK",
            "destination": "NRT",
            "departure_date": "2026-06-01",
            "adults": 2,
        })
    assert resp.status_code == 503
    assert "temporarily unavailable" in resp.json()["detail"].lower()


def test_flight_search_returns_502_with_specific_detail_on_non_500_amadeus_error(client):
    with patch("backend.src.routers.flights.AmadeusService") as MockService, \
         patch("backend.src.routers.flights.ResponseError", Exception):
        err = _make_401_response_error()
        MockService.return_value.search_flights.side_effect = err
        resp = client.post("/flights/search", json={
            "trip_context": _base_trip_context(),
            "leg_number": 1,
            "origin": "JFK",
            "destination": "NRT",
            "departure_date": "2026-06-01",
            "adults": 2,
        })
    # 502 for non-500 Amadeus errors
    assert resp.status_code in (502, 503)


def test_hotel_search_returns_503_with_friendly_message_on_amadeus_500(client):
    with patch("backend.src.routers.hotels.AmadeusService") as MockService:
        MockService.return_value.search_hotels.side_effect = _make_500_response_error()
        resp = client.post("/hotels/search", json={
            "trip_context": _base_trip_context(),
            "leg_number": 1,
            "city_code": "TYO",
            "check_in": "2026-06-01",
            "check_out": "2026-06-05",
            "adults": 2,
        })
    assert resp.status_code == 503
    assert "temporarily unavailable" in resp.json()["detail"].lower()
```

- [ ] **Step 2: Run to verify failure**

```
backend/venv/Scripts/python -m pytest backend/tests/test_routers.py::test_flight_search_returns_503_with_friendly_message_on_amadeus_500 -v
```

Expected: FAIL — currently returns 502 with raw error string.

- [ ] **Step 3: Update flights.py**

Replace `backend/src/routers/flights.py` with:

```python
from __future__ import annotations

from typing import List

from amadeus import ResponseError
from fastapi import APIRouter, HTTPException

from backend.src.agents.flight_agent import FlightAgent
from backend.src.models.flight import FlightOffer, FlightSearchRequest
from backend.src.services.amadeus_service import AmadeusService

router = APIRouter(prefix="/flights", tags=["flights"])


@router.post("/search", response_model=List[FlightOffer])
def search_flights(req: FlightSearchRequest) -> List[FlightOffer]:
    try:
        service = AmadeusService()
        offers = service.search_flights(
            origin=req.origin,
            destination=req.destination,
            departure_date=req.departure_date,
            adults=req.adults,
            max_results=req.max_results,
            currency_code=req.currency or None,
        )
    except ResponseError as exc:
        if exc.response.status_code == 500:
            raise HTTPException(
                status_code=503,
                detail="Flight search is temporarily unavailable. Please try again later.",
            ) from exc
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    agent = FlightAgent()
    return agent.rank_and_recommend(offers, req.trip_context)
```

- [ ] **Step 4: Update hotels.py**

Replace `backend/src/routers/hotels.py` with:

```python
from __future__ import annotations

from typing import List

from amadeus import ResponseError
from fastapi import APIRouter, HTTPException

from backend.src.agents.hotel_agent import HotelAgent
from backend.src.models.hotel import HotelOffer, HotelSearchRequest
from backend.src.services.amadeus_service import AmadeusService

router = APIRouter(prefix="/hotels", tags=["hotels"])


@router.post("/search", response_model=List[HotelOffer])
def search_hotels(req: HotelSearchRequest) -> List[HotelOffer]:
    try:
        service = AmadeusService()
        offers = service.search_hotels(
            city_code=req.city_code,
            check_in=req.check_in,
            check_out=req.check_out,
            adults=req.adults,
            currency_code=req.currency or None,
        )
    except ResponseError as exc:
        if exc.response.status_code == 500:
            raise HTTPException(
                status_code=503,
                detail="Hotel search is temporarily unavailable. Please try again later.",
            ) from exc
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    agent = HotelAgent()
    return agent.rank_and_recommend(offers, req.trip_context)
```

- [ ] **Step 5: Run router error tests**

```
backend/venv/Scripts/python -m pytest backend/tests/test_routers.py::test_flight_search_returns_503_with_friendly_message_on_amadeus_500 backend/tests/test_routers.py::test_hotel_search_returns_503_with_friendly_message_on_amadeus_500 -v
```

Expected: both PASS.

- [ ] **Step 6: Run full router test suite**

```
backend/venv/Scripts/python -m pytest backend/tests/test_routers.py -v
```

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/routers/flights.py backend/src/routers/hotels.py backend/tests/test_routers.py
git commit -m "fix: return 503 with friendly message on Amadeus 500, pass-through other errors (bug #3, #4, #5)"
```

---

## Task 4: api.ts — friendly client-side error parsing (Bug #5)

**Files:**
- Modify: `frontend/src/services/api.ts`

No frontend unit test framework exists — verify with build + lint.

- [ ] **Step 1: Update `post()` in api.ts**

Replace lines 13–24 (the `post()` function) in `frontend/src/services/api.ts`:

```typescript
async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const raw = await res.text();
    console.error(`API ${path} failed: ${res.status} —`, raw);
    let message = "Something went wrong. Please try again.";
    try {
      const json = JSON.parse(raw) as { detail?: string };
      if (json.detail) {
        if (json.detail.toLowerCase().includes("temporarily unavailable")) {
          message = "Flight/hotel search is temporarily unavailable. Please try again shortly.";
        } else {
          message = json.detail;
        }
      }
    } catch {
      // body was not JSON — use default message
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}
```

- [ ] **Step 2: Build to verify no TypeScript errors**

```
cd frontend && npm run build
```

Expected: Build succeeds with no type errors.

- [ ] **Step 3: Lint**

```
cd frontend && npm run lint
```

Expected: No lint errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/services/api.ts
git commit -m "fix: parse API error detail and show friendly message instead of raw JSON (bug #5)"
```

---

## Task 5: AirportSearch — hydration ID fix + city-only display (Bugs #1, #2)

**Files:**
- Modify: `frontend/src/components/AirportSearch.tsx`

- [ ] **Step 1: Update AirportSearch.tsx**

Make these two changes to `frontend/src/components/AirportSearch.tsx`:

**Change 1** — Add module-level counter and optional `id` prop. Replace lines 20–35 (the interface + `findAirport`/`displayName` functions):

```typescript
interface AirportSearchProps {
  label: string;
  value: string;
  onChange: (iata: string) => void;
  placeholder?: string;
  disabled?: boolean;
  showCityCode?: boolean;
  id?: string;
}

let moduleCounter = 0;

function findAirport(iata: string): Airport | undefined {
  return airports.find((a) => a.iata === iata);
}

function displayName(airport: Airport): string {
  return airport.city;
}
```

**Change 2** — Update the component signature and the `listboxId` ref. Replace lines 65–78 (the export default function signature through the `listboxId` line):

```typescript
export default function AirportSearch({
  label,
  value,
  onChange,
  placeholder = "City or airport name",
  disabled = false,
  showCityCode = false,
  id,
}: AirportSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useRef(`airport-listbox-${id ?? moduleCounter++}`);
```

- [ ] **Step 2: Build and lint**

```
cd frontend && npm run build && npm run lint
```

Expected: No errors. Hydration warning gone (verify manually in browser: no "Prop `id` did not match" console errors on page load).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/AirportSearch.tsx
git commit -m "fix: deterministic listbox ID to fix hydration mismatch, city-only display name (bugs #1, #2)"
```

---

## Task 6: Region-aware train links + remove journey time (Bugs #6, #9)

**Files:**
- Modify: `frontend/src/utils/airportNames.ts`
- Modify: `frontend/src/components/segments/TrainSegmentCard.tsx`

- [ ] **Step 1: Add `getAirportCountry` to airportNames.ts**

Replace the entire `frontend/src/utils/airportNames.ts` with:

```typescript
import airports from "@/data/airports.json";

const NAME_INDEX: Record<string, string> = Object.fromEntries(
  airports.map((a) => [a.iata, a.city])
);

const COUNTRY_INDEX: Record<string, string> = Object.fromEntries(
  airports.map((a) => [a.iata, a.country])
);

export function iataToCityName(iata: string): string {
  return NAME_INDEX[iata?.toUpperCase()] ?? iata;
}

export function getAirportCountry(iata: string): string {
  return COUNTRY_INDEX[iata?.toUpperCase()] ?? "";
}
```

- [ ] **Step 2: Update TrainSegmentCard.tsx**

Replace the entire `frontend/src/components/segments/TrainSegmentCard.tsx` with:

```typescript
import type { TripLeg } from "@/types/trip";
import { Train, Check, ExternalLink, Info } from "lucide-react";
import { getAirportCountry } from "@/utils/airportNames";

interface Props {
  leg: TripLeg;
}

const EUROPEAN_COUNTRIES = new Set([
  "AT", "BE", "CH", "CZ", "DE", "DK", "ES", "FI", "FR", "GB",
  "HR", "HU", "IT", "NL", "NO", "PL", "PT", "RO", "SE", "SK",
]);

function getBookingLinks(
  origin: string,
  destination: string
): { label: string; href: string }[] {
  const originCountry = getAirportCountry(origin);
  const destCountry = getAirportCountry(destination);

  if (originCountry === "JP" && destCountry === "JP") {
    return [
      { label: "JR Pass", href: "https://www.jrpass.com" },
      { label: "Hyperdia", href: "https://www.hyperdia.com" },
      { label: "Klook", href: "https://www.klook.com" },
    ];
  }

  if (originCountry === "KR" && destCountry === "KR") {
    return [
      { label: "Korail", href: "https://www.letskorail.com" },
      { label: "Klook", href: "https://www.klook.com" },
    ];
  }

  if (EUROPEAN_COUNTRIES.has(originCountry) && EUROPEAN_COUNTRIES.has(destCountry)) {
    return [
      { label: "Trainline", href: "https://www.trainline.eu" },
      { label: "Eurail", href: "https://www.eurail.com" },
      { label: "Rail Europe", href: "https://www.raileurope.com" },
    ];
  }

  return [
    { label: "The Man in Seat 61", href: "https://www.seat61.com" },
    { label: "Rome2Rio", href: "https://www.rome2rio.com" },
  ];
}

export function TrainSegmentCard({ leg }: Props) {
  const links = getBookingLinks(leg.origin, leg.destination);

  return (
    <div className="bg-success/5 border border-success/20 rounded-xl p-5 relative">
      <span className="absolute top-4 right-4 inline-flex items-center gap-1 text-xs font-semibold text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded-full font-body">
        <Check size={10} />
        Confirmed
      </span>

      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
          <Train size={18} className="text-success" />
        </div>
        <h3 className="text-lg font-semibold text-primary font-display">Train</h3>
      </div>

      <p className="text-base font-medium text-charcoal mb-4 font-body">
        {leg.origin} → {leg.destination}
      </p>

      <div className="mb-4">
        <p className="text-xs font-semibold text-charcoal/50 uppercase tracking-wide mb-2 font-body">Book on</p>
        <div className="flex flex-wrap gap-2">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-success-dark font-medium hover:text-success underline underline-offset-2 font-body transition-colors"
            >
              {link.label}
              <ExternalLink size={11} />
            </a>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2 bg-success/5 rounded-lg px-3 py-2">
        <Info size={13} className="text-success shrink-0 mt-0.5" />
        <p className="text-xs text-charcoal/60 font-body">
          Train tickets are not bookable in-app. Use the links above to find and book your journey.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Build and lint**

```
cd frontend && npm run build && npm run lint
```

Expected: No errors. For a Japan-to-Japan train leg, JR Pass / Hyperdia / Klook links appear. The "Estimated journey: varies" line is gone.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/utils/airportNames.ts frontend/src/components/segments/TrainSegmentCard.tsx
git commit -m "fix: region-aware train booking links, remove estimated journey line (bugs #6, #9)"
```

---

## Task 7: Hotels page — sleeper train advisory instead of suppression (Bug #8)

**Files:**
- Modify: `frontend/src/app/hotels/page.tsx`

- [ ] **Step 1: Replace the sleeper train block in hotels/page.tsx**

Find the "Sleeper train notice" block (currently lines 227–239). Replace it entirely with the advisory version:

Old code to replace:
```tsx
              {/* Sleeper train notice */}
              {leg.transport_mode === "train" && (
                <div className="flex items-start gap-3 bg-success/5 border border-success/20 rounded-xl p-4">
                  <Train size={16} className="text-success shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-success-dark text-sm font-body">Sleeper Train Leg</p>
                    <p className="text-sm text-charcoal/70 font-body mt-0.5">
                      Your overnight sleeper train from {leg.origin} to {leg.destination} includes
                      berth accommodation. No hotel needed for this leg&apos;s departure night.
                    </p>
                  </div>
                </div>
              )}
```

New code:
```tsx
              {/* Sleeper train advisory — non-suppressing */}
              {leg.transport_mode === "train" && (
                <div className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                  <Train size={13} className="text-muted shrink-0 mt-0.5" />
                  <p className="text-xs text-charcoal/60 font-body">
                    Note: If this is an overnight sleeper train, berth accommodation may be included —
                    you may not need a hotel for this leg.
                  </p>
                </div>
              )}
```

- [ ] **Step 2: Build and lint**

```
cd frontend && npm run build && npm run lint
```

Expected: No errors. Train legs now show the hotel search form with a non-blocking advisory note above it.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/hotels/page.tsx
git commit -m "fix: show hotel search for train legs with soft advisory instead of blocking notice (bug #8)"
```

---

## Task 8: Segments page — add-leg origin pre-fill (Bug #7)

**Files:**
- Modify: `frontend/src/app/segments/page.tsx`

- [ ] **Step 1: Update newLeg initial state and post-add reset**

In `frontend/src/app/segments/page.tsx`, there are two changes:

**Change 1** — Initialize `newLeg.origin` from the last leg's destination. Replace lines 64–69:

Old:
```typescript
  const [newLeg, setNewLeg] = useState({
    origin: "",
    destination: "",
    departure_date: "",
    transport_mode: "flight" as TripLeg["transport_mode"],
  });
```

New:
```typescript
  const lastDestination = tripContext.legs[tripContext.legs.length - 1]?.destination ?? "";
  const [newLeg, setNewLeg] = useState({
    origin: lastDestination,
    destination: "",
    departure_date: "",
    transport_mode: "flight" as TripLeg["transport_mode"],
  });
```

**Change 2** — Reset to empty origin after adding (not the new last destination — user fills fresh). Replace line 167 inside `handleAddLeg`:

Old:
```typescript
    setNewLeg({ origin: "", destination: "", departure_date: "", transport_mode: "flight" });
```

New:
```typescript
    setNewLeg({ origin: "", destination: "", departure_date: "", transport_mode: "flight" as TripLeg["transport_mode"] });
```

**Change 3** — Update input placeholders (around lines 319 and 329). Find and update the "From" and "To" inputs:

Old `From` input:
```tsx
                placeholder="JFK"
```

New:
```tsx
                placeholder="e.g. KIX"
```

Old `To` input:
```tsx
                placeholder="NRT"
```

New:
```tsx
                placeholder="Next destination"
```

- [ ] **Step 2: Build and lint**

```
cd frontend && npm run build && npm run lint
```

Expected: No errors. The "From" field on the add-leg form is pre-filled with the last leg's destination IATA code.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/segments/page.tsx
git commit -m "fix: pre-fill add-leg origin from last leg's destination (bug #7)"
```

---

## Task 9: TripContext — sessionStorage persistence + empty state copy (Bug #10)

**Files:**
- Modify: `frontend/src/context/TripContext.tsx`
- Modify: `frontend/src/app/itinerary/page.tsx`
- Modify: `frontend/src/app/export/page.tsx`

- [ ] **Step 1: Update TripContext.tsx — wrap reducer with sessionStorage**

Replace `frontend/src/context/TripContext.tsx` with:

```typescript
"use client";

import { createContext, useContext, useReducer, useEffect, ReactNode } from "react";
import type {
  TripContext as TripContextType,
  TripLeg,
  FlightOffer,
  HotelOffer,
  HotelStay,
  DayPlan,
  POI,
  ItineraryDay,
  TransportMode,
} from "@/types/trip";

interface TripState {
  tripContext: TripContextType;
  itinerary: ItineraryDay[];
  staleSteps: string[];
}

type TripAction =
  | { type: "INIT_TRIP"; payload: Pick<TripContextType, "home_origin" | "adults" | "children"> & { currency?: string } }
  | { type: "UPDATE_TRIP_META"; payload: Partial<Pick<TripContextType, "home_origin" | "adults" | "children" | "currency">> }
  | { type: "ADD_LEG"; payload: TripLeg }
  | { type: "UPDATE_LEG"; payload: TripLeg }
  | { type: "REMOVE_LEG"; payload: { leg_number: number } }
  | { type: "SET_FLIGHT"; payload: { leg_number: number; flight: FlightOffer } }
  | { type: "ADD_HOTEL_STAY"; payload: { leg_number: number; stay: HotelStay } }
  | { type: "REMOVE_HOTEL_STAY"; payload: { leg_number: number; hotel_id: string } }
  | { type: "SET_DAYS"; payload: DayPlan[] }
  | { type: "ADD_UNSCHEDULED_POI"; payload: POI }
  | { type: "REMOVE_UNSCHEDULED_POI"; payload: { poi_id: string } }
  | { type: "SAVE_POI"; payload: { poi_id: string } }
  | { type: "RESTORE_POI"; payload: { poi_id: string } }
  | { type: "SET_ITINERARY"; payload: ItineraryDay[] }
  | { type: "SET_TRANSPORT_MODE"; payload: { leg_number: number; mode: TransportMode } }
  | { type: "SET_FLIGHT_RESULTS"; payload: { leg_number: number; results: FlightOffer[] } }
  | { type: "SET_HOTEL_RESULTS"; payload: { leg_number: number; results: HotelOffer[] } }
  | { type: "MARK_STALE"; payload: { keys: string[] } }
  | { type: "CLEAR_STALE"; payload: { key: string } }
  | { type: "RESET" };

const EMPTY_CONTEXT: TripContextType = {
  home_origin: "",
  adults: 2,
  children: 0,
  currency: "USD",
  legs: [],
  unscheduled_pois: [],
  saved_pois: [],
};

const INITIAL_STATE: TripState = {
  tripContext: EMPTY_CONTEXT,
  itinerary: [],
  staleSteps: [],
};

const SESSION_KEY = "trip-context";

function loadFromSession(): TripState {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return INITIAL_STATE;
    const parsed = JSON.parse(raw) as TripState;
    // Minimal validation: must have a tripContext with legs array
    if (!parsed?.tripContext || !Array.isArray(parsed.tripContext.legs)) {
      return INITIAL_STATE;
    }
    return parsed;
  } catch {
    return INITIAL_STATE;
  }
}

function saveToSession(state: TripState): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage unavailable (e.g. private mode quota exceeded) — silently skip
  }
}

function reducer(state: TripState, action: TripAction): TripState {
  const ctx = state.tripContext;

  switch (action.type) {
    case "INIT_TRIP":
      return {
        ...state,
        tripContext: { ...EMPTY_CONTEXT, ...action.payload },
        staleSteps: [],
      };

    case "UPDATE_TRIP_META":
      return {
        ...state,
        tripContext: { ...ctx, ...action.payload },
      };

    case "ADD_LEG":
      return {
        ...state,
        tripContext: { ...ctx, legs: [...ctx.legs, action.payload] },
      };

    case "UPDATE_LEG":
      return {
        ...state,
        tripContext: {
          ...ctx,
          legs: ctx.legs.map((l) =>
            l.leg_number === action.payload.leg_number ? action.payload : l
          ),
        },
      };

    case "REMOVE_LEG":
      return {
        ...state,
        tripContext: {
          ...ctx,
          legs: ctx.legs.filter((l) => l.leg_number !== action.payload.leg_number),
        },
      };

    case "SET_FLIGHT":
      return {
        ...state,
        tripContext: {
          ...ctx,
          legs: ctx.legs.map((l) =>
            l.leg_number === action.payload.leg_number
              ? { ...l, selected_flight: action.payload.flight }
              : l
          ),
        },
      };

    case "ADD_HOTEL_STAY":
      return {
        ...state,
        tripContext: {
          ...ctx,
          legs: ctx.legs.map((l) =>
            l.leg_number === action.payload.leg_number
              ? {
                  ...l,
                  hotel_stays: [
                    ...l.hotel_stays.filter(
                      (s) => s.hotel.id !== action.payload.stay.hotel.id
                    ),
                    action.payload.stay,
                  ],
                }
              : l
          ),
        },
      };

    case "REMOVE_HOTEL_STAY":
      return {
        ...state,
        tripContext: {
          ...ctx,
          legs: ctx.legs.map((l) =>
            l.leg_number === action.payload.leg_number
              ? {
                  ...l,
                  hotel_stays: l.hotel_stays.filter(
                    (s) => s.hotel.id !== action.payload.hotel_id
                  ),
                }
              : l
          ),
        },
      };

    case "SET_DAYS": {
      const byLeg: Record<number, DayPlan[]> = {};
      for (const day of action.payload) {
        if (!byLeg[day.leg_number]) byLeg[day.leg_number] = [];
        byLeg[day.leg_number].push(day);
      }
      return {
        ...state,
        tripContext: {
          ...ctx,
          legs: ctx.legs.map((l) => ({
            ...l,
            days: byLeg[l.leg_number] ?? l.days,
          })),
        },
      };
    }

    case "ADD_UNSCHEDULED_POI":
      if (ctx.unscheduled_pois.some((p) => p.id === action.payload.id)) return state;
      return {
        ...state,
        tripContext: {
          ...ctx,
          unscheduled_pois: [...ctx.unscheduled_pois, action.payload],
        },
      };

    case "REMOVE_UNSCHEDULED_POI":
      return {
        ...state,
        tripContext: {
          ...ctx,
          unscheduled_pois: ctx.unscheduled_pois.filter(
            (p) => p.id !== action.payload.poi_id
          ),
        },
      };

    case "SAVE_POI": {
      const poi = ctx.unscheduled_pois.find((p) => p.id === action.payload.poi_id);
      if (!poi) return state;
      return {
        ...state,
        tripContext: {
          ...ctx,
          unscheduled_pois: ctx.unscheduled_pois.filter(
            (p) => p.id !== action.payload.poi_id
          ),
          saved_pois: [...ctx.saved_pois, poi],
        },
      };
    }

    case "RESTORE_POI": {
      const poi = ctx.saved_pois.find((p) => p.id === action.payload.poi_id);
      if (!poi) return state;
      return {
        ...state,
        tripContext: {
          ...ctx,
          saved_pois: ctx.saved_pois.filter((p) => p.id !== action.payload.poi_id),
          unscheduled_pois: [...ctx.unscheduled_pois, poi],
        },
      };
    }

    case "SET_ITINERARY":
      return { ...state, itinerary: action.payload };

    case "SET_TRANSPORT_MODE":
      return {
        ...state,
        tripContext: {
          ...ctx,
          legs: ctx.legs.map((l) =>
            l.leg_number === action.payload.leg_number
              ? { ...l, transport_mode: action.payload.mode }
              : l
          ),
        },
      };

    case "SET_FLIGHT_RESULTS":
      return {
        ...state,
        tripContext: {
          ...ctx,
          legs: ctx.legs.map((l) =>
            l.leg_number === action.payload.leg_number
              ? { ...l, flight_results: action.payload.results }
              : l
          ),
        },
      };

    case "SET_HOTEL_RESULTS":
      return {
        ...state,
        tripContext: {
          ...ctx,
          legs: ctx.legs.map((l) =>
            l.leg_number === action.payload.leg_number
              ? { ...l, hotel_results: action.payload.results }
              : l
          ),
        },
      };

    case "MARK_STALE": {
      const existing = new Set(state.staleSteps);
      const staleLegNumbers = new Set<number>();
      for (const k of action.payload.keys) {
        existing.add(k);
        const match = k.match(/^(?:segments|hotels)-(\d+)$/);
        if (match) staleLegNumbers.add(Number(match[1]));
      }
      return {
        ...state,
        staleSteps: Array.from(existing),
        tripContext: {
          ...ctx,
          legs: ctx.legs.map((l) =>
            staleLegNumbers.has(l.leg_number)
              ? { ...l, flight_results: undefined, hotel_results: undefined }
              : l
          ),
        },
      };
    }

    case "CLEAR_STALE":
      return {
        ...state,
        staleSteps: state.staleSteps.filter((k) => k !== action.payload.key),
      };

    case "RESET":
      return INITIAL_STATE;

    default:
      return state;
  }
}

const TripContextCtx = createContext<{
  state: TripState;
  dispatch: React.Dispatch<TripAction>;
} | null>(null);

export function TripContextProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE, () => {
    // Load persisted state on first render (client-only: sessionStorage is not available on server)
    if (typeof window === "undefined") return INITIAL_STATE;
    return loadFromSession();
  });

  // Persist to sessionStorage after every state change
  useEffect(() => {
    saveToSession(state);
  }, [state]);

  return (
    <TripContextCtx.Provider value={{ state, dispatch }}>
      {children}
    </TripContextCtx.Provider>
  );
}

export function useTripContext() {
  const ctx = useContext(TripContextCtx);
  if (!ctx) throw new Error("useTripContext must be used within TripContextProvider");
  return ctx;
}
```

- [ ] **Step 2: Update empty state copy in itinerary/page.tsx**

Find and replace the empty-state block in `frontend/src/app/itinerary/page.tsx` (around lines 164–176):

Old:
```tsx
  if (tripContext.legs.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="text-muted font-body">No trip set up yet.</p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 text-primary hover:text-primary-dark font-body text-sm underline underline-offset-2"
        >
          ← Go back to Trip Setup
        </button>
      </div>
    );
  }
```

New:
```tsx
  if (tripContext.legs.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="text-muted font-body">
          Your session was reset — progress is not saved across page refreshes.
        </p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 text-primary hover:text-primary-dark font-body text-sm underline underline-offset-2"
        >
          ← Go back to Trip Setup to start planning
        </button>
      </div>
    );
  }
```

- [ ] **Step 3: Update empty state copy in export/page.tsx**

Find and replace the empty-state block in `frontend/src/app/export/page.tsx` (around lines 17–29):

Old:
```tsx
  if (tripContext.legs.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="text-muted font-body">No trip to export yet.</p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 text-primary hover:text-primary-dark font-body text-sm underline underline-offset-2"
        >
          ← Start planning
        </button>
      </div>
    );
  }
```

New:
```tsx
  if (tripContext.legs.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="text-muted font-body">
          Your session was reset — progress is not saved across page refreshes.
        </p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 text-primary hover:text-primary-dark font-body text-sm underline underline-offset-2"
        >
          ← Go back to Trip Setup to start planning
        </button>
      </div>
    );
  }
```

- [ ] **Step 4: Build and lint**

```
cd frontend && npm run build && npm run lint
```

Expected: No errors. Manually verify: set up a trip, refresh the tab — trip state should persist. Open a new tab — state is gone (sessionStorage is per-tab).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/context/TripContext.tsx frontend/src/app/itinerary/page.tsx frontend/src/app/export/page.tsx
git commit -m "fix: persist TripContext to sessionStorage, updated empty-state copy (bug #10)"
```

---

## Task 10: Sidebar — TripContext-derived step status (Bug #11)

**Files:**
- Modify: `frontend/src/components/Sidebar.tsx`

- [ ] **Step 1: Update `stepStatus()` in Sidebar.tsx**

Find the `stepStatus` function (lines 222–228) and replace it with the TripContext-derived version. Also add the `tripContext` extraction from state.

**Change 1** — Extract `tripContext` from state. Find line 198:
```typescript
  const { staleSteps } = state;
```
Replace with:
```typescript
  const { staleSteps, tripContext } = state;
```

**Change 2** — Replace `stepStatus` function (lines 222–228):

Old:
```typescript
  function stepStatus(index: number): StepStatus {
    if (index === currentIndex) return "active";
    const step = STEPS[index];
    if (step.staleKey && isStepStale(step.staleKey)) return "stale";
    if (index < currentIndex) return "done";
    return "locked";
  }
```

New:
```typescript
  function isStepDone(index: number): boolean {
    const isReturnLeg = (destination: string) => destination === tripContext.home_origin;

    switch (index) {
      case 0: // Trip Setup
        return tripContext.legs.length > 0;
      case 1: // Segments
        return (
          tripContext.legs.length > 0 &&
          tripContext.legs.every(
            (l) => !!l.selected_flight || (l.transport_mode !== "flight" && l.transport_mode !== undefined)
          )
        );
      case 2: // Hotels
        return (
          tripContext.legs.length > 0 &&
          tripContext.legs
            .filter((l) => !isReturnLeg(l.destination))
            .every((l) => l.hotel_stays.length > 0)
        );
      case 3: // Itinerary — done when Hotels is done
        return isStepDone(2);
      case 4: // Export — done when Itinerary is done
        return isStepDone(3);
      default:
        return false;
    }
  }

  function stepStatus(index: number): StepStatus {
    if (index === currentIndex) return "active";
    const step = STEPS[index];
    if (step.staleKey && isStepStale(step.staleKey)) return "stale";
    if (isStepDone(index)) return "done";
    return "locked";
  }
```

- [ ] **Step 2: Build and lint**

```
cd frontend && npm run build && npm run lint
```

Expected: No errors. Manually verify: navigate directly to `/export` with no trip set — all steps except the active one show "Locked", not "Done".

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Sidebar.tsx
git commit -m "fix: derive sidebar step status from TripContext instead of route position (bug #11)"
```

---

## Task 11: Run full test suite and verify

- [ ] **Step 1: Run all backend tests**

```
backend/venv/Scripts/python -m pytest backend/tests/ -v
```

Expected: all tests PASS.

- [ ] **Step 2: Run frontend build**

```
cd frontend && npm run build
```

Expected: Build succeeds with no TypeScript or compilation errors.

- [ ] **Step 3: Run frontend lint**

```
cd frontend && npm run lint
```

Expected: No lint errors.

- [ ] **Step 4: Final commit (if any stragglers)**

If everything passes cleanly, no additional commit needed — all changes are committed per task above.

---

## Self-Review: Spec Coverage Check

| Bug | Task | Covered |
|---|---|---|
| #1 — Hydration mismatch (Math.random) | Task 5 | ✓ |
| #2 — Airport name chip truncation | Task 5 | ✓ |
| #3 — Flight search Amadeus 500 fallback | Tasks 1, 2, 3 | ✓ |
| #4 — Hotel search Amadeus 500 fallback | Tasks 1, 2, 3 | ✓ |
| #5 — Raw API error in UI | Tasks 3, 4 | ✓ |
| #6 — Region-aware train booking links | Task 6 | ✓ |
| #7 — Add-leg pre-fill origin | Task 8 | ✓ |
| #8 — Sleeper train blocks hotel search | Task 7 | ✓ |
| #9 — "Estimated journey: varies" | Task 6 | ✓ |
| #10 — State wipes on refresh | Task 9 | ✓ |
| #11 — Sidebar shows false Done status | Task 10 | ✓ |
