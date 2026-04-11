# Bug Fix Design: Session Japan-Korea (11 bugs)

**Date:** 2026-04-10  
**Source:** `PlaywrightTests/session-japan-korea/BUG_REPORT.md`  
**Delivery:** Single PR

---

## Scope

All 11 bugs from the Japan-Korea E2E test session. Grouped below by area.

---

## 1. Backend — Mock data fallback (Bugs #3, #4)

### Problem
Amadeus sandbox API returns HTTP 500 on all flight and hotel search endpoints. Authentication (OAuth token) works fine — the search infrastructure itself is down. With no fallback, the entire funnel past Step 1 is unusable for demos.

### Solution

**Env gate:** Add `AMADEUS_MOCK=false` to `backend/.env`. `Config` gets:
```python
AMADEUS_MOCK: bool = os.getenv("AMADEUS_MOCK", "false").lower() == "true"
```

**Fallback logic in `AmadeusService`** (both `search_flights` and `search_hotels`):
```
call Amadeus API
  → if ResponseError with status 500 AND Config.AMADEUS_MOCK is True
      → return mock data (logged as warning, not error)
  → if ResponseError with status 500 AND Config.AMADEUS_MOCK is False
      → re-raise (caller surfaces "service temporarily unavailable")
  → if any other ResponseError (401, 400, 429, etc.)
      → re-raise always — real error, user should see it
```

**Mock data:** Module-level constants in `amadeus_service.py`. 3 flight offers (varied price/stops) and 4 hotel offers for any route/city. Realistic enough to demo the full funnel. Not behind a feature flag in the binary — just unreachable unless a 500 triggers it and the gate is on.

**Routers** (`flights.py`, `hotels.py`): Existing `except Exception → HTTPException(502)` stays. Error `detail` string is adjusted:
- Amadeus 500, no mock → `"Flight/hotel search is temporarily unavailable. Please try again later."`
- Any other Amadeus error → pass the specific error detail through

---

## 2. Frontend — API error display (Bug #5)

### Problem
`api.ts` `post()` throws the raw string `"API /hotels/search failed: 502 — {"detail":"Hotel search failed: [500]\n"}"` which surfaces directly in the UI.

### Solution

Modify `post()` in `frontend/src/services/api.ts`:
1. On non-ok response, attempt `res.json()` to extract `detail`
2. Map to friendly message:
   - `detail` contains "temporarily unavailable" → `"Flight/hotel search is temporarily unavailable. Please try again shortly."`
   - `detail` is any other non-empty string → show `detail` as-is (clean, no JSON wrappers)
   - Body not parseable as JSON → `"Something went wrong. Please try again."`
3. `console.error` the full raw response for debugging

No changes needed to the error `<div>` in `segments/page.tsx` or `hotels/page.tsx` — they already render whatever string is in `error[legNumber]`.

---

## 3. Train card — Region-aware links, sleeper misclassification, journey time (Bugs #6, #8, #9)

### Bug #6 — Region-aware booking links (`TrainSegmentCard.tsx`)

Add `getAirportCountry(iata: string): string` to `frontend/src/utils/airportNames.ts` (airports.json already imported there). `TrainSegmentCard` looks up country for `leg.origin` and `leg.destination`, then selects a link set:

| Country match | Links |
|---|---|
| Both `JP` | JR Pass (jrpass.com), Hyperdia (hyperdia.com), Klook |
| Both `KR` | Korail (letskorail.com), Klook |
| Both in Europe* | Trainline (trainline.com), Eurail (eurail.com), Rail Europe (raileurope.com) |
| Mixed / unknown | The Man in Seat 61 (seat61.com), Rome2Rio (rome2rio.com) |

*European country codes: `AT BE CH CZ DE DK ES FI FR GB HR HU IT NL NO PL PT RO SE SK`.

The `leg` prop already contains `origin` and `destination` IATA codes — no interface changes needed.

### Bug #8 — Sleeper train misclassification (`hotels/page.tsx`)

Remove the blanket "Sleeper Train Leg" notice block (currently lines 228–239) that suppresses hotel search for all train legs. Replace with a soft non-suppressing advisory:

```
Note: If this is an overnight sleeper train, berth accommodation may be included —
you may not need a hotel for this leg.
```

Hotel search form is shown normally regardless. The overnight **ferry** block (lines 212–225) is unchanged — ferries genuinely include cabin accommodation.

### Bug #9 — "Estimated journey: varies" (`TrainSegmentCard.tsx`)

Remove the line entirely. No replacement.

---

## 4. Segments — Add-leg pre-fill (Bug #7)

### Problem
The "Add another leg" form always defaults `origin` to `""` with placeholder `"JFK"` and destination placeholder `"NRT"`.

### Solution (`segments/page.tsx`)

