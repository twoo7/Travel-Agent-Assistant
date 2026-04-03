# Travel Agent Assistant — Design Spec

**Date:** 2026-04-01  
**Status:** Approved  
**Scope:** Phase 1 — Stateless trip planning with flight, hotel, POI, and itinerary export

---

## Context

The goal is to build an intelligent travel agent web application that guides users through planning a trip: finding flights, selecting a hotel, discovering points of interest, and exporting a complete day-by-day itinerary. Claude acts as an AI assistant throughout — surfacing recommendations and writing the final narrative — while the user remains in control via a structured, guided funnel.

The project builds on an existing requirements document (`TRAVEL_AGENT_PROJECT_REQUIREMENTS.md`) and has API keys provisioned for Amadeus (flights + hotels) and Anthropic (Claude). Google Places API is added for POI enrichment.

---

## Core Constraints

- **Stateless** — no user authentication or database for Phase 1. All trip state lives in the browser.
- **Downloadable plan** — users export as PDF (polished, shareable) and JSON (structured, for future account import).
- **Claude role** — suggestions and narration only. No conversational Q&A in Phase 1.
- **Architecture** — frontend owns `TripContext` state; every backend call receives the full accumulated context so Claude always has complete trip information.
- **Multi-destination** — a single trip supports multiple flight legs and multiple hotel stays across different cities (e.g., Tokyo → Kyoto → Seoul → home).

---

## Architecture Overview

```
Frontend (Next.js / TypeScript)
  └── TripContext (React Context) — accumulates trip state across all steps
        ↕ REST API — full TripContext passed with every request
Backend (FastAPI / Python)
  ├── Agents      — Claude orchestration (suggestions + narration)
  ├── Services    — external API wrappers
  └── Models      — Pydantic schemas

External APIs: Amadeus · Google Places · Anthropic Claude
```

---

## User Flow — 5-Step Funnel

### Step 1 — Trip Setup
Simple form: destination (text + Google Places autocomplete), origin airport, departure date, return date, number of adults and children. No AI involvement. "Start Planning" initialises `TripContext` and advances to Step 2.

### Step 2 — Flight Segments
User builds their full flight itinerary by adding legs one at a time (e.g., NYC → Tokyo, Tokyo → Seoul, Seoul → NYC). For each leg: origin, destination, date, and passenger count. `AmadeusService` returns results per leg. `FlightAgent` highlights a "Best Pick" with a reason. User can accept or choose manually. All selected legs are stored as an ordered `List[TripLeg]` in `TripContext`. Legs can be added, reordered, or removed before proceeding.

### Step 3 — Hotel Stays
For each destination in the trip legs, the user adds one or more hotel stays with check-in/check-out dates (e.g., Tokyo hotel for 3 nights, Kyoto hotel for 2 nights, Seoul hotel for 7 nights). `AmadeusService` returns hotels per city. `HotelAgent` highlights a recommendation per stay. Multiple stays per city are allowed (e.g., different hotels). All stays are stored as `List[HotelStay]` within their respective `TripLeg`.

### Step 4 — POI & Itinerary Builder
Three-panel layout:

