# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Planning & Specifications

All project planning and specifications are documented in:

- **Backend:** [docs/superpowers/plans/2026-04-01-travel-agent-backend.md](docs/superpowers/plans/2026-04-01-travel-agent-backend.md)
- **Frontend:** [docs/superpowers/plans/2026-04-01-travel-agent-frontend.md](docs/superpowers/plans/2026-04-01-travel-agent-frontend.md)

Consult these before making architectural decisions or implementing new features. Ensure these specifications are updated once the new features or changes have been implemented.

Do not make any changes until you have 95% confidence in waht you need to build. Ask me follow-up questions until you reach that confidence.

## UI Design System

The app uses a **Bold/Immersive** dark design language. Full spec: [docs/superpowers/specs/2026-04-10-ui-polish-design.md](docs/superpowers/specs/2026-04-10-ui-polish-design.md)

### Core Principles
- **Canvas**: Dark gradient background (`#0a1628 → #0F2937`) with static ambient radial glows (ember top-right, sage bottom-left) on every page
- **Surfaces**: 3-level glassmorphism system — Base (`white/4`), Card (`white/7`), Elevated (`white/11`). All with matching border opacity and `backdrop-filter: blur`
- **Accent**: Ember (`#E07A5F`) with box-shadow glow for highlights, AI picks, prices. Sage (`#6B9080`) for success/selected states
- **Typography**: DM Serif Display for page titles (28–36px), DM Sans for all body/labels. Eyebrow labels: 10px, LS 3px, uppercase, 35% white
- **Light mode**: Background → `#FAF8F5`, glass surfaces → `white/80` with blur. Accent colors unchanged
- **Animations**: Framer Motion spring physics throughout — page transitions (slide-up, stiffness 300/damping 30), card stagger (60ms delay, scale 0.96→1), button press (scale 0.97), hover lift (y −2px + glow), theme toggle (clip-path circle reveal)

Do not deviate from this system when building new UI components. Extend it, don't replace it.

## Commands

### Redis (required for trip persistence)

```bash
# Start Redis via Docker (from repo root)
docker compose up -d redis

# Stop Redis
docker compose down

# Check Redis is running
docker compose ps
```

