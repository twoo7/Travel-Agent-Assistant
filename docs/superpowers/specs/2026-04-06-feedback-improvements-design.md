# Feedback Improvements Design — 2026-04-06

## Context

Nine items of user feedback were collected after live testing of the travel agent app. They span UX polish, missing features, a backend bug, and itinerary improvements. This spec addresses all nine, grouped into three implementation batches ordered by priority: UX Polish first, then Feature Additions, then Bug Fixes + Itinerary.

---

## Batch 1 — UX Polish

### Item 1 — AI Picks pinned to top of results

**Problem:** AI Pick badge exists on flight and hotel cards, but results render in API-returned order. The AI recommendation may appear buried.

**Design:** After results arrive on the frontend, sort the results array so `ai_recommended === true` entries are moved to index 0 before rendering. Applies to both `FlightCard` lists on `/segments` and `HotelCard` lists on `/hotels`. No backend change required — pure frontend sort in each page component.

**Files:** `frontend/src/app/segments/page.tsx`, `frontend/src/app/hotels/page.tsx`

---

### Item 2 — Sorting, filtering, and result caching

**Problem:** No sorting or filtering UI exists. Results are re-fetched on every page visit.

#### Sorting

A sort bar renders above the results list for each leg/destination:

- **Flights:** AI Recommended (default) | Price ↑ | Price ↓ | Duration ↑ | Stops ↑
- **Hotels:** AI Recommended (default) | Price ↑ | Price ↓ | Rating ↓

Sorting is client-side via `useMemo` on the fetched results array. A `SortBar` component (shared by both pages) accepts `options`, `value`, and `onChange` props.

#### Filtering

A compact filter row below the sort bar:

- **Flights:** Max stops toggle (Any / Nonstop / 1 stop), Price range slider
- **Hotels:** Minimum star rating (1–5 stars), Price range slider

Filtering is also client-side via `useMemo`. Filter state is local to each page (not persisted to context).

#### Result Caching

Two new optional fields added to the `TripLeg` type:

```ts
flight_results?: FlightOffer[]
hotel_results?: HotelOffer[]
```

On the segments page, if `leg.flight_results` already exists, the API call is skipped and cached results are used directly. Same for hotels. Results are invalidated when `MARK_STALE` fires for the relevant leg — the reducer clears `flight_results` and `hotel_results` for stale legs.

**Files:**
- `frontend/src/types/trip.ts` — add `flight_results`, `hotel_results` to `TripLeg`
- `frontend/src/context/TripContext.tsx` — cache results via new `SET_FLIGHT_RESULTS` / `SET_HOTEL_RESULTS` actions; clear on `MARK_STALE`
- `frontend/src/app/segments/page.tsx` — skip fetch if cached; dispatch on new results
- `frontend/src/app/hotels/page.tsx` — same
- `frontend/src/components/SortBar.tsx` — new shared sort control
- `frontend/src/components/FilterBar.tsx` — new shared filter control (flights and hotels variants)

---

### Item 3 — Sidebar centering + bottom-bar status indicator

**Problem:** Collapsed icon cells are not properly centered. The "Done" state replaces the icon with a checkmark (icon lost). Text in the TripSummary cost breakdown reflows and wraps during the expand/collapse animation.

#### Collapsed cell redesign

- Cell becomes a fixed `w-9 h-9` square, centered with `flex items-center justify-center mx-auto`
- **Icon always visible** — icon is never replaced by a checkmark or any other symbol
- Step number moves to an `absolute` positioned label at top-left of the cell (`text-[8px] text-slate-400`)
- Status shown via a **3px bottom bar** on the cell:
  - Indigo (`bg-indigo-500`) = Active
  - Green (`bg-green-500`) = Done
  - Amber (`bg-amber-400 animate-pulse`) = Stale
  - Slate (`bg-slate-700`) = Locked
- Expanded view `StatusChip` pills remain unchanged

#### TripSummary animation fix

- TripSummary wrapper gains `transition-opacity duration-150` with `opacity-0` when collapsed and `opacity-100 delay-100` when expanded — text only appears after the width animation completes
- All text lines in TripSummary get `whitespace-nowrap` to prevent any mid-animation reflow
- Sidebar width transition stays `transition-[width] duration-200`

**Files:** `frontend/src/components/Sidebar.tsx`

---

## Batch 2 — Feature Additions

