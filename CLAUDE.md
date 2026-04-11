# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Planning & Specifications

All project planning and specifications are documented in:

- **Backend:** [docs/superpowers/plans/2026-04-01-travel-agent-backend.md](docs/superpowers/plans/2026-04-01-travel-agent-backend.md)
- **Frontend:** [docs/superpowers/plans/2026-04-01-travel-agent-frontend.md](docs/superpowers/plans/2026-04-01-travel-agent-frontend.md)

Consult these before making architectural decisions or implementing new features. Ensure these specifications are updated once the new features or changes have been implemented.

Do not make any changes until you have 95% confidence in waht you need to build. Ask me follow-up questions until you reach that confidence.

## Commands

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

This is a stateless trip-planning app. **All trip state lives in the browser** — no database or auth in Phase 1.

```
Frontend (Next.js / TypeScript)
  └── TripContext (React Context + useReducer)
        ↕ REST — full TripContext sent with every POST
Backend (FastAPI / Python)
  ├── Agents   — Claude orchestration (suggestions + narration)
  ├── Services — external API wrappers (Amadeus, Google Places, Directions)
  └── Models   — Pydantic schemas (mirrored in frontend/src/types/trip.ts)
```

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

- `SuggestionsSidebar` — collapsible left panel with Claude POI suggestions, filter chips, and busy-times bars
- `DayPlanner` / `DayColumn` — dnd-kit sortable; drag POIs/hotels between days; distance/travel time recalculated via `/pois/distances` on every reorder
- `TripMap` — Google Maps right panel with color-coded day pins, route polylines, and ghost pins for unplaced suggestions
- `api.ts` — all typed `fetch` wrappers; `NEXT_PUBLIC_API_URL` defaults to `http://localhost:8000`

### Testing

Router tests (`test_routers.py`) mock both the service and agent layers with `unittest.mock.patch`. Service tests mock the Amadeus/Google SDK clients. The config skips `load_dotenv` when `PYTEST_CURRENT_TEST` is set, so monkeypatching env vars in tests works reliably.

All playwright screenshots should be stored in a single folder called "PlaywrightTests" with folders to separate each test session. PlayWright End to End testing is located under `/frontend/e2e`. They should be updated as new features are added and tested.

### Applied Learning

When something fails repeatedly, when Tim has to re-explain, or when a workaround is found for a platform/tool limitation, add a one-line bullet here. Keep each bullet under 15 words. No explanations. Only add things that will save time in future sessions.

- Writing large data files in one shot triggers content filtering; scope to only needed entries.
- All task commits must go in the main repo root.
- Run pytest via `backend/venv/Scripts/python -m pytest` from repo root; plain `python -m pytest` lacks dependencies.
- Sidebar pinned state must live in `LayoutShell` so `<main>` can adjust padding reactively.