# Travel Agent Assistant — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 5-step Next.js trip planning UI: trip setup (with searchable airport combobox + multi-destination leg builder) → travel segments (flight/train/ferry/car per leg) → multi-hotel stays (with ferry cabin / sleeper train awareness) → drag-and-drop POI itinerary builder with live Google Map → PDF/JSON export with full transport segment manifest.

**Architecture:** `TripContext` React Context holds all trip state. Each step reads/writes to context and calls the backend via `api.ts`. A persistent collapsible left Sidebar replaces the top Stepper and shows trip summary + navigation. The itinerary builder uses `@dnd-kit` for cross-day drag-and-drop and `@vis.gl/react-google-maps` for the live route map. Transport mode per leg controls which segment UI renders (FlightCard, TrainSegmentCard, FerrySegmentCard, CarSegmentCard). All pages are fully responsive down to 375px.

**Tech Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · @dnd-kit/core · @dnd-kit/sortable · @vis.gl/react-google-maps · WeasyPrint PDF (server-generated)

**Prerequisite:** Backend running at `http://localhost:8000` (see `2026-04-01-travel-agent-backend.md`).

---

## File Map

| File | Responsibility |
|------|---------------|
| `frontend/src/types/trip.ts` | TypeScript types mirroring all backend Pydantic models |
| `frontend/src/context/TripContext.tsx` | Global trip state + reducer |
| `frontend/src/services/api.ts` | Typed fetch wrappers for all backend endpoints |
| `frontend/src/data/airports.json` | Bundled airport database (~3,000 airports) <!-- NEW: airport search --> |
| `frontend/src/data/ferry_routes.json` | Known ferry corridors for availability logic <!-- NEW: transport modes --> |
| `frontend/src/utils/transportAvailability.ts` | Compute available transport modes per leg <!-- NEW: transport modes --> |
| `frontend/src/components/Sidebar.tsx` | Collapsible left sidebar with step nav + trip summary <!-- NEW: sidebar --> |
| `frontend/src/components/Stepper.tsx` | Top progress bar (kept for mobile fallback, integrated into Sidebar) |
| `frontend/src/components/AirportSearch.tsx` | Searchable airport combobox <!-- NEW: airport search --> |
| `frontend/src/app/layout.tsx` | Root layout wrapping all pages in TripContextProvider + Sidebar |
| `frontend/src/app/page.tsx` | Step 1 — Trip Setup form (with AirportSearch + multi-destination leg builder) |
| `frontend/src/app/segments/page.tsx` | Step 2 — Travel Segments (replaces /flights; mode-aware) <!-- NEW: renamed --> |
| `frontend/src/app/hotels/page.tsx` | Step 3 — Hotel Stays (ferry cabin / sleeper train aware) |
| `frontend/src/app/itinerary/page.tsx` | Step 4 — POI & Itinerary Builder |
| `frontend/src/app/export/page.tsx` | Step 5 — Plan Review & Export |
| `frontend/src/components/flights/FlightSearchForm.tsx` | Flight leg search form |
| `frontend/src/components/flights/FlightCard.tsx` | Single flight result card with AI Pick explanation panel |
| `frontend/src/components/segments/TrainSegmentCard.tsx` | Train route info card with booking links <!-- NEW --> |
| `frontend/src/components/segments/FerrySegmentCard.tsx` | Ferry route info card with operator + cabin hints <!-- NEW --> |
| `frontend/src/components/segments/CarSegmentCard.tsx` | Drive time card with Google Maps link <!-- NEW --> |
| `frontend/src/components/hotels/HotelSearchForm.tsx` | Hotel search form per leg |
| `frontend/src/components/hotels/HotelCard.tsx` | Single hotel result card with AI Pick explanation panel |
| `frontend/src/components/itinerary/SuggestionsSidebar.tsx` | Collapsible Claude suggestions panel |
| `frontend/src/components/itinerary/BusyTimesBar.tsx` | Mini hourly busyness chart |
| `frontend/src/components/itinerary/DayPlanner.tsx` | dnd-kit container managing all days + pools |
| `frontend/src/components/itinerary/DayColumn.tsx` | Single day's sortable drop zone |
| `frontend/src/components/itinerary/DayItemCard.tsx` | Draggable POI/hotel/airport card |
| `frontend/src/components/itinerary/DistanceConnector.tsx` | Arrow + walk time between consecutive items |
| `frontend/src/components/itinerary/TripMap.tsx` | Google Maps panel with pins + routes |
| `frontend/src/components/export/ItinerarySummary.tsx` | Read-only trip summary |
| `frontend/src/components/export/ExportButtons.tsx` | PDF + JSON download buttons |

---

### Task 1: Next.js Scaffolding & TypeScript Types

**Files:**
- Create: `frontend/` (entire Next.js project)
- Create: `frontend/src/types/trip.ts`
- Create: `frontend/.env.local`

- [ ] **Step 1: Scaffold Next.js project**

```bash
cd "C:/Users/Timothy/Documents/GitHub/travel-agent-claude"
npx create-next-app@14 frontend --typescript --tailwind --app --no-src-dir --import-alias "@/*"
# When prompted:
# Would you like to use ESLint? Yes
# Would you like to customize the default import alias? No
```

- [ ] **Step 2: Install dependencies**

```bash
cd frontend
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install @vis.gl/react-google-maps
npm install @types/google.maps
```

- [ ] **Step 3: Create `frontend/.env.local`**

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
NEXT_PUBLIC_API_URL=http://localhost:8000
```

- [ ] **Step 4: Create `frontend/src/types/trip.ts`**

<!-- MODIFIED: TripLeg gains transport_mode; DayItem gains transport_mode and spans_days; HotelStay gains accommodation_type; TransportSegment added; ExportRequest gains transport_segments -->

```typescript
// Mirror of all backend Pydantic models

export type DayItemType = "poi" | "hotel" | "airport";

// NEW: added for multi-modal transport
export type TransportMode = "flight" | "train" | "ferry" | "car";

// NEW: added for hotel accommodation types
export type AccommodationType = "hotel" | "ferry_cabin" | "sleeper_train";

export interface DayItem {
  type: DayItemType;
  name: string;
  address: string;
  lat: number;
  lng: number;
  duration_mins?: number;
  notes?: string;
  distance_to_next_km?: number;
  travel_time_to_next_mins?: number;
  route_polyline_to_next?: string;
  // NEW: added for transport-aware itinerary items
  transport_mode?: TransportMode;
  spans_days?: number; // default 1
}

export interface DayPlan {
  day_number: number;
  date: string;
  leg_number: number;
  city: string;
  items: DayItem[];
}

export interface HotelOffer {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  price_per_night: number;
  currency: string;
  rating?: number;
  ai_recommended: boolean;
  ai_reason?: string;
}

export interface HotelStay {
  hotel: HotelOffer;
  check_in: string;
  check_out: string;
  // NEW: added for non-flight leg accommodation
  accommodation_type?: AccommodationType; // default "hotel"
}

export interface FlightSegment {
  departure_airport: string;
  arrival_airport: string;
  departure_time: string;
  arrival_time: string;
  duration: string;
  carrier_code: string;
  flight_number: string;
}

export interface FlightOffer {
  id: string;
  price: number;
  currency: string;
  segments: FlightSegment[];
  total_duration: string;
  stops: number;
  ai_recommended: boolean;
  ai_reason?: string;
}

export interface TripLeg {
  leg_number: number;
  origin: string;
  destination: string;
  departure_date: string;
  // NEW: added for multi-modal transport
  transport_mode?: TransportMode; // default "flight"
  selected_flight?: FlightOffer;
  hotel_stays: HotelStay[];
  days: DayPlan[];
}

export interface POI {
  id: string;
  name: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  opening_hours?: string;
  booking_required: boolean;
  indoor_outdoor?: "indoor" | "outdoor" | "both";
  busy_times?: Record<string, number[]>;
  typical_visit_duration_mins?: number;
  price_level?: number;
  rating?: number;
  review_count?: number;
  photo_url?: string;
  nearest_transit?: string;
  claude_note: string;
  claude_best_time?: string;
  claude_booking_tip?: string;
}

export interface TripContext {
  home_origin: string;
  adults: number;
  children: number;
  legs: TripLeg[];
  unscheduled_pois: POI[];
  saved_pois: POI[];
}

export interface ItineraryDay {
  day_number: number;
  date: string;
  city: string;
  narrative: string;
  items: DayItem[];
}

// NEW: added for multi-modal export
export interface TransportSegment {
  mode: TransportMode;
  origin: string;
  destination: string;
  operator?: string;
  duration_mins?: number;
  booking_link?: string;
  booking_ref?: string;
  notes?: string;
}

export interface ExportRequest {
  trip_context: TripContext;
  itinerary: ItineraryDay[];
  // NEW: added for multi-modal export
  transport_segments?: TransportSegment[];
}

export interface RouteSegment {
  distance_km: number | null;
  travel_time_mins: number | null;
  encoded_polyline: string | null;
}