### Item 4 — Currency selector

**Problem:** No currency selection exists. The sidebar total naively uses the first flight's currency code.

**Design:** A `<select>` dropdown added to the Trip Setup form (both single and multi-destination modes), labeled "Currency". Options: USD, EUR, GBP, JPY, AUD, CAD, CHF, SGD, HKD, NZD. Default: USD.

Selected currency stored in `TripContext` as `tripContext.currency: string`. Passed as `currency` in all `/flights/search` and `/hotels/search` POST request bodies. Amadeus natively supports `currencyCode` in both endpoints — no client-side conversion needed.

Sidebar TripSummary total uses `tripContext.currency` as the display label.

**Files:**
- `frontend/src/types/trip.ts` — add `currency: string` to `TripContextType`
- `frontend/src/context/TripContext.tsx` — initialize `currency: "USD"`, handle in `INIT_TRIP` / `UPDATE_TRIP_META`
- `frontend/src/app/page.tsx` — add currency `<select>` to setup form
- `frontend/src/services/api.ts` — pass `currency` in flight and hotel search calls
- `frontend/src/components/Sidebar.tsx` — use `tripContext.currency` for total label
- `backend/src/routers/flights.py` — accept and pass `currency` to Amadeus
- `backend/src/routers/hotels.py` — accept and pass `currency` to Amadeus
- `backend/src/services/amadeus_service.py` — pass `currencyCode` param in both offer searches

---

### Item 5 — Airport search by country name

**Problem:** `filterAirports()` only searches IATA code, airport name, and city. Country field in the data is a 2-letter ISO code (`"JP"`). Searching "Japan" returns nothing.

**Design:** New utility file `frontend/src/utils/countryNames.ts` exports a `COUNTRY_NAMES` map of ~250 ISO 2-letter codes to full English country names:

```ts
export const COUNTRY_NAMES: Record<string, string> = {
  JP: "Japan",
  FR: "France",
  GB: "United Kingdom",
  US: "United States",
  // ... ~246 more
};
```

`filterAirports()` in `AirportSearch.tsx` gains a fourth match condition:

```ts
|| COUNTRY_NAMES[airport.country]?.toLowerCase().includes(q)
```

Searching "japan" returns all airports where `country === "JP"` (e.g. Haneda, Narita, Osaka Kansai, Sapporo, etc.). Searching "JP" still works via the existing IATA exact-match path. Results remain capped at 8 — for broad country searches, the 3-char IATA sort moves relevant results up.

**Files:**
- `frontend/src/utils/countryNames.ts` — new file
- `frontend/src/components/AirportSearch.tsx` — update `filterAirports()`

---

### Item 6 — Round trip: auto-add return leg

**Problem:** The return date field on Trip Setup exists but is never wired up. No return leg is created.

#### Single-destination mode

- Return date field already rendered (labeled "Return Date (optional)")
- On submit, if `returnDate` is filled, append an extra leg after the outbound leg:
  ```ts
  { origin: destination, destination: home_origin, departure_date: returnDate, transport_mode: "flight" }
  ```
- This leg flows through the segments page identically to any other flight leg

#### Multi-destination mode

- Add a "Add return flight home" toggle (checkbox) at the bottom of the leg list, below "+ Add destination"
- When checked, a read-only summary row shows the auto-return leg: `"{last destination} → {home_origin}" on [return date field]`
- Return date input appears inline when the toggle is checked
- On submit, the return leg is appended the same way

No new context actions needed — this is handled entirely in the submit handler of `frontend/src/app/page.tsx`.

**Files:** `frontend/src/app/page.tsx`

---

## Batch 3 — Bug Fixes + Itinerary

### Item 7 — Hotel search 502 "INVALID PROPERTY CODE" fix

**Problem:** `AmadeusService` fetches up to 20 hotel IDs from `hotels.by_city`, passes all 20 to `hotel_offers_search`. One invalid ID fails the entire batch with a 502.

**Design:**
1. Reduce initial batch from 20 → 10 hotel IDs
2. Wrap `hotel_offers_search` in try/except. On `ResponseError`, retry with first 5 IDs
3. If the retry also fails, return an empty list — frontend shows "No hotel availability found for this destination" instead of an error
4. Filter hotels from `by_city` response: skip entries missing `hotelId` or with `last_update` older than 1 year (Amadeus includes this metadata)