Redis listens on `localhost:6379`. Set `REDIS_URL=redis://localhost:6379/0` in `backend/.env` (this is the default, so it's optional for local dev).

### Backend (FastAPI / Python)

```bash
.\backend\venv\Scripts\activate

# Start dev server (from repo root)
uvicorn backend.src.main:app --reload

# Run all tests
cd backend && python -m pytest

# Run a single test file
cd backend && python -m pytest tests/test_routers.py

# Run a single test
cd backend && python -m pytest tests/test_routers.py::test_health
```

The backend uses `backend.src.*` import paths (not relative). Always run pytest from within the `backend/` directory or use `python -m pytest` from there. The venv is at `backend/venv/`.

### Frontend (Next.js)

```bash
cd frontend
npm run dev      # Start dev server on :3000
npm run build
npm run lint
```

## Environment Variables

**`backend/.env`** (required):
```
AMADEUS_API_KEY=
AMADEUS_API_SECRET=
ANTHROPIC_API_KEY=
GOOGLE_PLACES_API_KEY=
GOOGLE_MAPS_API_KEY=   # optional — used for directions
```

**`frontend/.env.local`**:
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_API_URL=http://localhost:8000
```

`Config.validate()` is called at service instantiation time (not import time), so tests can monkeypatch env vars before the service is constructed.

## Architecture

Trip state is persisted via Redis: a `uid` cookie identifies the browser, and each trip gets a `trip_id`. The frontend auto-saves to `PUT /trips/{id}` (debounced 1s). Shared trips are claimed via `POST /trips/{id}/claim`. Third-party API results (Amadeus, Google Places) are cached in Redis by param hash.

```
Frontend (Next.js / TypeScript)
  └── TripContext (React Context + useReducer)
        ├── auto-saves to PUT /trips/{id} (1s debounce)
        ├── falls back to localStorage as offline buffer
        └── ↕ REST — full TripContext sent with every POST
Backend (FastAPI / Python)
  ├── Agents   — Claude orchestration (suggestions + narration)
  ├── Services — external API wrappers (Amadeus, Google Places, Directions)
  ├── Routers  — /trips/* for persistence; ?nocache=true bypasses cache
  └── Models   — Pydantic schemas (mirrored in frontend/src/types/trip.ts)
Redis
  ├── trip:{id}:state    — full TripState JSON (1y named / 7d draft)
  ├── trip:{id}:meta     — name, owners, is_draft, timestamps
  ├── user:{uid}:trips   — SET of trip_ids per user (1y)
  ├── cache:amadeus:flights:{hash16}   — TTL 2h
  ├── cache:amadeus:hotels:{hash16}    — TTL 2h
  ├── cache:places:suggest:{hash16}    — TTL 24h
  └── cache:places:details:{place_id} — TTL 7d
```

### Trip persistence endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/trips` | Create draft → `{trip_id, is_draft}` |
| `GET` | `/trips` | List user's trips → `TripMeta[]` |
| `GET` | `/trips/{id}` | Full state (403 if not owner) |
| `PUT` | `/trips/{id}` | Replace state (autosave payload) |
| `PATCH` | `/trips/{id}` | Rename / promote draft → named |
| `DELETE` | `/trips/{id}` | Remove from user's list |
| `POST` | `/trips/{id}/claim` | Add current user as owner (share flow) |

### TripContext — the central data structure

`TripContext` accumulates across the 5-step funnel (Setup → Segments → Hotels → POI/Itinerary → Export) and is sent with every API call so Claude always has complete trip information. It contains:
- `home_origin`, `adults`, `children`
- `legs: TripLeg[]` — ordered flight legs, each containing `selected_flight`, `hotel_stays[]`, and `days[]`
- `unscheduled_pois[]` — POIs added but not yet placed in a day
- `saved_pois[]` — POIs removed from the itinerary but available to restore

Frontend state is managed entirely in `frontend/src/context/TripContext.tsx` via a `useReducer`.

### Backend request/response pattern

Every search endpoint (flights, hotels, POIs) follows the same two-phase pattern:
1. **Service call** — `AmadeusService` or `GooglePlacesService` fetches raw data
2. **Agent call** — Claude (`FlightAgent`, `HotelAgent`, `POIAgent`) ranks/enriches results and sets `ai_recommended: true` on the top pick with an `ai_reason` string

Agents use `claude-sonnet-4-6` directly via the Anthropic SDK. They expect Claude to respond with JSON (stripped of markdown fences if present).

### Frontend pages (5-step funnel)

| Route | Step |
|---|---|
| `/` | Trip Setup — initialises TripContext |
| `/segments` | Multi-modal segment search per leg (flight/train/ferry/car) |
| `/hotels` | Hotel search per destination |
| `/itinerary` | POI suggestions + drag-and-drop day planner + Google Map |
| `/export` | Read-only summary + PDF/JSON download |

### Key frontend components

- `SuggestionsSidebar` — "Locations" panel with three tabs: AI Picks (Claude suggestions + filter chips), Search (Google Places), Saved (bookmarked POIs). Uses `LocationCard` for all three tabs.
- `LocationCard` — shared card component for all sidebar tabs. AI-specific fields (`aiNote`, `bestTime`, `bookingRequired`, `busyTimes`) are optional; always shows photo, name (Google Maps link), rating, address, category. Internal `pickerOpen` state manages inline `DayPicker`.
- `PlacesSearch` — Google Places Autocomplete via `useMapsLibrary('places')`. Fires `getPlacePredictions` on debounced input (300ms), then parallel `getDetails` for top 5 results. Renders `LocationCard` per result with full photo/rating/address.
- `DayPicker` — shared day-picker dropdown used by LocationCard and PlacesSearch for selecting which day to add a POI to.
- `DayPlanner` / `DayColumn` — dnd-kit sortable; drag POIs/hotels between days; distance/travel time recalculated via `/pois/distances` on every reorder
- `TripMap` — Google Maps right panel; single `APIProvider` lives in `page.tsx` (not in TripMap or PlacesSearch); color-coded day pins, route polylines, focused-day filter.
- `api.ts` — all typed `fetch` wrappers; `NEXT_PUBLIC_API_URL` defaults to `http://localhost:8000`

### Google Maps / Places API patterns

- **Single `APIProvider`**: Mount exactly one `<APIProvider apiKey={...}>` at the page level (`itinerary/page.tsx`). Never wrap child components (TripMap, PlacesSearch) with their own `APIProvider` — multiple instances conflict and prevent maps from loading.
- **`useMapsLibrary` in children**: `TripMap` and `PlacesSearch` call `useMapsLibrary('places')` / `useMapsLibrary('routes')` and receive the library once the parent `APIProvider` has loaded.
- **PlacesService callback TS workaround**: `google.*` namespace types are not reliably resolved inside `useCallback` closures. Type callbacks as `(result: unknown, status: string)`, use `status !== "OK"` string instead of `google.maps.places.PlacesServiceStatus.OK`, cast result with `as any` before accessing fields.
- **AutocompletionRequest TS workaround**: Pass the request object `as any` to `getPlacePredictions` — `locationBias` as `{ lat, lng }` literal doesn't satisfy the `LatLng` interface at compile time but works at runtime.
- **Return-leg guard**: Skip POI suggestions when `leg.destination === tripContext.home_origin` (both are IATA strings). Both the fetch function and the "Suggest places" button visibility must check this.

### Testing

Router tests (`test_routers.py`) mock both the service and agent layers with `unittest.mock.patch`. Service tests mock the Amadeus/Google SDK clients. The config skips `load_dotenv` when `PYTEST_CURRENT_TEST` is set, so monkeypatching env vars in tests works reliably.

All playwright screenshots should be stored in a single folder at the root of the project called "PlaywrightTests" with folders to separate each test session. PlayWright End to End testing is located under `/frontend/e2e`. They should be updated as new features are added and tested.

### Applied Learning

When something fails repeatedly, when Tim has to re-explain, or when a workaround is found for a platform/tool limitation, add a one-line bullet here. Keep each bullet under 15 words. No explanations. Only add things that will save time in future sessions.

- Writing large data files in one shot triggers content filtering; scope to only needed entries.
- All task commits must go in the main repo root.
- Run pytest via `backend/venv/Scripts/python -m pytest` from repo root; plain `python -m pytest` lacks dependencies.
- Sidebar pinned state must live in `LayoutShell` so `<main>` can adjust padding reactively.
- Multiple `APIProvider` instances break Google Maps; always mount exactly one at the page level.
- `google.*` types unreliable in `useCallback`; use `as any` casts + `"OK"` string instead of enum.
- Return legs (destination === home_origin) must be guarded in both fetch fn and button visibility.