// NEW: added for airport search combobox
export interface AirportRecord {
  iata: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  continent: string;
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/
git commit -m "feat: Next.js frontend scaffolding with TypeScript trip types — transport modes and TransportSegment"
```

---

### Task 2: TripContext + api.ts

**Files:**
- Create: `frontend/src/context/TripContext.tsx`
- Create: `frontend/src/services/api.ts`

- [ ] **Step 1: Create `frontend/src/context/TripContext.tsx`**

<!-- MODIFIED: SET_TRANSPORT_MODE action added for per-leg mode selection -->

```tsx
"use client";

import {
  createContext,
  useContext,
  useReducer,
  ReactNode,
} from "react";
import type {
  TripContext as TripContextType,
  TripLeg,
  FlightOffer,
  HotelStay,
  DayPlan,
  POI,
  ItineraryDay,
  TransportMode,
} from "@/types/trip";

interface TripState {
  tripContext: TripContextType;
  itinerary: ItineraryDay[];
}

type TripAction =
  | { type: "INIT_TRIP"; payload: Pick<TripContextType, "home_origin" | "adults" | "children"> }
  | { type: "ADD_LEG"; payload: TripLeg }
  | { type: "UPDATE_LEG"; payload: TripLeg }
  | { type: "REMOVE_LEG"; payload: { leg_number: number } }
  | { type: "SET_FLIGHT"; payload: { leg_number: number; flight: FlightOffer } }
  // NEW: added for per-leg transport mode
  | { type: "SET_TRANSPORT_MODE"; payload: { leg_number: number; mode: TransportMode } }
  | { type: "ADD_HOTEL_STAY"; payload: { leg_number: number; stay: HotelStay } }
  | { type: "REMOVE_HOTEL_STAY"; payload: { leg_number: number; hotel_id: string } }
  | { type: "SET_DAYS"; payload: DayPlan[] }
  | { type: "ADD_UNSCHEDULED_POI"; payload: POI }
  | { type: "SAVE_POI"; payload: { poi_id: string } }
  | { type: "RESTORE_POI"; payload: { poi_id: string } }
  | { type: "SET_ITINERARY"; payload: ItineraryDay[] }
  | { type: "RESET" };

const EMPTY_CONTEXT: TripContextType = {
  home_origin: "",
  adults: 2,
  children: 0,
  legs: [],
  unscheduled_pois: [],
  saved_pois: [],
};

const INITIAL_STATE: TripState = {
  tripContext: EMPTY_CONTEXT,
  itinerary: [],
};

function reducer(state: TripState, action: TripAction): TripState {
  const ctx = state.tripContext;

  switch (action.type) {
    case "INIT_TRIP":
      return {
        ...state,
        tripContext: { ...EMPTY_CONTEXT, ...action.payload },
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

    // NEW: added for per-leg transport mode selection
    case "SET_TRANSPORT_MODE":
      return {
        ...state,
        tripContext: {
          ...ctx,
          legs: ctx.legs.map((l) =>
            l.leg_number === action.payload.leg_number
              ? { ...l, transport_mode: action.payload.mode, selected_flight: undefined }
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
              ? { ...l, hotel_stays: [...l.hotel_stays, action.payload.stay] }
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
      return {
        ...state,
        tripContext: {
          ...ctx,
          unscheduled_pois: [...ctx.unscheduled_pois, action.payload],
        },
      };

    case "SAVE_POI": {
      const poi =
        ctx.unscheduled_pois.find((p) => p.id === action.payload.poi_id) ??
        ctx.legs
          .flatMap((l) => l.days)
          .flatMap((d) => d.items)
          .find((item) => item.name === action.payload.poi_id);
      if (!poi) return state;
      return {
        ...state,
        tripContext: {
          ...ctx,
          unscheduled_pois: ctx.unscheduled_pois.filter(
            (p) => p.id !== action.payload.poi_id
          ),
          saved_pois: [...ctx.saved_pois, poi as POI],
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
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
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

- [ ] **Step 2: Create `frontend/src/services/api.ts`**

<!-- MODIFIED: getDriveTime added for car legs -->

```typescript
import type {
  TripContext,
  FlightOffer,
  HotelOffer,
  POI,
  ItineraryDay,
  DayPlan,
  DayItem,
  RouteSegment,
  ExportRequest,
} from "@/types/trip";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  searchFlights: (params: {
    trip_context: TripContext;
    leg_number: number;
    origin: string;
    destination: string;
    departure_date: string;
    adults: number;
    max_results?: number;
  }): Promise<FlightOffer[]> => post("/flights/search", params),

  searchHotels: (params: {
    trip_context: TripContext;
    leg_number: number;
    city_code: string;
    check_in: string;
    check_out: string;
    adults: number;
  }): Promise<HotelOffer[]> => post("/hotels/search", params),

  suggestPOIs: (params: {
    trip_context: TripContext;
    leg_number: number;
  }): Promise<POI[]> => post("/pois/suggest", params),

  getDistances: (params: {
    day_items: DayItem[];
  }): Promise<RouteSegment[]> => post("/pois/distances", params),

  generateItinerary: (params: {
    trip_context: TripContext;
    days: DayPlan[];
  }): Promise<ItineraryDay[]> => post("/itinerary/generate", params),

  // NEW: added for car leg drive time
  getDriveTime: (params: {
    origin: string;
    destination: string;
    mode?: string;
  }): Promise<{ distance_km: number | null; travel_time_mins: number | null; encoded_polyline: string | null }> =>
    post("/segments/drive-time", params),

  exportPDF: async (request: ExportRequest): Promise<Blob> => {
    const res = await fetch(`${BASE}/export/plan/pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!res.ok) throw new Error(`PDF export failed: ${res.status}`);
    return res.blob();
  },

  exportJSON: (request: ExportRequest): Promise<{ data: string }> =>
    post("/export/plan/json", request),
};
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/context/ frontend/src/services/ frontend/src/types/
git commit -m "feat: TripContext reducer with SET_TRANSPORT_MODE and typed API service"
```

---

### Task 3: Airport + Ferry Data Files & Transport Availability Utils <!-- NEW: added for airport search and transport modes -->

**Files:**
- Create: `frontend/src/data/airports.json`
- Create: `frontend/src/data/ferry_routes.json`
- Create: `frontend/src/utils/transportAvailability.ts`
- Create: `frontend/src/components/AirportSearch.tsx`

- [ ] **Step 1: Create `frontend/src/data/airports.json`**

Populate with top ~3,000 airports. Each entry:

```json
[
  { "iata": "JFK", "name": "John F. Kennedy International Airport", "city": "New York", "country": "US", "lat": 40.6413, "lng": -73.7781, "continent": "NA" },
  { "iata": "LHR", "name": "Heathrow Airport", "city": "London", "country": "GB", "lat": 51.4700, "lng": -0.4543, "continent": "EU" },
  { "iata": "NRT", "name": "Narita International Airport", "city": "Tokyo", "country": "JP", "lat": 35.7720, "lng": 140.3929, "continent": "AS" }
]
```

For the actual build, source the data from the `airportdb` npm package or use a pre-existing `airports.json` dataset (e.g. from `https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat`), converted to the `AirportRecord` shape.

- [ ] **Step 2: Create `frontend/src/data/ferry_routes.json`**

Hardcoded known ferry corridors used for transport availability logic:

```json
[
  { "id": "dover-calais", "origin_iata": "LON", "destination_iata": "PAR", "origin_city": "Dover", "destination_city": "Calais", "operator": "DFDS", "crossing_mins": 90 },
  { "id": "barcelona-mallorca", "origin_iata": "BCN", "destination_iata": "PMI", "origin_city": "Barcelona", "destination_city": "Palma de Mallorca", "operator": "Balearia", "crossing_mins": 480 },
  { "id": "stockholm-helsinki", "origin_iata": "ARN", "destination_iata": "HEL", "origin_city": "Stockholm", "destination_city": "Helsinki", "operator": "Viking Line", "crossing_mins": 1000 },
  { "id": "athens-santorini", "origin_iata": "ATH", "destination_iata": "JTR", "origin_city": "Athens (Piraeus)", "destination_city": "Santorini", "operator": "Blue Star Ferries", "crossing_mins": 480 },
  { "id": "holyhead-dublin", "origin_iata": "LHR", "destination_iata": "DUB", "origin_city": "Holyhead", "destination_city": "Dublin", "operator": "Irish Ferries", "crossing_mins": 210 },
  { "id": "venice-split", "origin_iata": "VCE", "destination_iata": "SPU", "origin_city": "Venice", "destination_city": "Split", "operator": "Jadrolinija", "crossing_mins": 960 }
]
```

- [ ] **Step 3: Create `frontend/src/utils/transportAvailability.ts`**

```typescript
import type { AirportRecord, TransportMode } from "@/types/trip";
import airportsData from "@/data/airports.json";
import ferryRoutesData from "@/data/ferry_routes.json";

const airports: AirportRecord[] = airportsData as AirportRecord[];

interface FerryRoute {
  id: string;
  origin_iata: string;
  destination_iata: string;
  origin_city: string;
  destination_city: string;
  operator: string;
  crossing_mins: number;
}

const ferryRoutes: FerryRoute[] = ferryRoutesData as FerryRoute[];

export interface ModeAvailability {
  mode: TransportMode;
  available: boolean;
  hint: string;
}

/** Haversine distance in km between two lat/lng points */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getAirport(iata: string): AirportRecord | undefined {
  return airports.find((a) => a.iata.toUpperCase() === iata.toUpperCase());
}

function sameContinents(a: AirportRecord, b: AirportRecord): boolean {
  return a.continent === b.continent;
}

function ferryRouteExists(originIata: string, destIata: string): FerryRoute | undefined {
  const o = originIata.toUpperCase();
  const d = destIata.toUpperCase();
  return ferryRoutes.find(
    (r) =>
      (r.origin_iata === o && r.destination_iata === d) ||
      (r.origin_iata === d && r.destination_iata === o)
  );
}

/**
 * Compute which transport modes are available for a given leg.
 *
 * Rules:
 * - Flight: always available
 * - Train: same continent AND distance < 900 km
 * - Ferry: a known water crossing exists in ferry_routes.json
 * - Car: same continent AND distance < 600 km AND continuous land connection
 *        (approximated as: same continent AND distance < 600 km AND NOT an island route)
 */
export function getTransportAvailability(
  originIata: string,
  destinationIata: string
): ModeAvailability[] {
  const origin = getAirport(originIata);
  const dest = getAirport(destinationIata);

  if (!origin || !dest) {
    return [
      { mode: "flight", available: true, hint: "Flight is always available." },
      { mode: "train", available: false, hint: "Airport data unavailable — cannot check train availability." },
      { mode: "ferry", available: false, hint: "Airport data unavailable — cannot check ferry availability." },
      { mode: "car", available: false, hint: "Airport data unavailable — cannot check drive availability." },
    ];
  }

  const distKm = haversineKm(origin.lat, origin.lng, dest.lat, dest.lng);
  const sameContinent = sameContinents(origin, dest);
  const ferry = ferryRouteExists(originIata, destinationIata);

  const results: ModeAvailability[] = [];

  // Flight — always available
  results.push({
    mode: "flight",
    available: true,
    hint: `Direct air route: ~${Math.round(distKm)} km.`,
  });

  // Train — same continent + under 900 km
  if (!sameContinent) {
    results.push({
      mode: "train",
      available: false,
      hint: `Train unavailable: ${origin.continent} → ${dest.continent} crosses continents.`,
    });
  } else if (distKm >= 900) {
    results.push({
      mode: "train",
      available: false,
      hint: `Train unavailable: ${Math.round(distKm)} km is over the 900 km practical rail limit.`,
    });
  } else {
    results.push({
      mode: "train",
      available: true,
      hint: `Rail feasible: ${Math.round(distKm)} km within Europe/Asia rail network. Check Trainline or Eurail for operators.`,
    });
  }

  // Ferry — known route lookup
  if (ferry) {
    results.push({
      mode: "ferry",
      available: true,
      hint: `Ferry available: ${ferry.operator} operates ${ferry.origin_city} → ${ferry.destination_city} (~${ferry.crossing_mins} min crossing).`,
    });
  } else {
    results.push({
      mode: "ferry",
      available: false,
      hint: "No known scheduled ferry route for this pair. Check local operators if crossing a strait.",
    });
  }

  // Car — same continent + under 600 km (ferry existence implies water crossing → no direct drive)
  if (!sameContinent) {
    results.push({
      mode: "car",
      available: false,
      hint: `Driving unavailable: route crosses continents.`,
    });
  } else if (ferry && distKm > 50) {
    // Ferry route implies a water crossing that breaks land continuity
    results.push({
      mode: "car",
      available: false,
      hint: `Driving unavailable: this route requires a water crossing (use the ferry option instead).`,
    });
  } else if (distKm >= 600) {
    results.push({
      mode: "car",
      available: false,
      hint: `Driving not recommended: ${Math.round(distKm)} km exceeds the 600 km practical drive limit.`,
    });
  } else {
    results.push({
      mode: "car",
      available: true,
      hint: `Drive feasible: ~${Math.round(distKm)} km overland. Check Google Maps for exact time.`,
    });
  }

  return results;
}

/** Return only available modes */
export function getAvailableModes(originIata: string, destinationIata: string): TransportMode[] {
  return getTransportAvailability(originIata, destinationIata)
    .filter((m) => m.available)
    .map((m) => m.mode);
}
```

- [ ] **Step 4: Create `frontend/src/components/AirportSearch.tsx`**

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import type { AirportRecord } from "@/types/trip";
import airportsData from "@/data/airports.json";

const airports: AirportRecord[] = airportsData as AirportRecord[];

interface Props {
  label: string;
  value: string; // stored IATA code
  onChange: (iata: string, airport: AirportRecord) => void;
  placeholder?: string;
  required?: boolean;
}

function filterAirports(query: string): AirportRecord[] {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  return airports
    .filter(
      (a) =>
        a.iata.toLowerCase().startsWith(q) ||
        a.city.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q)
    )
    .slice(0, 8);
}

export function AirportSearch({ label, value, onChange, placeholder = "Search city or airport...", required }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<AirportRecord[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Display name when a code is stored
  const selectedAirport = airports.find((a) => a.iata === value);
  const displayValue = selectedAirport
    ? `${selectedAirport.city} (${selectedAirport.iata})`
    : query;

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    setResults(filterAirports(val));
    setOpen(true);
  }

  function handleSelect(airport: AirportRecord) {
    onChange(airport.iata, airport);
    setQuery("");
    setOpen(false);
  }

  function handleFocus() {
    if (query.length >= 2) setOpen(true);
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        value={open ? query : displayValue}
        onChange={handleInput}
        onFocus={handleFocus}
        placeholder={placeholder}
        required={required}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {value && !open && (
        <span className="absolute right-3 top-9 text-xs text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
          {value}
        </span>
      )}
      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {results.map((airport) => (
            <li
              key={airport.iata}
              onMouseDown={() => handleSelect(airport)}
              className="flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 cursor-pointer text-sm"
            >
              <span className="font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-xs flex-shrink-0">
                {airport.iata}
              </span>
              <div className="min-w-0">
                <div className="font-medium text-gray-800 truncate">{airport.name}</div>
                <div className="text-xs text-gray-400">{airport.city}, {airport.country}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/data/ frontend/src/utils/ frontend/src/components/AirportSearch.tsx
git commit -m "feat: airport database, ferry routes, transport availability utils, AirportSearch combobox"
```

---

### Task 4: Collapsible Left Sidebar <!-- NEW: added for sidebar navigation -->

**Files:**
- Create: `frontend/src/components/Sidebar.tsx`
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Create `frontend/src/components/Sidebar.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTripContext } from "@/context/TripContext";
import type { TransportMode } from "@/types/trip";

const MODE_ICON: Record<TransportMode, string> = {
  flight: "✈",
  train: "🚂",
  ferry: "⛴",
  car: "🚗",
};

const STEPS = [
  { label: "Trip Setup", href: "/", icon: "🗺" },
  { label: "Segments", href: "/segments", icon: "🛫" },
  { label: "Hotels", href: "/hotels", icon: "🏨" },
  { label: "Itinerary", href: "/itinerary", icon: "📅" },
  { label: "Export", href: "/export", icon: "📄" },
];

export function Sidebar() {
  const [expanded, setExpanded] = useState(true);
  const pathname = usePathname();
  const { state } = useTripContext();
  const { tripContext } = state;

  const currentIndex = STEPS.findIndex((s) => s.href === pathname);

  // Running total cost
  const totalCost = tripContext.legs.reduce((sum, leg) => {
    const flight = leg.selected_flight?.price ?? 0;
    const hotels = leg.hotel_stays.reduce((h, s) => {
      const nights =
        s.check_in && s.check_out
          ? Math.max(
              1,
              Math.round(
                (new Date(s.check_out).getTime() - new Date(s.check_in).getTime()) /
                  86400000
              )
            )
          : 1;
      return h + s.hotel.price_per_night * nights;
    }, 0);
    return sum + flight + hotels;
  }, 0);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-gray-900 text-white transition-all duration-300 flex-shrink-0 ${
          expanded ? "w-[220px]" : "w-[44px]"
        }`}
      >
        {/* Toggle button */}
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center justify-end px-2 py-3 hover:bg-gray-800 transition-colors"
          title={expanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          <span className="text-gray-400 text-sm">{expanded ? "◀" : "▶"}</span>
        </button>

        {/* Step navigation */}
        <nav className="flex-1 overflow-y-auto">
          <ul className="space-y-1 px-1">
            {STEPS.map((step, i) => {
              const isCompleted = i < currentIndex;
              const isCurrent = i === currentIndex;
              return (
                <li key={step.href}>
                  <Link
                    href={step.href}
                    className={`flex items-center gap-3 px-2 py-2.5 rounded-lg transition-colors text-sm ${
                      isCurrent
                        ? "bg-blue-600 text-white"
                        : isCompleted
                        ? "text-green-400 hover:bg-gray-800"
                        : "text-gray-500 pointer-events-none"
                    }`}
                    title={!expanded ? step.label : undefined}
                  >
                    <span className="text-base flex-shrink-0 w-5 text-center">
                      {isCompleted ? "✓" : step.icon}
                    </span>
                    {expanded && (
                      <span className="truncate font-medium">{step.label}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Trip summary — only when expanded */}
        {expanded && tripContext.legs.length > 0 && (
          <div className="border-t border-gray-700 px-3 py-3 space-y-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Trip Summary</p>
            {tripContext.legs.map((leg) => (
              <div key={leg.leg_number} className="text-xs text-gray-300 space-y-0.5">
                <div className="flex items-center gap-1.5 font-medium">
                  <span>{MODE_ICON[leg.transport_mode ?? "flight"]}</span>
                  <span>{leg.origin} → {leg.destination}</span>
                </div>
                {leg.selected_flight && (
                  <div className="text-gray-400 pl-4">
                    {leg.selected_flight.currency} {leg.selected_flight.price.toLocaleString()}
                  </div>
                )}
                {leg.hotel_stays.map((s, i) => (
                  <div key={i} className="text-gray-400 pl-4 flex items-center gap-1">
                    <span>🏨</span>
                    <span className="truncate">{s.hotel.name}</span>
                  </div>
                ))}
              </div>
            ))}
            {totalCost > 0 && (
              <div className="border-t border-gray-700 pt-2">
                <p className="text-xs text-gray-300">
                  <span className="text-gray-400">Est. total: </span>
                  <span className="font-bold text-white">${totalCost.toLocaleString()}</span>
                </p>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Mobile top bar (hamburger opens sidebar as bottom sheet) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-gray-900 border-t border-gray-700">
        <div className="flex items-center justify-around py-2">
          {STEPS.map((step, i) => {
            const isCompleted = i < currentIndex;
            const isCurrent = i === currentIndex;
            return (
              <Link
                key={step.href}
                href={step.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-xs ${
                  isCurrent
                    ? "text-blue-400"
                    : isCompleted
                    ? "text-green-400"
                    : "text-gray-600 pointer-events-none"
                }`}
              >
                <span className="text-base">{isCompleted ? "✓" : step.icon}</span>
                <span>{step.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Create `frontend/src/components/Stepper.tsx`** (kept for compatibility — now a thin wrapper)

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const STEPS = [
  { label: "Trip Setup", href: "/" },
  { label: "Segments", href: "/segments" },
  { label: "Hotels", href: "/hotels" },
  { label: "Itinerary", href: "/itinerary" },
  { label: "Export", href: "/export" },
];

export function Stepper() {
  const pathname = usePathname();
  const currentIndex = STEPS.findIndex((s) => s.href === pathname);

  return (
    <nav className="w-full bg-white border-b border-gray-200 px-6 py-3 md:hidden">
      <ol className="flex items-center gap-2 max-w-4xl mx-auto overflow-x-auto">
        {STEPS.map((step, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <li key={step.href} className="flex items-center gap-2 flex-shrink-0">
              <Link
                href={step.href}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                  isCurrent
                    ? "text-blue-600"
                    : isCompleted
                    ? "text-green-600 hover:text-green-700"
                    : "text-gray-400 pointer-events-none"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isCurrent
                      ? "bg-blue-600 text-white"
                      : isCompleted
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {isCompleted ? "✓" : i + 1}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
              </Link>
              {i < STEPS.length - 1 && (
                <span className="text-gray-300 mx-1">›</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
```

- [ ] **Step 3: Update `frontend/src/app/layout.tsx`**

<!-- MODIFIED: sidebar wraps main content; mobile bottom nav padding added -->

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TripContextProvider } from "@/context/TripContext";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Travel Agent Assistant",
  description: "AI-powered trip planner",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <TripContextProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            {/* Main content: pb-20 on mobile to clear the bottom nav bar */}
            <main className="flex-1 min-w-0 px-4 py-8 pb-24 md:pb-8 max-w-5xl">
              {children}
            </main>
          </div>
        </TripContextProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Start dev server and verify layout renders**

```bash
npm run dev
```

Open http://localhost:3000. You should see the collapsible sidebar on the left (desktop) and a bottom nav on mobile (375px width). Click the collapse button — sidebar shrinks to 44px icon-only mode.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/layout.tsx frontend/src/components/Sidebar.tsx frontend/src/components/Stepper.tsx
git commit -m "feat: collapsible left Sidebar with trip summary + mobile bottom nav"
```

---

### Task 5: Step 1 — Trip Setup (with AirportSearch + multi-destination leg builder)

**Files:**
- Modify: `frontend/src/app/page.tsx`

<!-- MODIFIED: raw IATA inputs replaced with AirportSearch combobox; multi-destination checkbox + leg builder added -->

- [ ] **Step 1: Create `frontend/src/app/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTripContext } from "@/context/TripContext";
import { AirportSearch } from "@/components/AirportSearch";
import { getTransportAvailability } from "@/utils/transportAvailability";
import type { AirportRecord, TransportMode } from "@/types/trip";

interface LegDraft {
  origin: string;
  destination: string;
  departure_date: string;
  transport_mode: TransportMode;
}

const MODE_LABELS: Record<TransportMode, string> = {
  flight: "✈ Flight",
  train: "🚂 Train",
  ferry: "⛴ Ferry",
  car: "🚗 Car",
};

export default function TripSetupPage() {
  const router = useRouter();
  const { dispatch } = useTripContext();

  const [homeOrigin, setHomeOrigin] = useState("");
  const [homeAirport, setHomeAirport] = useState<AirportRecord | null>(null);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [multiDest, setMultiDest] = useState(false);

  // Single-destination mode
  const [singleDest, setSingleDest] = useState("");
  const [singleDestAirport, setSingleDestAirport] = useState<AirportRecord | null>(null);
  const [singleDate, setSingleDate] = useState("");
  const [returnDate, setReturnDate] = useState("");

  // Multi-destination mode
  const [legs, setLegs] = useState<LegDraft[]>([
    { origin: "", destination: "", departure_date: "", transport_mode: "flight" },
  ]);

  function handleHomeChange(iata: string, airport: AirportRecord) {
    setHomeOrigin(iata);
    setHomeAirport(airport);
    // Update first leg origin in multi-dest mode
    setLegs((prev) => [{ ...prev[0], origin: iata }, ...prev.slice(1)]);
  }

  function updateLeg(index: number, partial: Partial<LegDraft>) {
    setLegs((prev) => prev.map((l, i) => (i === index ? { ...l, ...partial } : l)));
  }

  function addLeg() {
    const lastLeg = legs[legs.length - 1];
    setLegs((prev) => [
      ...prev,
      { origin: lastLeg.destination, destination: "", departure_date: "", transport_mode: "flight" },
    ]);
  }

  function removeLeg(index: number) {
    setLegs((prev) => prev.filter((_, i) => i !== index));
  }

  function getLegAvailability(leg: LegDraft) {
    if (!leg.origin || !leg.destination) return [];
    return getTransportAvailability(leg.origin, leg.destination);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    dispatch({
      type: "INIT_TRIP",
      payload: { home_origin: homeOrigin, adults, children },
    });

    if (multiDest) {
      legs.forEach((leg, i) => {
        dispatch({
          type: "ADD_LEG",
          payload: {
            leg_number: i + 1,
            origin: leg.origin.toUpperCase(),
            destination: leg.destination.toUpperCase(),
            departure_date: leg.departure_date,
            transport_mode: leg.transport_mode,
            hotel_stays: [],
            days: [],
          },
        });
      });
    } else {
      dispatch({
        type: "ADD_LEG",
        payload: {
          leg_number: 1,
          origin: homeOrigin.toUpperCase(),
          destination: singleDest.toUpperCase(),
          departure_date: singleDate,
          transport_mode: "flight",
          hotel_stays: [],
          days: [],
        },
      });
    }

    router.push("/segments");
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Plan Your Trip</h1>
      <p className="text-gray-500 mb-8">Tell us where you're going to get started.</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-5">
        {/* Home airport */}
        <AirportSearch
          label="Home Airport"
          value={homeOrigin}
          onChange={handleHomeChange}
          placeholder="Search your home airport..."
          required
        />

        {/* Traveller count */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adults</label>
            <input
              type="number"
              value={adults}
              onChange={(e) => setAdults(Number(e.target.value))}
              min={1} max={9} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Children</label>
            <input
              type="number"
              value={children}
              onChange={(e) => setChildren(Number(e.target.value))}
              min={0} max={9}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Multi-destination toggle */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={multiDest}
            onChange={(e) => setMultiDest(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <span className="text-sm font-medium text-gray-700">Multi-destination trip</span>
        </label>

        {/* Single destination mode */}
        {!multiDest && (
          <div className="space-y-4">
            <AirportSearch
              label="First Destination"
              value={singleDest}
              onChange={(iata, airport) => { setSingleDest(iata); setSingleDestAirport(airport); }}
              placeholder="Search destination city or airport..."
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Departure Date</label>
                <input
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Return Date</label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Multi-destination leg builder */}
        {multiDest && (
          <div className="space-y-4">
            {legs.map((leg, i) => {
              const availability = getLegAvailability(leg);
              return (
                <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">Leg {i + 1}</h3>
                    {legs.length > 1 && (
                      <button type="button" onClick={() => removeLeg(i)}
                        className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <AirportSearch
                      label="From"
                      value={leg.origin}
                      onChange={(iata) => updateLeg(i, { origin: iata })}
                      placeholder="Origin..."
                      required
                    />
                    <AirportSearch
                      label="To"
                      value={leg.destination}
                      onChange={(iata) => updateLeg(i, { destination: iata })}
                      placeholder="Destination..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={leg.departure_date}
                      onChange={(e) => updateLeg(i, { departure_date: e.target.value })}
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Transport mode selector */}
                  {leg.origin && leg.destination && availability.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Transport Mode</label>
                      <div className="flex flex-wrap gap-2">
                        {availability.map(({ mode, available, hint }) => (
                          <div key={mode} className="flex flex-col items-start gap-1">
                            <button
                              type="button"
                              disabled={!available}
                              onClick={() => updateLeg(i, { transport_mode: mode })}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                                leg.transport_mode === mode
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : available
                                  ? "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                                  : "bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed"
                              }`}
                              title={hint}
                            >
                              {MODE_LABELS[mode]}
                            </button>
                          </div>
                        ))}
                      </div>
                      {/* Show hint for selected mode */}
                      {(() => {
                        const selected = availability.find((a) => a.mode === leg.transport_mode);
                        return selected ? (
                          <p className="text-xs text-gray-500 mt-1">{selected.hint}</p>
                        ) : null;
                      })()}
                    </div>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              onClick={addLeg}
              className="w-full border border-dashed border-gray-300 rounded-xl py-2.5 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              + Add Another Leg
            </button>
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          Start Planning →
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Open http://localhost:3000 — test airport search (type "New York" → see JFK/LGA/EWR). Enable multi-destination → add two legs, observe transport mode buttons appear with availability hints. Click "Start Planning".

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/page.tsx
git commit -m "feat: Step 1 trip setup — AirportSearch combobox + multi-destination leg builder with transport mode"
```

---

### Task 6: Step 2 — Travel Segments (replaces Flights page)

**Files:**
- Create: `frontend/src/components/flights/FlightCard.tsx` (with AI Pick explanation panel)
- Create: `frontend/src/components/flights/FlightSearchForm.tsx`
- Create: `frontend/src/components/segments/TrainSegmentCard.tsx` <!-- NEW -->
- Create: `frontend/src/components/segments/FerrySegmentCard.tsx` <!-- NEW -->
- Create: `frontend/src/components/segments/CarSegmentCard.tsx` <!-- NEW -->
- Create: `frontend/src/app/segments/page.tsx` <!-- NEW: renamed from /flights -->

<!-- MODIFIED: FlightCard now shows expandable "AI Pick — Why?" panel when ai_recommended=true -->

- [ ] **Step 1: Create `frontend/src/components/flights/FlightCard.tsx`**

```tsx
"use client";

import { useState } from "react";
import type { FlightOffer } from "@/types/trip";

interface Props {
  offer: FlightOffer;
  selected: boolean;
  onSelect: (offer: FlightOffer) => void;
}

export function FlightCard({ offer, selected, onSelect }: Props) {
  const [showReason, setShowReason] = useState(false);
  const seg = offer.segments[0];
  const lastSeg = offer.segments[offer.segments.length - 1];

  return (
    <div
      onClick={() => onSelect(offer)}
      className={`relative border rounded-xl p-4 cursor-pointer transition-all ${
        selected
          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500"
          : "border-gray-200 bg-white hover:border-blue-300"
      }`}
    >
      {offer.ai_recommended && (
        <span className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          ✨ AI Pick
        </span>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <div className="text-center">
          <div className="text-lg font-bold">{seg.departure_airport}</div>
          <div className="text-xs text-gray-500">
            {new Date(seg.departure_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
        <div className="flex-1 min-w-[80px] text-center">
          <div className="text-xs text-gray-400">{offer.total_duration.replace("PT", "").toLowerCase()}</div>
          <div className="border-t border-gray-300 relative my-1">
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-gray-400 text-xs bg-white px-1">
              {offer.stops === 0 ? "Direct" : `${offer.stops} stop${offer.stops > 1 ? "s" : ""}`}
            </span>
          </div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold">{lastSeg.arrival_airport}</div>
          <div className="text-xs text-gray-500">
            {new Date(lastSeg.arrival_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
        <div className="text-right ml-auto">
          <div className="text-xl font-bold text-gray-900">
            {offer.currency} {offer.price.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">per person</div>
        </div>
      </div>

      {/* AI Pick explanation panel — NEW -->
      {offer.ai_recommended && offer.ai_reason && (
        <div className="mt-3 border-t border-blue-100 pt-2">
          <button
            onClick={(e) => { e.stopPropagation(); setShowReason((r) => !r); }}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            <span>✨ AI Pick — Why?</span>
            <span>{showReason ? "▲" : "▼"}</span>
          </button>
          {showReason && (
            <p className="mt-2 text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-2 leading-relaxed">
              {offer.ai_reason}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `frontend/src/components/flights/FlightSearchForm.tsx`**

```tsx
"use client";

import { useState } from "react";
import type { TripLeg } from "@/types/trip";

interface Props {
  leg: TripLeg;
  onSearch: (params: { origin: string; destination: string; departure_date: string }) => void;
  loading: boolean;
}

export function FlightSearchForm({ leg, onSearch, loading }: Props) {
  const [form, setForm] = useState({
    origin: leg.origin,
    destination: leg.destination,
    departure_date: leg.departure_date,
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
        <input
          name="origin"
          value={form.origin}
          onChange={handleChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
        <input
          name="destination"
          value={form.destination}
          onChange={handleChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
        <input
          type="date"
          name="departure_date"
          value={form.departure_date}
          onChange={handleChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <button
        onClick={() => onSearch(form)}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        {loading ? "Searching..." : "Search Flights"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Create `frontend/src/components/segments/TrainSegmentCard.tsx`** <!-- NEW -->

```tsx
import type { TripLeg } from "@/types/trip";

interface Props {
  leg: TripLeg;
}

export function TrainSegmentCard({ leg }: Props) {
  return (
    <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🚂</span>
        <div>
          <h3 className="font-semibold text-gray-800">
            {leg.origin} → {leg.destination}
          </h3>
          <p className="text-sm text-gray-500">{leg.departure_date}</p>
        </div>
      </div>
      <p className="text-sm text-gray-600">
        Rail is recommended for this route. Search for tickets on one of these platforms:
      </p>
      <div className="flex flex-wrap gap-2">
        <a
          href={`https://www.thetrainline.com`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs bg-white border border-emerald-300 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
        >
          Trainline ↗
        </a>
        <a
          href={`https://www.eurail.com`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs bg-white border border-emerald-300 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
        >
          Eurail ↗
        </a>
        <a
          href={`https://www.omio.com`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs bg-white border border-emerald-300 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
        >
          Omio ↗
        </a>
      </div>
      <p className="text-xs text-gray-400 italic">
        Tip: Book at least 3 weeks ahead for best prices. Many European routes have sleeper options.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Create `frontend/src/components/segments/FerrySegmentCard.tsx`** <!-- NEW -->

```tsx
import type { TripLeg } from "@/types/trip";
import ferryRoutesData from "@/data/ferry_routes.json";

interface FerryRoute {
  id: string;
  origin_iata: string;
  destination_iata: string;
  origin_city: string;
  destination_city: string;
  operator: string;
  crossing_mins: number;
}

const ferryRoutes: FerryRoute[] = ferryRoutesData as FerryRoute[];

interface Props {
  leg: TripLeg;
}

export function FerrySegmentCard({ leg }: Props) {
  const route = ferryRoutes.find(
    (r) =>
      (r.origin_iata === leg.origin && r.destination_iata === leg.destination) ||
      (r.origin_iata === leg.destination && r.destination_iata === leg.origin)
  );

  const crossingHours = route
    ? `~${Math.floor(route.crossing_mins / 60)}h ${route.crossing_mins % 60 ? `${route.crossing_mins % 60}m` : ""}`.trim()
    : "varies";

  return (
    <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-2xl">⛴</span>
        <div>
          <h3 className="font-semibold text-gray-800">
            {route ? `${route.origin_city} → ${route.destination_city}` : `${leg.origin} → ${leg.destination}`}
          </h3>
          <p className="text-sm text-gray-500">{leg.departure_date} · Crossing: {crossingHours}</p>
        </div>
      </div>
      {route && (
        <p className="text-sm text-gray-600">
          Operator: <span className="font-medium">{route.operator}</span>
        </p>
      )}
      <p className="text-sm text-gray-600">
        Book directly with the ferry operator. Cabin options available on overnight crossings.
      </p>
      <div className="flex flex-wrap gap-2">
        {route && (
          <a
            href={`https://www.google.com/search?q=${encodeURIComponent(route.operator + " ferry tickets")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-white border border-blue-300 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
          >
            {route.operator} ↗
          </a>
        )}
        <a
          href={`https://www.directferries.com`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs bg-white border border-blue-300 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
        >
          DirectFerries ↗
        </a>
      </div>
      <p className="text-xs text-gray-400 italic">
        Tip: If this is an overnight ferry, consider booking a cabin — it saves a hotel night.
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Create `frontend/src/components/segments/CarSegmentCard.tsx`** <!-- NEW -->

```tsx
"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import type { TripLeg } from "@/types/trip";
import airportsData from "@/data/airports.json";
import type { AirportRecord } from "@/types/trip";

const airports: AirportRecord[] = airportsData as AirportRecord[];

interface Props {
  leg: TripLeg;
}

function getAirport(iata: string): AirportRecord | undefined {
  return airports.find((a) => a.iata.toUpperCase() === iata.toUpperCase());
}

export function CarSegmentCard({ leg }: Props) {
  const [driveInfo, setDriveInfo] = useState<{ distance_km: number | null; travel_time_mins: number | null } | null>(null);
  const [loading, setLoading] = useState(false);

  const originAirport = getAirport(leg.origin);
  const destAirport = getAirport(leg.destination);

  useEffect(() => {
    if (!originAirport || !destAirport) return;
    setLoading(true);
    api
      .getDriveTime({
        origin: `${originAirport.lat},${originAirport.lng}`,
        destination: `${destAirport.lat},${destAirport.lng}`,
        mode: "driving",
      })
      .then(setDriveInfo)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [leg.origin, leg.destination]);

  const mapsUrl =
    originAirport && destAirport
      ? `https://www.google.com/maps/dir/${originAirport.lat},${originAirport.lng}/${destAirport.lat},${destAirport.lng}/`
      : `https://www.google.com/maps/dir/${leg.origin}/${leg.destination}/`;

  const hours = driveInfo?.travel_time_mins ? Math.floor(driveInfo.travel_time_mins / 60) : null;
  const mins = driveInfo?.travel_time_mins ? driveInfo.travel_time_mins % 60 : null;
  const timeStr = hours != null ? `${hours}h${mins ? ` ${mins}m` : ""}` : null;

  return (
    <div className="border border-orange-200 bg-orange-50 rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🚗</span>
        <div>
          <h3 className="font-semibold text-gray-800">
            {originAirport?.city ?? leg.origin} → {destAirport?.city ?? leg.destination}
          </h3>
          <p className="text-sm text-gray-500">{leg.departure_date}</p>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-400">Calculating drive time...</p>}
      {!loading && driveInfo && (
        <div className="flex flex-wrap gap-4 text-sm">
          {timeStr && (
            <span className="font-medium text-gray-800">Drive time: {timeStr}</span>
          )}
          {driveInfo.distance_km && (
            <span className="text-gray-600">Distance: {driveInfo.distance_km} km</span>
          )}
        </div>
      )}

      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs bg-white border border-orange-300 text-orange-700 px-3 py-1.5 rounded-lg hover:bg-orange-100 transition-colors"
      >
        Open in Google Maps ↗
      </a>
      <p className="text-xs text-gray-400 italic">
        Tip: Check traffic conditions and rest stops for drives over 3 hours.
      </p>
    </div>
  );
}
```

- [ ] **Step 6: Create `frontend/src/app/segments/page.tsx`** <!-- NEW: replaces /flights -->

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTripContext } from "@/context/TripContext";
import { api } from "@/services/api";
import { FlightSearchForm } from "@/components/flights/FlightSearchForm";
import { FlightCard } from "@/components/flights/FlightCard";
import { TrainSegmentCard } from "@/components/segments/TrainSegmentCard";
import { FerrySegmentCard } from "@/components/segments/FerrySegmentCard";
import { CarSegmentCard } from "@/components/segments/CarSegmentCard";
import type { FlightOffer, TripLeg } from "@/types/trip";

export default function SegmentsPage() {
  const router = useRouter();
  const { state, dispatch } = useTripContext();
  const { tripContext } = state;

  const [results, setResults] = useState<Record<number, FlightOffer[]>>({});
  const [loading, setLoading] = useState<Record<number, boolean>>({});

  async function handleSearch(leg: TripLeg) {
    setLoading((prev) => ({ ...prev, [leg.leg_number]: true }));
    try {
      const offers = await api.searchFlights({
        trip_context: tripContext,
        leg_number: leg.leg_number,
        origin: leg.origin,
        destination: leg.destination,
        departure_date: leg.departure_date,
        adults: tripContext.adults,
      });
      setResults((prev) => ({ ...prev, [leg.leg_number]: offers }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading((prev) => ({ ...prev, [leg.leg_number]: false }));
    }
  }

  function handleSelectFlight(leg_number: number, offer: FlightOffer) {
    dispatch({ type: "SET_FLIGHT", payload: { leg_number, flight: offer } });
  }

  const MODE_ICONS: Record<string, string> = {
    flight: "✈",
    train: "🚂",
    ferry: "⛴",
    car: "🚗",
  };

  // A leg is "satisfied" if: flight mode → flight selected; other modes → just need mode set
  const allLegsSatisfied = tripContext.legs.every((l) => {
    const mode = l.transport_mode ?? "flight";
    if (mode === "flight") return !!l.selected_flight;
    return true; // train/ferry/car legs don't need an API selection
  });

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Travel Segments</h1>
        <p className="text-gray-500 mt-1">
          Select or confirm how you'll travel for each leg of your trip.
        </p>
      </div>

      {tripContext.legs.map((leg) => {
        const mode = leg.transport_mode ?? "flight";
        return (
          <div key={leg.leg_number} className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <span>{MODE_ICONS[mode]}</span>
              Leg {leg.leg_number}: {leg.origin} → {leg.destination}
              <span className="text-sm font-normal text-gray-400">{leg.departure_date}</span>
            </h2>

            {mode === "flight" && (
              <>
                <FlightSearchForm
                  leg={leg}
                  onSearch={(params) => handleSearch({ ...leg, ...params })}
                  loading={loading[leg.leg_number] ?? false}
                />
                {(results[leg.leg_number] ?? []).map((offer) => (
                  <FlightCard
                    key={offer.id}
                    offer={offer}
                    selected={leg.selected_flight?.id === offer.id}
                    onSelect={(o) => handleSelectFlight(leg.leg_number, o)}
                  />
                ))}
                {leg.selected_flight && (
                  <p className="text-green-600 text-sm font-medium">✓ Flight selected</p>
                )}
              </>
            )}

            {mode === "train" && <TrainSegmentCard leg={leg} />}
            {mode === "ferry" && <FerrySegmentCard leg={leg} />}
            {mode === "car" && <CarSegmentCard leg={leg} />}
          </div>
        );
      })}

      <button
        onClick={() => router.push("/hotels")}
        disabled={!allLegsSatisfied}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-lg transition-colors"
      >
        Continue to Hotels →
      </button>
    </div>
  );
}
```

- [ ] **Step 7: Verify in browser**

Navigate to http://localhost:3000/segments. Flight legs show the search form. Train/ferry/car legs show the appropriate info card. AI Pick cards show the expandable "Why?" panel.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/segments/ frontend/src/components/flights/ frontend/src/components/segments/
git commit -m "feat: Step 2 Travel Segments — flight/train/ferry/car cards with AI Pick explanation panels"
```

---

### Task 7: Step 3 — Hotel Stays (with ferry cabin / sleeper train awareness)

**Files:**
- Create: `frontend/src/components/hotels/HotelCard.tsx` (with AI Pick explanation panel)
- Create: `frontend/src/components/hotels/HotelSearchForm.tsx`
- Create: `frontend/src/app/hotels/page.tsx`

<!-- MODIFIED: HotelCard shows AI Pick explanation; hotels page skips hotel search for ferry_cabin/sleeper_train legs -->

- [ ] **Step 1: Create `frontend/src/components/hotels/HotelCard.tsx`**

```tsx
"use client";

import { useState } from "react";
import type { HotelOffer } from "@/types/trip";

interface Props {
  offer: HotelOffer;
  selected: boolean;
  onSelect: (offer: HotelOffer) => void;
}

export function HotelCard({ offer, selected, onSelect }: Props) {
  const [showReason, setShowReason] = useState(false);
  const stars = offer.rating ? "★".repeat(Math.round(offer.rating)) : "";

  return (
    <div
      onClick={() => onSelect(offer)}
      className={`relative border rounded-xl p-4 cursor-pointer transition-all ${
        selected
          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500"
          : "border-gray-200 bg-white hover:border-blue-300"
      }`}
    >
      {offer.ai_recommended && (
        <span className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          ✨ AI Pick
        </span>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-gray-900">{offer.name}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{offer.address}</p>
          {offer.rating && (
            <p className="text-sm text-amber-500 mt-1">
              {stars} <span className="text-gray-500">({offer.rating})</span>
            </p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-xl font-bold text-gray-900">
            {offer.currency} {offer.price_per_night.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">per night</div>
        </div>
      </div>

      {/* AI Pick explanation panel — NEW -->
      {offer.ai_recommended && offer.ai_reason && (
        <div className="mt-3 border-t border-blue-100 pt-2">
          <button
            onClick={(e) => { e.stopPropagation(); setShowReason((r) => !r); }}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            <span>✨ AI Pick — Why?</span>
            <span>{showReason ? "▲" : "▼"}</span>
          </button>
          {showReason && (
            <p className="mt-2 text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-2 leading-relaxed">
              {offer.ai_reason}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `frontend/src/components/hotels/HotelSearchForm.tsx`**

```tsx
"use client";

import { useState } from "react";

interface Props {
  defaultCity: string;
  onSearch: (params: { city_code: string; check_in: string; check_out: string }) => void;
  loading: boolean;
}

export function HotelSearchForm({ defaultCity, onSearch, loading }: Props) {
  const [form, setForm] = useState({ city_code: defaultCity, check_in: "", check_out: "" });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">City Code</label>
        <input
          name="city_code"
          value={form.city_code}
          onChange={handleChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Check-in</label>
        <input type="date" name="check_in" value={form.check_in} onChange={handleChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Check-out</label>
        <input type="date" name="check_out" value={form.check_out} onChange={handleChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <button onClick={() => onSearch(form)} disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium px-4 py-2 rounded-lg">
        {loading ? "Searching..." : "Search Hotels"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Create `frontend/src/app/hotels/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTripContext } from "@/context/TripContext";
import { api } from "@/services/api";
import { HotelSearchForm } from "@/components/hotels/HotelSearchForm";
import { HotelCard } from "@/components/hotels/HotelCard";
import type { HotelOffer, TripLeg } from "@/types/trip";

function getAccommodationInfo(leg: TripLeg): { skip: boolean; label: string } {
  const mode = leg.transport_mode ?? "flight";
  // Check if any hotel stay is ferry_cabin or sleeper_train
  const hasFerryCabin = leg.hotel_stays.some((s) => s.accommodation_type === "ferry_cabin");
  const hasSleeperTrain = leg.hotel_stays.some((s) => s.accommodation_type === "sleeper_train");
  if (mode === "ferry") return { skip: true, label: "Overnight ferry — cabin included. No separate hotel needed." };
  if (mode === "train" && hasSleeperTrain) return { skip: true, label: "Sleeper train booked. No hotel needed for this night." };
  return { skip: false, label: "" };
}

export default function HotelsPage() {
  const router = useRouter();
  const { state, dispatch } = useTripContext();
  const { tripContext } = state;

  const [results, setResults] = useState<Record<number, HotelOffer[]>>({});
  const [loading, setLoading] = useState<Record<number, boolean>>({});

  async function handleSearch(
    leg_number: number,
    params: { city_code: string; check_in: string; check_out: string }
  ) {
    setLoading((prev) => ({ ...prev, [leg_number]: true }));
    try {
      const offers = await api.searchHotels({
        trip_context: tripContext,
        leg_number,
        ...params,
        adults: tripContext.adults,
      });
      setResults((prev) => ({ ...prev, [leg_number]: offers }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading((prev) => ({ ...prev, [leg_number]: false }));
    }
  }

  function handleSelectHotel(
    leg_number: number,
    offer: HotelOffer,
    check_in: string,
    check_out: string
  ) {
    dispatch({
      type: "ADD_HOTEL_STAY",
      payload: { leg_number, stay: { hotel: offer, check_in, check_out } },
    });
  }

  const allLegsHandled = tripContext.legs.every((l) => {
    const { skip } = getAccommodationInfo(l);
    return skip || l.hotel_stays.length > 0;
  });

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hotel Stays</h1>
        <p className="text-gray-500 mt-1">
          Find hotels for each destination. Ferry and sleeper train legs don't need a hotel.
        </p>
      </div>

      {tripContext.legs.map((leg) => {
        const { skip, label } = getAccommodationInfo(leg);
        return (
          <div key={leg.leg_number} className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-800">
              Leg {leg.leg_number}: {leg.destination}
            </h2>

            {skip ? (
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
                <span className="text-xl">
                  {(leg.transport_mode ?? "flight") === "ferry" ? "⛴" : "🚂"}
                </span>
                <span>{label}</span>
              </div>
            ) : (
              <>
                {leg.hotel_stays.length > 0 && (
                  <div className="space-y-2">
                    {leg.hotel_stays.map((stay, i) => (
                      <div key={i} className="flex flex-wrap items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm gap-2">
                        <span className="font-medium">🏨 {stay.hotel.name}</span>
                        <span className="text-gray-500">{stay.check_in} – {stay.check_out}</span>
                        <button
                          onClick={() => dispatch({ type: "REMOVE_HOTEL_STAY", payload: { leg_number: leg.leg_number, hotel_id: stay.hotel.id } })}
                          className="text-red-500 hover:text-red-700 ml-2"
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}

                <HotelSearchForm
                  defaultCity={leg.destination}
                  onSearch={(params) => handleSearch(leg.leg_number, params)}
                  loading={loading[leg.leg_number] ?? false}
                />

                {(results[leg.leg_number] ?? []).map((offer) => (
                  <HotelCard
                    key={offer.id}
                    offer={offer}
                    selected={leg.hotel_stays.some((s) => s.hotel.id === offer.id)}
                    onSelect={(o) => {
                      const checkIn = document.querySelector<HTMLInputElement>('[name="check_in"]')?.value ?? leg.departure_date;
                      const checkOut = document.querySelector<HTMLInputElement>('[name="check_out"]')?.value ?? "";
                      handleSelectHotel(leg.leg_number, o, checkIn, checkOut);
                    }}
                  />
                ))}
              </>
            )}
          </div>
        );
      })}

      <button
        onClick={() => router.push("/itinerary")}
        disabled={!allLegsHandled}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-lg transition-colors"
      >
        Continue to Itinerary →
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Verify in browser — navigate to `/hotels`, test hotel search, confirm ferry leg shows skip message**

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/hotels/ frontend/src/components/hotels/
git commit -m "feat: Step 3 hotel stays — AI Pick explanation panel, ferry cabin / sleeper train skip logic"
```

---

### Task 8: Step 4 — Day Planner with dnd-kit

**Files:**
- Create: `frontend/src/components/itinerary/DayItemCard.tsx`
- Create: `frontend/src/components/itinerary/DistanceConnector.tsx`
- Create: `frontend/src/components/itinerary/DayColumn.tsx`
- Create: `frontend/src/components/itinerary/DayPlanner.tsx`

- [ ] **Step 1: Create `frontend/src/components/itinerary/DayItemCard.tsx`**

```tsx
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DayItem } from "@/types/trip";

interface Props {
  item: DayItem;
  itemId: string;
  onRemove: () => void;
  pinned?: boolean;
}

const ICONS: Record<string, string> = {
  airport: "✈️",
  hotel: "🏨",
  poi: "📍",
};

export function DayItemCard({ item, itemId, onRemove, pinned = false }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: itemId, disabled: pinned });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 bg-white border rounded-lg px-3 py-2 text-sm ${
        pinned ? "border-blue-400 bg-blue-50" : "border-gray-200"
      } ${isDragging ? "shadow-lg z-50" : ""}`}
    >
      {!pinned && (
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab text-gray-300 hover:text-gray-500 select-none"
        >
          ⠿
        </span>
      )}
      <span>{ICONS[item.type] ?? "📍"}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-800 truncate">{item.name}</div>
        {item.duration_mins && (
          <div className="text-xs text-gray-400">{item.duration_mins} min</div>
        )}
        {/* NEW: spans_days indicator for overnight ferry/train items -->
        {item.spans_days && item.spans_days > 1 && (
          <div className="text-xs text-blue-500">spans {item.spans_days} days</div>
        )}
      </div>
      {!pinned && (
        <button
          onClick={onRemove}
          className="text-gray-300 hover:text-red-500 transition-colors ml-1 flex-shrink-0"
          title="Remove from itinerary"
        >
          ✕
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `frontend/src/components/itinerary/DistanceConnector.tsx`**

```tsx
interface Props {
  travel_time_mins?: number;
  distance_km?: number;
}

export function DistanceConnector({ travel_time_mins, distance_km }: Props) {
  if (!travel_time_mins && !distance_km) {
    return <div className="flex justify-center py-0.5 text-gray-200 text-xs">↓</div>;
  }
  return (
    <div className="flex items-center justify-center gap-1 py-0.5 text-xs text-blue-500">
      <span className="text-gray-300">↓</span>
      <span>
        {travel_time_mins != null && `${travel_time_mins} min`}
        {travel_time_mins != null && distance_km != null && " · "}
        {distance_km != null && `${distance_km} km`}
      </span>
    </div>
  );
}
```

- [ ] **Step 3: Create `frontend/src/components/itinerary/DayColumn.tsx`**

```tsx
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { DayPlan } from "@/types/trip";
import { DayItemCard } from "./DayItemCard";
import { DistanceConnector } from "./DistanceConnector";

interface Props {
  day: DayPlan;
  onRemoveItem: (dayNumber: number, index: number) => void;
}

export function DayColumn({ day, onRemoveItem }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${day.day_number}` });

  const itemIds = day.items.map((_, i) => `day-${day.day_number}-item-${i}`);

  return (
    <div className="border-b border-gray-100 pb-4 pt-3 px-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-orange-500">
          Day {day.day_number} — {day.date}
          <span className="text-gray-400 font-normal ml-2">{day.city}</span>
        </h3>
        <span className="text-xs text-gray-400">{day.items.length} stops</span>
      </div>

      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`space-y-0.5 min-h-[48px] rounded-lg transition-colors ${
            isOver ? "bg-blue-50 ring-1 ring-blue-300" : ""
          }`}
        >
          {day.items.map((item, i) => (
            <div key={itemIds[i]}>
              <DayItemCard
                item={item}
                itemId={itemIds[i]}
                pinned={item.type === "airport"}
                onRemove={() => onRemoveItem(day.day_number, i)}
              />
              {i < day.items.length - 1 && (
                <DistanceConnector
                  travel_time_mins={item.travel_time_to_next_mins}
                  distance_km={item.distance_to_next_km}
                />
              )}
            </div>
          ))}
        </div>
      </SortableContext>

      {day.items.length === 0 && (
        <div className="border border-dashed border-gray-200 rounded-lg p-3 text-center text-xs text-gray-400">
          Drop POIs here
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create `frontend/src/components/itinerary/DayPlanner.tsx`**

```tsx
"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useState } from "react";
import type { DayPlan, DayItem, POI } from "@/types/trip";
import { DayColumn } from "./DayColumn";
import { DayItemCard } from "./DayItemCard";

interface Props {
  days: DayPlan[];
  unscheduled: POI[];
  saved: POI[];
  onDaysChange: (days: DayPlan[]) => void;
  onMoveToPOIPool: (item: DayItem, fromDayNumber: number) => void;
}

function poiToDayItem(poi: POI): DayItem {
  return {
    type: "poi",
    name: poi.name,
    address: poi.address,
    lat: poi.lat,
    lng: poi.lng,
    duration_mins: poi.typical_visit_duration_mins,
  };
}

export function DayPlanner({ days, unscheduled, saved, onDaysChange, onMoveToPOIPool }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function parseItemId(id: string): { dayNumber: number; index: number } | null {
    const match = id.match(/^day-(\d+)-item-(\d+)$/);
    if (!match) return null;
    return { dayNumber: parseInt(match[1]), index: parseInt(match[2]) };
  }

  function parseUnscheduledId(id: string): number | null {
    const match = id.match(/^unscheduled-(\d+)$/);
    return match ? parseInt(match[1]) : null;
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeStr = String(active.id);
    const overStr = String(over.id);

    const unscheduledIndex = parseUnscheduledId(activeStr);
    if (unscheduledIndex !== null) {
      const dayMatch = overStr.match(/^day-(\d+)/);
      if (!dayMatch) return;
      const targetDayNum = parseInt(dayMatch[1]);
      const poi = unscheduled[unscheduledIndex];
      const newItem = poiToDayItem(poi);
      const updated = days.map((d) =>
        d.day_number === targetDayNum
          ? { ...d, items: [...d.items, newItem] }
          : d
      );
      onDaysChange(updated);
      return;
    }

    const activeParsed = parseItemId(activeStr);
    const overParsed = parseItemId(overStr);

    if (!activeParsed) return;

    const sourceDay = days.find((d) => d.day_number === activeParsed.dayNumber);
    if (!sourceDay) return;

    if (!overParsed) {
      const dayMatch = overStr.match(/^day-(\d+)$/);
      if (!dayMatch) return;
      const targetDayNum = parseInt(dayMatch[1]);
      if (targetDayNum === activeParsed.dayNumber) return;
      const item = sourceDay.items[activeParsed.index];
      if (item.type === "airport") return;

      const updated = days.map((d) => {
        if (d.day_number === activeParsed.dayNumber) {
          const newItems = [...d.items];
          newItems.splice(activeParsed.index, 1);
          return { ...d, items: newItems };
        }
        if (d.day_number === targetDayNum) {
          return { ...d, items: [...d.items, item] };
        }
        return d;
      });
      onDaysChange(updated);
      return;
    }

    if (activeParsed.dayNumber === overParsed.dayNumber) {
      const day = days.find((d) => d.day_number === activeParsed.dayNumber)!;
      const newItems = arrayMove(day.items, activeParsed.index, overParsed.index);
      onDaysChange(days.map((d) => (d.day_number === day.day_number ? { ...d, items: newItems } : d)));
    } else {
      const item = sourceDay.items[activeParsed.index];
      if (item.type === "airport") return;
      const updated = days.map((d) => {
        if (d.day_number === activeParsed.dayNumber) {
          const items = [...d.items];
          items.splice(activeParsed.index, 1);
          return { ...d, items };
        }
        if (d.day_number === overParsed.dayNumber) {
          const items = [...d.items];
          items.splice(overParsed.index, 0, item);
          return { ...d, items };
        }
        return d;
      });
      onDaysChange(updated);
    }
  }

  function handleRemoveItem(dayNumber: number, index: number) {
    const day = days.find((d) => d.day_number === dayNumber);
    if (!day) return;
    const item = day.items[index];
    onMoveToPOIPool(item, dayNumber);
    onDaysChange(
      days.map((d) =>
        d.day_number === dayNumber
          ? { ...d, items: d.items.filter((_, i) => i !== index) }
          : d
      )
    );
  }

  const activeItem = activeId ? (() => {
    const parsed = parseItemId(activeId);
    if (!parsed) return null;
    return days.find((d) => d.day_number === parsed.dayNumber)?.items[parsed.index] ?? null;
  })() : null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e) => setActiveId(String(e.active.id))} onDragEnd={handleDragEnd}>
      <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
        {days.map((day) => (
          <DayColumn
            key={day.day_number}
            day={day}
            onRemoveItem={handleRemoveItem}
          />
        ))}

        {unscheduled.length > 0 && (
          <div className="px-3 pt-3">
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Unscheduled</h4>
            <div className="space-y-1">
              {unscheduled.map((poi, i) => (
                <DayItemCard
                  key={`unscheduled-${i}`}
                  itemId={`unscheduled-${i}`}
                  item={poiToDayItem(poi)}
                  onRemove={() => {}}
                />
              ))}
            </div>
          </div>
        )}

        {saved.length > 0 && (
          <div className="px-3 pt-3">
            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Saved for later</h4>
            <div className="space-y-1 opacity-60">
              {saved.map((poi, i) => (
                <DayItemCard
                  key={`saved-${i}`}
                  itemId={`saved-poi-${i}`}
                  item={poiToDayItem(poi)}
                  onRemove={() => {}}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <DragOverlay>
        {activeItem && (
          <DayItemCard item={activeItem} itemId="overlay" onRemove={() => {}} />
        )}
      </DragOverlay>
    </DndContext>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/itinerary/
git commit -m "feat: dnd-kit DayPlanner with cross-day drag and drop — spans_days indicator"
```

---

### Task 9: Step 4 — Suggestions Sidebar & BusyTimesBar

**Files:**
- Create: `frontend/src/components/itinerary/BusyTimesBar.tsx`
- Create: `frontend/src/components/itinerary/SuggestionsSidebar.tsx`

- [ ] **Step 1: Create `frontend/src/components/itinerary/BusyTimesBar.tsx`**

```tsx
interface Props {
  busyTimes?: Record<string, number[]>;
  dayOfWeek: string; // e.g. "Monday"
}

export function BusyTimesBar({ busyTimes, dayOfWeek }: Props) {
  if (!busyTimes) {
    return <p className="text-xs text-gray-400 italic">Busyness data unavailable</p>;
  }

  const hours = busyTimes[dayOfWeek] ?? busyTimes[Object.keys(busyTimes)[0]] ?? [];
  const openHours = hours.slice(8, 22); // 8am–10pm

  const maxVal = Math.max(...openHours, 1);

  return (
    <div className="flex items-end gap-0.5 h-8 mt-1">
      {openHours.map((val, i) => (
        <div
          key={i}
          title={`${i + 8}:00 — ${Math.round((val / maxVal) * 100)}% busy`}
          className="flex-1 rounded-sm"
          style={{
            height: `${Math.max(4, (val / maxVal) * 100)}%`,
            backgroundColor:
              val > maxVal * 0.75
                ? "#ef4444"
                : val > maxVal * 0.4
                ? "#f97316"
                : "#22c55e",
          }}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `frontend/src/components/itinerary/SuggestionsSidebar.tsx`**

```tsx
"use client";

import { useDraggable } from "@dnd-kit/core";
import type { POI } from "@/types/trip";
import { BusyTimesBar } from "./BusyTimesBar";

interface POICardProps {
  poi: POI;
  index: number;
  added: boolean;
  tripDayOfWeek: string;
}

function SuggestionCard({ poi, index, added, tripDayOfWeek }: POICardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `suggestion-${index}`,
    disabled: added,
  });

  return (
    <div
      ref={setNodeRef}
      className={`border rounded-lg p-3 text-xs transition-all ${
        added
          ? "border-green-200 bg-green-50 opacity-60 cursor-not-allowed"
          : "border-blue-200 bg-white cursor-grab hover:border-blue-400"
      } ${isDragging ? "opacity-40" : ""}`}
    >
      <div className="flex items-start gap-2 mb-1">
        <span {...(!added ? { ...attributes, ...listeners } : {})} className="text-gray-300 text-base select-none">⠿</span>
        <div className="flex-1">
          <div className="font-semibold text-gray-800 text-sm">{poi.name}</div>
          <div className="text-gray-400">{poi.category}</div>
        </div>
        {added && <span className="text-green-600 text-xs font-medium">✓ Added</span>}
      </div>

      <p className="text-blue-600 italic ml-5 mb-1">"{poi.claude_note}"</p>

      <div className="ml-5 space-y-0.5">
        {poi.opening_hours && <p className="text-gray-500">🕐 {poi.opening_hours.split(";")[0]}</p>}
        {poi.rating && (
          <p className="text-gray-500">⭐ {poi.rating} · {poi.review_count?.toLocaleString()} reviews</p>
        )}
        {poi.price_level != null && (
          <p className="text-gray-500">{"$".repeat(poi.price_level) || "Free"}</p>
        )}
        {poi.booking_required && (
          <p className="text-amber-600 font-medium">📅 Advance booking required</p>
        )}
        {poi.claude_best_time && (
          <p className="text-green-600">⏰ {poi.claude_best_time}</p>
        )}
      </div>

      {poi.busy_times && (
        <div className="ml-5 mt-2">
          <p className="text-gray-400 mb-0.5">Busy times ({tripDayOfWeek}):</p>
          <BusyTimesBar busyTimes={poi.busy_times} dayOfWeek={tripDayOfWeek} />
        </div>
      )}
    </div>
  );
}

interface Props {
  pois: POI[];
  addedPOIIds: Set<string>;
  isOpen: boolean;
  onClose: () => void;
  tripDayOfWeek: string;
  loading: boolean;
}

export function SuggestionsSidebar({ pois, addedPOIIds, isOpen, onClose, tripDayOfWeek, loading }: Props) {
  if (!isOpen) return null;

  return (
    <div className="w-56 flex-shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 bg-blue-950 border-b border-blue-800">
        <div>
          <span className="text-blue-200 text-xs font-bold">✨ Claude's Picks</span>
          <p className="text-blue-400 text-[10px]">Drag to add to any day →</p>
        </div>
        <button onClick={onClose} className="text-blue-400 hover:text-white">✕</button>
      </div>

      <div className="overflow-y-auto flex-1 p-2 space-y-2">
        {loading && (
          <div className="text-center py-8 text-blue-400 text-sm">
            <div className="animate-spin text-2xl mb-2">✨</div>
            Generating suggestions...
          </div>
        )}
        {!loading && pois.map((poi, i) => (
          <SuggestionCard
            key={poi.id}
            poi={poi}
            index={i}
            added={addedPOIIds.has(poi.id)}
            tripDayOfWeek={tripDayOfWeek}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/itinerary/BusyTimesBar.tsx frontend/src/components/itinerary/SuggestionsSidebar.tsx
git commit -m "feat: SuggestionsSidebar with BusyTimesBar for POI planning"
```

---

### Task 10: Step 4 — Trip Map

**Files:**
- Create: `frontend/src/components/itinerary/TripMap.tsx`

- [ ] **Step 1: Create `frontend/src/components/itinerary/TripMap.tsx`**

```tsx
"use client";

import { APIProvider, Map, AdvancedMarker, Pin, useMap } from "@vis.gl/react-google-maps";
import { useEffect } from "react";
import type { DayPlan, POI } from "@/types/trip";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

const DAY_COLORS = [
  "#3b82f6", "#a855f7", "#f97316", "#10b981",
  "#ec4899", "#14b8a6", "#f59e0b", "#6366f1",
];

interface Props {
  days: DayPlan[];
  unscheduledPOIs: POI[];
  selectedDayNumber: number | null;
}

function PolylineLayer({ days, selectedDayNumber }: { days: DayPlan[]; selectedDayNumber: number | null }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !(window as any).google) return;

    const lines: google.maps.Polyline[] = [];
    const visibleDays = selectedDayNumber
      ? days.filter((d) => d.day_number === selectedDayNumber)
      : days;

    visibleDays.forEach((day) => {
      const color = DAY_COLORS[day.day_number % DAY_COLORS.length];
      day.items.forEach((item) => {
        if (!item.route_polyline_to_next) return;
        const path = google.maps.geometry.encoding.decodePath(item.route_polyline_to_next);
        const line = new google.maps.Polyline({
          path,
          strokeColor: color,
          strokeWeight: 3,
          strokeOpacity: 0.8,
          map,
        });
        lines.push(line);
      });
    });

    return () => lines.forEach((l) => l.setMap(null));
  }, [map, days, selectedDayNumber]);

  return null;
}

export function TripMap({ days, unscheduledPOIs, selectedDayNumber }: Props) {
  const visibleDays = selectedDayNumber
    ? days.filter((d) => d.day_number === selectedDayNumber)
    : days;

  const allItems = visibleDays.flatMap((d) => d.items);
  const center =
    allItems.length > 0
      ? { lat: allItems[0].lat, lng: allItems[0].lng }
      : { lat: 35.6762, lng: 139.6503 };

  return (
    <APIProvider apiKey={API_KEY} libraries={["geometry"]}>
      {/* Hide map on mobile (sm breakpoint), show on md+ */}
      <div className="hidden md:flex flex-col h-full">
        <Map
          mapId="trip-map"
          defaultCenter={center}
          defaultZoom={13}
          className="flex-1"
          gestureHandling="greedy"
          disableDefaultUI={false}
        >
          <PolylineLayer days={days} selectedDayNumber={selectedDayNumber} />

          {visibleDays.map((day) =>
            day.items.map((item, i) => {
              const color = DAY_COLORS[day.day_number % DAY_COLORS.length];
              return (
                <AdvancedMarker
                  key={`${day.day_number}-${i}`}
                  position={{ lat: item.lat, lng: item.lng }}
                  title={item.name}
                >
                  <Pin
                    background={item.type === "hotel" ? "#7c3aed" : item.type === "airport" ? "#f97316" : color}
                    borderColor="#fff"
                    glyphColor="#fff"
                    glyph={item.type === "hotel" ? "🏨" : item.type === "airport" ? "✈" : String(i + 1)}
                  />
                </AdvancedMarker>
              );
            })
          )}

          {unscheduledPOIs.map((poi) => (
            <AdvancedMarker
              key={`ghost-${poi.id}`}
              position={{ lat: poi.lat, lng: poi.lng }}
              title={poi.name}
            >
              <div
                className="w-4 h-4 rounded-full border-2 border-blue-400 bg-white opacity-40"
                title={poi.name}
              />
            </AdvancedMarker>
          ))}
        </Map>
      </div>
    </APIProvider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/itinerary/TripMap.tsx
git commit -m "feat: TripMap with Google Maps pins, route polylines, ghost pins — hidden on mobile"
```

---

### Task 11: Step 4 — Itinerary Page (wire everything together)

**Files:**
- Create: `frontend/src/app/itinerary/page.tsx`

- [ ] **Step 1: Create `frontend/src/app/itinerary/page.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTripContext } from "@/context/TripContext";
import { api } from "@/services/api";
import { DayPlanner } from "@/components/itinerary/DayPlanner";
import { SuggestionsSidebar } from "@/components/itinerary/SuggestionsSidebar";
import { TripMap } from "@/components/itinerary/TripMap";
import type { DayPlan, DayItem, POI } from "@/types/trip";

function buildInitialDays(legs: any[]): DayPlan[] {
  const days: DayPlan[] = [];
  let dayNumber = 1;
  for (const leg of legs) {
    const mode = leg.transport_mode ?? "flight";
    if (mode === "flight" && !leg.selected_flight) continue;

    let arrivalDate: string;
    let arrivalItems: DayItem[];

    if (mode === "flight" && leg.selected_flight) {
      const seg = leg.selected_flight.segments[0];
      arrivalDate = seg.arrival_time.split("T")[0];
      arrivalItems = [
        { type: "airport", name: `${seg.arrival_airport} Airport`, address: seg.arrival_airport, lat: 0, lng: 0 },
        ...leg.hotel_stays.map((s: any) => ({
          type: "hotel" as const,
          name: s.hotel.name,
          address: s.hotel.address,
          lat: s.hotel.lat,
          lng: s.hotel.lng,
        })),
      ];
    } else {
      // Non-flight legs: use departure_date as arrival date
      arrivalDate = leg.departure_date;
      const modeIcon = { train: "🚂", ferry: "⛴", car: "🚗" }[mode] ?? "";
      arrivalItems = [
        {
          type: "poi" as const,
          name: `${modeIcon} Arrive ${leg.destination}`,
          address: leg.destination,
          lat: 0,
          lng: 0,
          transport_mode: mode,
        },
        ...leg.hotel_stays.map((s: any) => ({
          type: "hotel" as const,
          name: s.hotel.name,
          address: s.hotel.address,
          lat: s.hotel.lat,
          lng: s.hotel.lng,
        })),
      ];
    }

    days.push({ day_number: dayNumber++, date: arrivalDate, leg_number: leg.leg_number, city: leg.destination, items: arrivalItems });

    const checkOut = leg.hotel_stays[0]?.check_out ?? arrivalDate;
    let cursor = new Date(arrivalDate);
    const end = new Date(checkOut);
    cursor.setDate(cursor.getDate() + 1);
    while (cursor < end) {
      const dateStr = cursor.toISOString().split("T")[0];
      const hotelItems: DayItem[] = leg.hotel_stays.map((s: any) => ({
        type: "hotel" as const,
        name: s.hotel.name,
        address: s.hotel.address,
        lat: s.hotel.lat,
        lng: s.hotel.lng,
      }));
      days.push({ day_number: dayNumber++, date: dateStr, leg_number: leg.leg_number, city: leg.destination, items: hotelItems });
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return days;
}

export default function ItineraryPage() {
  const router = useRouter();
  const { state, dispatch } = useTripContext();
  const { tripContext } = state;

  const [days, setDays] = useState<DayPlan[]>(() => buildInitialDays(tripContext.legs));
  const [suggestions, setSuggestions] = useState<POI[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [generatingItinerary, setGeneratingItinerary] = useState(false);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(null);

  useEffect(() => {
    const firstLeg = tripContext.legs[0];
    if (!firstLeg) return;
    setLoadingSuggestions(true);
    api.suggestPOIs({ trip_context: tripContext, leg_number: firstLeg.leg_number })
      .then(setSuggestions)
      .catch(console.error)
      .finally(() => setLoadingSuggestions(false));
  }, []);

  const refreshDistances = useCallback(async (updatedDays: DayPlan[]) => {
    const newDays = await Promise.all(
      updatedDays.map(async (day) => {
        if (day.items.length < 2) return day;
        try {
          const routes = await api.getDistances({ day_items: day.items });
          const items = day.items.map((item, i) => ({
            ...item,
            distance_to_next_km: routes[i]?.distance_km ?? undefined,
            travel_time_to_next_mins: routes[i]?.travel_time_mins ?? undefined,
            route_polyline_to_next: routes[i]?.encoded_polyline ?? undefined,
          }));
          return { ...day, items };
        } catch {
          return day;
        }
      })
    );
    return newDays;
  }, []);

  async function handleDaysChange(updatedDays: DayPlan[]) {
    setDays(updatedDays);
    const withDistances = await refreshDistances(updatedDays);
    setDays(withDistances);
    dispatch({ type: "SET_DAYS", payload: withDistances });
  }

  function handleMoveToPOIPool(item: DayItem, _fromDayNumber: number) {
    if (item.type !== "poi") return;
    const poi: POI = {
      id: `saved-${item.name}`,
      name: item.name,
      category: "Landmark",
      address: item.address,
      lat: item.lat,
      lng: item.lng,
      claude_note: "",
    };
    dispatch({ type: "ADD_UNSCHEDULED_POI", payload: poi });
  }

  async function handleGenerateItinerary() {
    setGeneratingItinerary(true);
    try {
      const itinerary = await api.generateItinerary({ trip_context: tripContext, days });
      dispatch({ type: "SET_ITINERARY", payload: itinerary });
      router.push("/export");
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingItinerary(false);
    }
  }

  const addedPOIIds = useMemo(
    () => new Set(days.flatMap((d) => d.items.filter((i) => i.type === "poi").map((i) => i.name))),
    [days]
  );

  const firstDayOfWeek = days[0]
    ? new Date(days[0].date).toLocaleDateString("en-US", { weekday: "long" })
    : "Monday";

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-2 bg-gray-900 text-white text-sm flex-shrink-0">
        <button
          onClick={() => setSuggestionsOpen((o) => !o)}
          className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 border border-blue-600 rounded-md px-3 py-1.5 text-blue-200 text-xs"
        >
          ✨ Claude Suggestions
          <span className="bg-blue-600 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center">
            {suggestions.length}
          </span>
        </button>

        <div className="flex flex-wrap gap-1 ml-auto">
          <button
            onClick={() => setSelectedDayNumber(null)}
            className={`px-3 py-1 rounded text-xs ${!selectedDayNumber ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
          >
            All Days
          </button>
          {days.map((day) => (
            <button
              key={day.day_number}
              onClick={() => setSelectedDayNumber(day.day_number)}
              className={`px-3 py-1 rounded text-xs ${selectedDayNumber === day.day_number ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
            >
              Day {day.day_number}
            </button>
          ))}
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        <SuggestionsSidebar
          pois={suggestions}
          addedPOIIds={addedPOIIds}
          isOpen={suggestionsOpen}
          onClose={() => setSuggestionsOpen(false)}
          tripDayOfWeek={firstDayOfWeek}
          loading={loadingSuggestions}
        />

        {/* Middle: Day planner */}
        <div className="w-full md:w-80 flex-shrink-0 border-r border-gray-200 overflow-hidden flex flex-col">
          <DayPlanner
            days={days}
            unscheduled={tripContext.unscheduled_pois}
            saved={tripContext.saved_pois}
            onDaysChange={handleDaysChange}
            onMoveToPOIPool={handleMoveToPOIPool}
          />
          <div className="border-t border-gray-200 p-3 flex-shrink-0">
            <button
              onClick={handleGenerateItinerary}
              disabled={generatingItinerary}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-semibold py-2.5 rounded-lg"
            >
              {generatingItinerary ? "✨ Generating..." : "✨ Generate Itinerary →"}
            </button>
          </div>
        </div>

        {/* Right: Map — hidden on mobile */}
        <div className="hidden md:block flex-1 overflow-hidden">
          <TripMap
            days={days}
            unscheduledPOIs={tripContext.unscheduled_pois}
            selectedDayNumber={selectedDayNumber}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Navigate to http://localhost:3000/itinerary. You should see:
- Claude suggestions sidebar on the left (loading, then populated)
- Day planner in the middle with arrival day + hotel items
- Google Maps panel on the right (hidden on mobile/375px)

Try dragging a suggestion into Day 1. The map pins should update and distance connectors should appear.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/itinerary/
git commit -m "feat: Step 4 itinerary builder — drag-drop, suggestions, map, transport-aware arrival items"
```

---

### Task 12: Step 5 — Export

**Files:**
- Create: `frontend/src/components/export/ItinerarySummary.tsx`
- Create: `frontend/src/components/export/ExportButtons.tsx`
- Create: `frontend/src/app/export/page.tsx`

<!-- MODIFIED: export now includes transport_segments built from trip legs -->

- [ ] **Step 1: Create `frontend/src/components/export/ItinerarySummary.tsx`**

```tsx
import type { TripContext, ItineraryDay } from "@/types/trip";

interface Props {
  tripContext: TripContext;
  itinerary: ItineraryDay[];
}

const MODE_ICONS: Record<string, string> = {
  flight: "✈",
  train: "🚂",
  ferry: "⛴",
  car: "🚗",
};

export function ItinerarySummary({ tripContext, itinerary }: Props) {
  return (
    <div className="space-y-6">
      {/* Trip header */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <h2 className="font-bold text-gray-900 mb-3">Trip Summary</h2>
        {tripContext.legs.map((leg) => {
          const mode = leg.transport_mode ?? "flight";
          return (
            <div key={leg.leg_number} className="mb-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <span>{MODE_ICONS[mode]}</span>
                Leg {leg.leg_number}: {leg.origin} → {leg.destination}
              </h3>
              {mode === "flight" && leg.selected_flight && (
                <p className="text-sm text-gray-500 ml-5">
                  {leg.selected_flight.segments[0].carrier_code}{leg.selected_flight.segments[0].flight_number}
                  · {leg.selected_flight.currency} {leg.selected_flight.price.toLocaleString()}
                  · {leg.selected_flight.stops === 0 ? "Direct" : `${leg.selected_flight.stops} stop(s)`}
                </p>
              )}
              {mode !== "flight" && (
                <p className="text-sm text-gray-500 ml-5 capitalize">{mode} segment</p>
              )}
              {leg.hotel_stays.map((stay, i) => (
                <p key={i} className="text-sm text-gray-500 ml-5">
                  🏨 {stay.hotel.name} · {stay.check_in} – {stay.check_out}
                  · {stay.hotel.currency} {stay.hotel.price_per_night}/night
                  {stay.accommodation_type && stay.accommodation_type !== "hotel" && (
                    <span className="ml-1 text-blue-500 text-xs capitalize">({stay.accommodation_type.replace("_", " ")})</span>
                  )}
                </p>
              ))}
            </div>
          );
        })}
      </div>

      {/* Day-by-day itinerary */}
      {itinerary.map((day) => (
        <div key={day.day_number} className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-orange-50 px-4 py-2 border-b border-orange-100">
            <h3 className="font-bold text-orange-700">
              Day {day.day_number} — {day.date}
              <span className="font-normal text-orange-500 ml-2">{day.city}</span>
            </h3>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-sm text-gray-600 italic">{day.narrative}</p>
            <ul className="space-y-1">
              {day.items.map((item, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                  <span>{item.type === "hotel" ? "🏨" : item.type === "airport" ? "✈️" : "📍"}</span>
                  <span className="font-medium">{item.name}</span>
                  {item.duration_mins && <span className="text-gray-400">({item.duration_mins} min)</span>}
                  {item.spans_days && item.spans_days > 1 && (
                    <span className="text-blue-400 text-xs">[spans {item.spans_days} days]</span>
                  )}
                  {item.travel_time_to_next_mins && (
                    <span className="text-blue-400 text-xs ml-auto">
                      {item.travel_time_to_next_mins} min → next
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `frontend/src/components/export/ExportButtons.tsx`**

```tsx
"use client";

import { useState } from "react";
import { api } from "@/services/api";
import type { ExportRequest } from "@/types/trip";

interface Props {
  exportRequest: ExportRequest;
}

export function ExportButtons({ exportRequest }: Props) {
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingJSON, setDownloadingJSON] = useState(false);

  async function handlePDF() {
    setDownloadingPDF(true);
    try {
      const blob = await api.exportPDF(exportRequest);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "trip-plan.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("PDF export failed:", e);
    } finally {
      setDownloadingPDF(false);
    }
  }

  async function handleJSON() {
    setDownloadingJSON(true);
    try {
      const result = await api.exportJSON(exportRequest);
      const blob = new Blob([result.data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "trip-plan.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("JSON export failed:", e);
    } finally {
      setDownloadingJSON(false);
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <button
        onClick={handlePDF}
        disabled={downloadingPDF}
        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2"
      >
        {downloadingPDF ? "Generating PDF..." : "📄 Download PDF"}
      </button>
      <button
        onClick={handleJSON}
        disabled={downloadingJSON}
        className="flex-1 bg-gray-700 hover:bg-gray-800 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2"
      >
        {downloadingJSON ? "Preparing..." : "{ } Download JSON"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Create `frontend/src/app/export/page.tsx`**

<!-- MODIFIED: builds transport_segments from legs before calling export API -->

```tsx
"use client";

import { useTripContext } from "@/context/TripContext";
import { ItinerarySummary } from "@/components/export/ItinerarySummary";
import { ExportButtons } from "@/components/export/ExportButtons";
import Link from "next/link";
import type { TransportSegment, ExportRequest } from "@/types/trip";

function buildTransportSegments(legs: any[]): TransportSegment[] {
  return legs.map((leg): TransportSegment => {
    const mode = leg.transport_mode ?? "flight";
    if (mode === "flight" && leg.selected_flight) {
      const f = leg.selected_flight;
      const seg = f.segments[0];
      return {
        mode: "flight",
        origin: seg.departure_airport,
        destination: seg.arrival_airport,
        operator: `${seg.carrier_code}${seg.flight_number}`,
        duration_mins: undefined,
        booking_ref: undefined,
      };
    }
    return {
      mode,
      origin: leg.origin,
      destination: leg.destination,
    };
  });
}

export default function ExportPage() {
  const { state } = useTripContext();
  const { tripContext, itinerary } = state;

  if (itinerary.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-gray-500 mb-4">No itinerary generated yet.</p>
        <Link href="/itinerary" className="text-blue-600 hover:underline">
          ← Go back to build your itinerary
        </Link>
      </div>
    );
  }

  const transportSegments = buildTransportSegments(tripContext.legs);
  const exportRequest: ExportRequest = {
    trip_context: tripContext,
    itinerary,
    transport_segments: transportSegments,
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Trip Plan</h1>
          <p className="text-gray-500 mt-1">Review your itinerary and download.</p>
        </div>
        <Link href="/itinerary" className="text-sm text-gray-500 hover:text-gray-700">
          ← Edit itinerary
        </Link>
      </div>

      <ExportButtons exportRequest={exportRequest} />
      <ItinerarySummary tripContext={tripContext} itinerary={itinerary} />
    </div>
  );
}
```

- [ ] **Step 4: End-to-end manual test**

Run through the full flow:
1. http://localhost:3000 — fill Trip Setup with AirportSearch, enable multi-destination, click Start Planning
2. `/segments` — confirm flight search form for flight legs, static cards for train/ferry/car
3. `/hotels` — confirm ferry legs show skip message, search hotels for other legs
4. `/itinerary` — drag POIs from suggestions, observe map update, click Generate Itinerary
5. `/export` — click Download PDF and JSON, verify transport_segments appear in JSON

- [ ] **Step 5: Final TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/export/ frontend/src/components/export/
git commit -m "feat: Step 5 export with transport_segments, PDF and JSON download"
```

---

### Task 13: Responsive Design Pass <!-- NEW: added for mobile/responsive requirements -->

**Goal:** Ensure all pages work at 375px (iPhone SE) minimum width with no layout shifts.

- [ ] **Step 1: Audit each page at 375px width**

Use browser dev tools to simulate 375px. Check each of the 5 pages and identify:
- Elements that overflow horizontally
- Text that gets clipped
- Buttons that are too narrow to tap (min 44px height)
- Forms that don't stack vertically

- [ ] **Step 2: Fix Trip Setup (page.tsx)**

Verify the multi-destination leg builder stacks vertically on small screens. The `grid-cols-1 sm:grid-cols-2` on the origin/destination fields handles this. Confirm the transport mode buttons wrap with `flex-wrap`.

- [ ] **Step 3: Fix Segments page**

Verify FlightCard price and route info wraps at narrow widths (`flex-wrap` on the row). TrainSegmentCard, FerrySegmentCard, CarSegmentCard are already block-layout — verify booking link buttons wrap with `flex-wrap gap-2`.

- [ ] **Step 4: Fix Hotels page**

Verify hotel stays list wraps the check-in/check-out dates. HotelCard uses `flex-wrap` on the header row.

- [ ] **Step 5: Fix Itinerary page**

On mobile (< md), the map is hidden and DayPlanner takes full width. Verify suggestions sidebar is hidden behind the toggle button and doesn't overlap. The day filter buttons should scroll horizontally on small screens — wrap the day button list in `overflow-x-auto`.

- [ ] **Step 6: Fix Export page**

ExportButtons uses `flex-col sm:flex-row` — verify buttons are full-width on mobile.

- [ ] **Step 7: Fix Sidebar on mobile**

Verify the bottom nav bar on mobile shows all 5 step icons without overflow. Use `text-[10px]` for labels if needed.

- [ ] **Step 8: Add mobile bottom padding to all pages**

Ensure `pb-24 md:pb-8` in layout.tsx clears the bottom nav bar on mobile.

- [ ] **Step 9: Verify min-width constraint**

```bash
# In browser dev tools: set width to 375px and reload each page.
# Confirm: no horizontal scrollbar on any page.
```

- [ ] **Step 10: Commit**

```bash
git add frontend/src/
git commit -m "fix: responsive design pass — all pages verified at 375px, mobile nav clearance"
```

---

## Self-Review Note: DndContext Must Be Lifted

**Issue:** `SuggestionsSidebar` uses `useDraggable` but is rendered _outside_ `DayPlanner`'s `DndContext`. Drag from sidebar to day columns won't work until fixed.

**Fix (apply in Task 11 before verifying):** Remove the `<DndContext>` wrapper from `DayPlanner` and export the `handleDragEnd` logic as a standalone hook or lift it directly into `itinerary/page.tsx`. Then wrap the entire three-panel section in the itinerary page with a single `<DndContext>`:

```tsx
// In itinerary/page.tsx — wrap ALL three panels with one DndContext
<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
  <SuggestionsSidebar ... />
  <DayPlanner ... />   {/* no DndContext inside */}
  <TripMap ... />
</DndContext>
```

Pass `sensors`, `handleDragEnd`, and `activeId` down as props, or extract into a `useItineraryDnd` hook in `frontend/src/hooks/useItineraryDnd.ts`.

---

## Frontend Complete ✓

```bash
npm run build
```

Expected: builds successfully with no TypeScript errors.

The full application is now runnable:
```bash
# Terminal 1 — backend
cd backend && uvicorn backend.main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend && npm run dev
```

Visit http://localhost:3000 to plan a trip end-to-end.

**New features delivered:**
- Collapsible left sidebar (44px → 220px) with trip summary + mobile bottom nav
- AirportSearch combobox backed by bundled airports.json (~3,000 airports)
- Multi-destination leg builder with per-leg transport mode selector and availability hints
- `/segments` page with FlightCard, TrainSegmentCard, FerrySegmentCard, CarSegmentCard
- AI Pick "Why?" expandable panels on FlightCard and HotelCard
- Hotel page skips search for ferry cabin / sleeper train legs
- Transport-aware itinerary arrival labels
- Export includes TransportSegment manifest per leg
- Responsive design verified at 375px minimum width