**Files:** `backend/src/services/amadeus_service.py`

---

### Item 8 — Hotel total cost display

**Problem:** Only per-night price is shown. Sidebar total adds one night per stay regardless of actual stay length.

**Design:** New utility function `calcNights(checkIn: string, checkOut: string): number` in `frontend/src/utils/dateUtils.ts`:

```ts
export function calcNights(checkIn: string, checkOut: string): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / msPerDay);
}
```

Applied in three places:

- **`HotelCard`:** Below the existing `{currency} {price_per_night}/night` line, add `{currency} {(price_per_night * nights).toLocaleString()} total ({nights} nights)` in `text-sm text-slate-400`
- **`Sidebar` TripSummary:** Replace `stay.hotel.price_per_night` with `stay.hotel.price_per_night * calcNights(stay.check_in, stay.check_out)` in the total cost calculation
- **`ItinerarySummary`:** Same — show per-night and total

**Files:**
- `frontend/src/utils/dateUtils.ts` — new file with `calcNights`
- `frontend/src/components/hotels/HotelCard.tsx`
- `frontend/src/components/Sidebar.tsx`
- `frontend/src/app/itinerary/page.tsx` — itinerary summary price display is inline on this page

---

### Item 9 — Itinerary: auto-fire suggestions + skeleton loader + feedback input

**Problem:** POI suggestions require a manual button click. Loading indicator is minimal (button text change only). No way to give feedback or request specific suggestions.

#### Auto-fire on mount

Add a `useEffect` in `frontend/src/app/itinerary/page.tsx`:

```ts
useEffect(() => {
  if (pois.length === 0 && tripContext.legs.length > 0 && !loadingPois) {
    handleFetchPOIs();
  }
}, []);
```

#### Skeleton loader in SuggestionsSidebar

Replace the current "Generating suggestions..." `animate-pulse` div with 3 skeleton POI cards while `loading` is true. Each skeleton card matches the rough dimensions of a real POI card (image placeholder block, two text placeholder lines, a narrow action bar).

#### Feedback / custom prompt input

Add a text input + "Suggest" button at the top of `SuggestionsSidebar`, above the category filter chips:

```
[ Ask for suggestions... e.g. 'more outdoor activities' ] [Suggest]
```

- `onSuggest(prompt: string)` prop added to `SuggestionsSidebar`
- Parent page passes `handleFetchPOIs(prompt)` as the handler
- `handleFetchPOIs` gains an optional `userPrompt?: string` param, included in the API request
- Backend `POST /pois/suggest` request model gains `user_prompt: Optional[str] = None`
- `POIAgent.suggest()` accepts `user_prompt` and prepends it to the Claude system prompt: `"User request: {user_prompt}. Prioritize suggestions matching this request."`
- New results merge into existing POIs using existing dedup logic

**Files:**
- `frontend/src/app/itinerary/page.tsx` — auto-fire effect, pass `onSuggest` to sidebar
- `frontend/src/components/itinerary/SuggestionsSidebar.tsx` — skeleton loader, prompt input
- `backend/src/routers/pois.py` — add `user_prompt` to request model
- `backend/src/agents/poi_agent.py` — accept and inject `user_prompt`

---

## Verification

### Batch 1
- Navigate to `/segments` — AI Pick card appears first in the list
- Click "Search flights" twice for the same leg — second call skipped, cached results shown
- Sort flights by Price ↑ — list reorders client-side
- Filter to Nonstop — non-nonstop results hidden
- Resize sidebar rapidly — TripSummary text never wraps mid-animation
- Collapsed sidebar icons are centered; step status shows as colored bottom bar not checkmark replacement

### Batch 2
- Set currency to JPY in Trip Setup → flight prices returned in JPY on segments page
- Search "Japan" in airport combobox → Haneda, Narita, Osaka KIX appear
- Fill return date in single-destination mode → a return leg appears on /segments after submit
- Check "Add return flight home" in multi-destination mode → return leg appended

### Batch 3
- Search hotels for a destination with known bad Amadeus IDs → graceful "no results" message, no 502
- Select a hotel with a 3-night stay → HotelCard shows per-night and total; sidebar total reflects 3× per-night
- Navigate to `/itinerary` → suggestions load automatically without clicking any button
- Type "rooftop bars" in the suggestions prompt input and click Suggest → new suggestions appear matching the request