Derive initial `origin` from last leg's destination:
```ts
const lastDestination = tripContext.legs[tripContext.legs.length - 1]?.destination ?? "";
const [newLeg, setNewLeg] = useState({
  origin: lastDestination,
  destination: "",
  departure_date: "",
  transport_mode: "flight" as TripLeg["transport_mode"],
});
```

Placeholder changes:
- "From" input: `placeholder="e.g. KIX"`
- "To" input: `placeholder="Next destination"`

After `handleAddLeg` fires, reset to `origin: ""` (not the new last destination — user should fill it in fresh for the next add).

---

## 5. State persistence (Bug #10)

### Problem
All trip state lives in React Context + useReducer with no persistence. Page refresh or direct URL navigation wipes all progress.

### Solution

**`TripContext.tsx`:**
- On provider mount: attempt `JSON.parse(sessionStorage.getItem("trip-context"))` and use as initial state if valid. On any parse/validation error, silently fall back to default empty state.
- Wrap the existing reducer: after every action, write `sessionStorage.setItem("trip-context", JSON.stringify(newState))`.

**Empty state copy** on `/itinerary` and `/export`: Change from bare "No trip set up yet." to:
> "Your session was reset — progress is not saved across page refreshes. Go back to Trip Setup to start planning."

No URL encoding, no server persistence — sessionStorage only (survives tab navigation and soft refresh, cleared when tab closes).

---

## 6. Sidebar step status (Bug #11)

### Problem
`stepStatus()` in `Sidebar.tsx` returns `"done"` for all steps before the current route index, regardless of actual TripContext state. Direct navigation to `/export` shows steps 1–4 all green with empty state.

### Solution

Replace route-position logic with TripContext-derived completion checks:

| Step | Done condition |
|---|---|
| Trip Setup (0) | `tripContext.legs.length > 0` |
| Segments (1) | every leg has `selected_flight` or `transport_mode !== "flight"` |
| Hotels (2) | every non-return leg has `hotel_stays.length > 0` |
| Itinerary (3) | Hotels step is done |
| Export (4) | Itinerary step is done |

"Active" = current route. "Locked" = not done and not active. "Stale" detection unchanged. Helper `isReturnLeg` already exists in `hotels/page.tsx` — extract to a shared util or inline the same logic in `Sidebar.tsx`.

---

## 7. AirportSearch hydration mismatch (Bug #1)

### Problem
`AirportSearch.tsx:78` uses `Math.random()` inside `useRef` initializer. Server renders one value, client hydrates with another → React hydration warning on every load.

### Solution

Add optional `id` prop to `AirportSearchProps`:
```ts
id?: string;
```

Listbox ID becomes:
```ts
const listboxId = useRef(`airport-listbox-${props.id ?? moduleCounter++}`);
```

Where `moduleCounter` is a module-level `let counter = 0` — deterministic on both server and client since component instantiation order is stable. Callers that already know a stable name (e.g. `"origin-leg-1"`) can pass it; others get the counter automatically.

---

## 8. Airport name chip truncation (Bug #2)

### Problem
The `<input>` fields in `AirportSearch` display the selected airport using `displayName()` which returns `"Narita International Airport (Tokyo)"`. In the multi-destination `LegCard` grid (two fields side-by-side), this clips mid-word with no ellipsis. The IATA badge (`[NRT]`) is already rendered to the right of the input, making the city-in-parentheses redundant.

### Solution

In `frontend/src/components/AirportSearch.tsx`, change `displayName()` at line 33 to return just `airport.city`:

```ts
function displayName(airport: Airport): string {
  return airport.city;
}
```

"Tokyo" fits comfortably in a narrow column; the IATA badge already identifies the airport precisely. No CSS changes needed.

---

## Files to change

| File | Bugs |
|---|---|
| `backend/.env` | #3, #4 |
| `backend/src/config.py` | #3, #4 |
| `backend/src/services/amadeus_service.py` | #3, #4 |
| `backend/src/routers/flights.py` | #3, #4, #5 |
| `backend/src/routers/hotels.py` | #3, #4, #5 |
| `frontend/src/services/api.ts` | #5 |
| `frontend/src/utils/airportNames.ts` | #6 |
| `frontend/src/components/segments/TrainSegmentCard.tsx` | #6, #9 |
| `frontend/src/app/hotels/page.tsx` | #8 |
| `frontend/src/app/segments/page.tsx` | #7 |
| `frontend/src/context/TripContext.tsx` | #10 |
| `frontend/src/app/itinerary/page.tsx` | #10 |
| `frontend/src/app/export/page.tsx` | #10 |
| `frontend/src/components/Sidebar.tsx` | #11 |
| `frontend/src/components/AirportSearch.tsx` | #1 |
| `frontend/src/components/AirportSearch.tsx` | #1, #2 |

---

## Out of scope

- Real sleeper train detection (no journey duration data available without a directions API)
- URL-based state encoding
- Backend database / auth