**Left — Claude Suggestions Sidebar (collapsible)**
- Opens/closes via toggle in the top bar; visible by default
- Shows 12 Claude-generated POI suggestions enriched with live Google Places data (name, category, rating, opening hours, price level, indoor/outdoor, Claude's one-line note and best-time tip)
- Each suggestion card shows a mini busy-times bar for the relevant day of the week so users can spot peak hours at a glance
- Filter chips: All / Sights / Food / Culture
- Items already added to the itinerary are greyed out and marked "Added"
- Unplaced suggestions appear as faint ghost pins on the map
- All items are draggable into the day planner

**Middle — Day-by-Day Planner**
- Days are grouped by trip leg / city (e.g., "Tokyo — Jun 10–14", "Seoul — Jun 15–21")
- **Arrival day of each leg:** Airport pinned as fixed non-draggable start → hotel draggable below it by default
- **All other days:** Hotel for the active leg appears as a draggable item at the top by default; can be dragged to any position or dragged out to exclude it from that day entirely
- On hotel-transition days (e.g., checking out of Tokyo hotel and arriving at Kyoto hotel), both hotels appear as draggable items
- Distance and travel time shown between consecutive items (via Google Directions API); recalculated on every drag
- **Removing items:** Each POI and hotel card has a remove button (✕). Removed items go to a "Saved" pool (separate from "Unscheduled") — they can be dragged back into any day or discarded permanently
- **Unscheduled pool** — holds suggested POIs that have been added but not yet placed in a day
- **Saved pool** — holds items explicitly removed from the itinerary, available to restore
- Drag is cross-day and cross-leg: items can move freely between any day in the trip

**Right — Google Map**
- Color-coded numbered pins per day; hotel shown as a distinct purple pin; airport as orange
- Route lines connect pins in order for each day
- Day filter tabs (All / Day 1 / Day 2 / …) to isolate a single day's route
- Hover card on each pin shows name, hours, rating, address
- Ghost pins (faded, dashed border) for unplaced suggestions

**Generate Itinerary button** triggers `ItineraryAgent` (Claude) to write a day-by-day narrative using the final ordered plan.

### Step 5 — Plan Review & Export
Read-only summary: flight details, hotel, day-by-day itinerary with Claude's narrative. Two actions:
- **Download PDF** — polished, printable document generated server-side by `ExportService`
- **Download JSON** — serialised `TripContext` + itinerary for future account import

---

## Backend

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/flights/search` | AmadeusService + FlightAgent |
| POST | `/hotels/search` | AmadeusService + HotelAgent |
| POST | `/pois/suggest` | POIAgent → GooglePlacesService enrich |
| POST | `/pois/distances` | Google Directions API — returns distances, travel times, and route polylines for each consecutive pair in a day (called on drag/reorder) |
| POST | `/itinerary/generate` | ItineraryAgent |
| POST | `/export/plan` | ExportService — returns PDF blob + JSON |

### Agents

All agents receive the full `TripContext` on every call.

- **FlightAgent** — ranks Amadeus flight results, returns top pick + one-sentence reason
- **HotelAgent** — ranks Amadeus hotel results, returns top pick + one-sentence reason
- **POIAgent** — generates 12 POI suggestions for the destination and trip dates; results are enriched by `GooglePlacesService`
- **ItineraryAgent** — receives final ordered `DayPlan[]` and writes day-by-day narrative prose, including travel tips and context for each location

### Services

- **AmadeusService** — wraps Amadeus SDK; `search_flights()` and `search_hotels()` methods; transforms raw responses into `FlightOffer` and `HotelOffer` models
- **GooglePlacesService** — `search_places()`, `get_place_details()` returning hours, rating, address, photo, price level, indoor/outdoor, booking flags, transit info, and popular times (busy_times histogram where the API provides it)
- **GoogleDirectionsService** — `get_routes(ordered_locations[])` returns per-leg: distance_km, travel_time_mins, encoded_polyline (for rendering on the map). Uses Google Directions API.
- **ExportService** — PDF generation via WeasyPrint; JSON serialisation of `ExportPlan`

### Project Structure

```
backend/
├── src/
│   ├── agents/
│   │   ├── flight_agent.py
│   │   ├── hotel_agent.py
│   │   ├── poi_agent.py
│   │   └── itinerary_agent.py
│   ├── services/
│   │   ├── amadeus_service.py
│   │   ├── google_places_service.py
│   │   ├── google_directions_service.py
│   │   └── export_service.py
│   ├── models/
│   │   ├── trip.py          # TripContext, TripLeg, DayPlan, DayItem
│   │   ├── flight.py        # FlightOffer, FlightSegment, FlightSearchRequest
│   │   ├── hotel.py         # HotelOffer, HotelStay, HotelSearchRequest
│   │   ├── poi.py           # POI, POISuggestRequest
│   │   └── export.py        # ExportPlan, ItineraryDay
│   ├── utils/
│   │   └── logging.py
│   └── config.py
├── tests/
├── requirements.txt
├── .env
├── .gitignore
└── main.py
```

---

## Data Models

```python
# Core trip state — passed with every API call
class TripContext(BaseModel):
    home_origin: str                     # departure airport for the whole trip
    adults: int
    children: int = 0
    legs: List[TripLeg]                  # ordered list of destinations
    unscheduled_pois: List[POI] = []     # added but not placed in any day
    saved_pois: List[POI] = []           # removed from itinerary, available to restore

class TripLeg(BaseModel):
    leg_number: int                      # 1-based; last leg is the return home
    origin: str                          # airport code
    destination: str                     # airport code / city
    departure_date: str
    selected_flight: Optional[FlightOffer]
    hotel_stays: List[HotelStay] = []   # multiple allowed (e.g., Tokyo then Kyoto)
    days: List[DayPlan] = []             # days spent in this destination

class HotelStay(BaseModel):
    hotel: HotelOffer
    check_in: str
    check_out: str

class DayPlan(BaseModel):
    day_number: int                      # global day number across the whole trip
    date: str
    leg_number: int                      # which TripLeg this day belongs to
    city: str                            # display name (e.g., "Tokyo")
    items: List[DayItem]                 # ordered; hotel/airport/poi freely mixed

class DayItem(BaseModel):
    type: Literal["poi", "hotel", "airport"]
    name: str
    address: str
    lat: float
    lng: float
    duration_mins: Optional[int]
    notes: Optional[str]
    # Populated by /pois/distances after each drag
    distance_to_next_km: Optional[float]
    travel_time_to_next_mins: Optional[int]
    route_polyline_to_next: Optional[str]   # encoded Google polyline for map rendering

class POI(BaseModel):
    id: str
    name: str
    category: str                        # Landmark | Museum | Restaurant | Park | Neighborhood
    address: str
    lat: float
    lng: float

    # Opening & availability
    opening_hours: Optional[str]         # human-readable string
    booking_required: bool = False       # advance tickets/reservation needed
    indoor_outdoor: Optional[Literal["indoor", "outdoor", "both"]]

    # Crowd & timing
    busy_times: Optional[Dict[str, List[int]]]
    # Hourly busyness score 0–100 per day of week
    # e.g. {"Monday": [0,0,5,5,10,...], "Saturday": [10,10,20,90,95,...]}
    # Sourced from Google Places Popular Times; falls back to None if unavailable
    typical_visit_duration_mins: Optional[int]   # typical time spent on-site

    # Cost
    price_level: Optional[int]           # 0=free, 1=$, 2=$$, 3=$$$, 4=$$$$

    # Quality signals
    rating: Optional[float]
    review_count: Optional[int]
    photo_url: Optional[str]

    # Transit
    nearest_transit: Optional[str]       # e.g. "Trocadéro Metro (line 6), 3 min walk"

    # AI-generated planning tips
    claude_note: str                     # one-line description / why Claude recommends it
    claude_best_time: Optional[str]      # e.g. "Visit at 9am — quietest before 11am"
    claude_booking_tip: Optional[str]    # e.g. "Book skip-the-line tickets at least 2 weeks ahead"

class FlightOffer(BaseModel):
    id: str
    price: float
    currency: str
    segments: List[FlightSegment]
    total_duration: str
    stops: int
    ai_recommended: bool = False
    ai_reason: Optional[str]

class HotelOffer(BaseModel):
    id: str
    name: str
    address: str
    lat: float
    lng: float
    price_per_night: float
    currency: str
    rating: Optional[float]
    ai_recommended: bool = False
    ai_reason: Optional[str]

class ExportPlan(BaseModel):
    schema_version: str = "1.0"          # versioned for future import compatibility
    trip_context: TripContext
    itinerary: List[ItineraryDay]
    generated_at: str

class ItineraryDay(BaseModel):
    day_number: int
    date: str
    city: str
    narrative: str                       # Claude-written prose
    items: List[DayItem]
```

---

## Frontend

### Tech Stack

| Concern | Choice |
|---------|--------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| State | React Context (`TripContext`) |
| Drag and drop | `@dnd-kit/core` + `@dnd-kit/sortable` |
| Maps | Google Maps JS API via `@vis.gl/react-google-maps` |
| Styling | Tailwind CSS |
| PDF download | Server-generated blob, streamed via fetch |

### Component Structure

```
frontend/src/
├── app/
│   ├── page.tsx                  # Step 1 — Trip Setup
│   ├── flights/page.tsx          # Step 2 — Flight Search
│   ├── hotels/page.tsx           # Step 3 — Hotel Search
│   ├── itinerary/page.tsx        # Step 4 — POI & Itinerary Builder
│   └── export/page.tsx           # Step 5 — Plan Review & Export
├── components/
│   ├── Stepper.tsx               # Top progress bar (steps 1–5)
│   ├── flights/
│   │   ├── FlightSearchForm.tsx
│   │   └── FlightCard.tsx        # Shows AI badge if recommended
│   ├── hotels/
│   │   ├── HotelSearchForm.tsx
│   │   └── HotelCard.tsx
│   ├── itinerary/
│   │   ├── SuggestionsSidebar.tsx
│   │   ├── DayPlanner.tsx        # dnd-kit sortable list of days
│   │   ├── DayColumn.tsx         # individual day with drop zone
│   │   ├── DayItem.tsx           # draggable POI / hotel / airport card
│   │   ├── DistanceConnector.tsx # arrow + travel time between items
│   │   └── TripMap.tsx           # Google Maps panel
│   └── export/
│       ├── ItinerarySummary.tsx
│       └── ExportButtons.tsx
├── context/
│   └── TripContext.tsx           # global state + reducer
└── services/
    └── api.ts                    # typed fetch wrappers for all endpoints
```

---

## Environment Variables

```
# Backend (.env)
AMADEUS_API_KEY=
AMADEUS_API_SECRET=
ANTHROPIC_API_KEY=
GOOGLE_PLACES_API_KEY=

# Frontend (.env.local)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Testing Strategy

- **Unit tests** — Pydantic model validation, service response transformation, agent prompt construction
- **Integration tests** — real Amadeus API calls (test environment), Google Places calls with known locations
- **Manual checklist** — valid flight search returns results, drag-drop updates distances, PDF download opens correctly, JSON round-trips cleanly

---

## Future Scope

The following features are explicitly out of scope for Phase 1 but should be designed against:

### User Accounts & Trip Persistence
- Authentication (OAuth or email/password)
- Save trips to a database; retrieve and resume later
- The Phase 1 JSON export format is the import contract — design it to be stable

### Trip Import
- Upload a previously exported JSON to restore a trip into the planner
- Requires the `ExportPlan` schema to be versioned

### AI Q&A — Trip Co-pilot
- Conversational interface: user can ask Claude questions ("Is this neighbourhood safe?", "Move all my Day 2 stops to Day 3") and Claude makes changes to the trip plan
- Requires a conversation history model and a tool-calling agent that can mutate `TripContext`
- Likely implemented as a chat drawer alongside the itinerary step

### Additional Integrations
- Restaurant reservations (OpenTable / Resy API)
- Activity booking (Viator / GetYourGuide API)
- Real-time pricing alerts and price tracking over time
- Multi-city / multi-destination trips

### MCP Server Wrapper
- Wrap the backend as an MCP server so the travel agent can be invoked from Claude Desktop or other MCP clients
- Build core functionality first; add MCP as an abstraction layer after Phase 1 is stable
