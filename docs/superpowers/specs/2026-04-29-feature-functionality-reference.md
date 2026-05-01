# Feature Functionality Reference

End-to-end verified 2026-04-29 with `AMADEUS_MOCK=true`. Mock data: 3 flights (JL006 $850 nonstop AI Pick, NH110 $920 nonstop, KE082 $720 1-stop), 4 hotels (Hotel Gracery Shinjuku $180 AI Pick, Park Hyatt $350, Prince Gallery $290, Dormy Inn $120).

**Keep this document up to date as features are added, changed, or removed.**

## Global Shell (all pages)

| Element | Behavior |
|---|---|
| Step indicator (numbered nav icons) | Clickable links to each funnel step; completed steps show a checkmark overlay |
| "My Trips" link (folder icon) | Navigates to `/trips` from any page |
| Light/dark mode toggle (sun/moon) | Toggles theme instantly; sidebar expands to show full step labels and trip summary card in light mode |
| "Pin sidebar open" button | Pins the left sidebar open; state lives in `LayoutShell` so `<main>` adjusts padding reactively |
| **Save** button (top-right pill) | Opens modal with "Update trip name" text input pre-filled with current name. Calls `PATCH /trips/{id}` on save. Only shown when a `trip_id` exists. |
| **Share** button (top-right pill) | Copies `{origin}/t/{activeTripId}` to clipboard via `navigator.clipboard`; falls back to `window.prompt`. Only rendered when `shareUrl` (active trip ID) is set. |

## Step 1 — Trip Setup (`/`)

- **Home airport** — `AirportSearch` component with IATA autocomplete from a static `airportNames` lookup
- **Destination** — freeform text or city name
- **Dates** — departure and return date pickers
- **Travelers** — adult/child count steppers
- **Add leg** — supports multi-leg itineraries; each leg gets its own flight + hotel search in later steps
- On submit: creates a draft trip via `POST /trips`, sets `activeTripId` in TripContext, navigates to `/segments`

## Step 2 — Segments (`/segments`)

- Lists all legs (outbound, return, any extras) as tabs/sections
- **Transport mode selector** — flight / train / ferry / car per leg
- **Search flights** — calls `POST /flights/search`; backend runs `AmadeusService` → `FlightAgent` (Claude ranks + sets `ai_recommended`)
- Flight results card shows: carrier, flight number, departure/arrival times, duration, stops, price, "AI Pick" badge
- **Select flight** — clicking a card marks it selected; "Flight selected ✓" badge appears; progress bar updates
- Once all legs have a selection, "Continue to Hotels" button activates
- With `AMADEUS_MOCK=true` the Amadeus API call is bypassed entirely; 3 mock flights are returned immediately

## Step 3 — Hotels (`/hotels`)

- One hotel search section per destination leg (return legs are skipped)
- **Search hotels** — calls `POST /hotels/search`; backend runs `AmadeusService` → `HotelAgent` (Claude ranks + sets `ai_recommended`)
- Hotel card shows: name, address, price/night, star rating, "AI Pick" badge
- **Select hotel** — clicking a card shows "Confirm: {Hotel Name}" button; confirming sets "Stay Confirmed" badge
- Progress bar tracks confirmed hotels across all legs; "Build Itinerary" activates at 100%

## Step 4 — Itinerary (`/itinerary`)

### Layout
- Left panel: resizable `SuggestionsSidebar` (three tabs)
- Right panel: `TripMap` (Google Maps) — focused-day filter, color-coded pins per day, route polylines
- Center: `DayPlanner` with drag-and-drop `DayColumn`s

### Sidebar tabs
- **AI Picks** tab — "Suggest places" button calls `POST /pois/suggest`; Claude returns ranked POIs with `aiNote`, `bestTime`, `bookingRequired`, `busyTimes`. Filter chips (Food, Culture, Nature, Shopping, Entertainment) filter results client-side. Each card shows: photo, name (Google Maps link), rating, address, category, AI note.
- **Search** tab — Google Places `AutocompleteService.getPlacePredictions` (300ms debounce); top 5 results fetched in parallel via `getDetails`. Note: programmatic `fill()` does **not** trigger React's onChange — real keyboard events are required for autocomplete to fire.
- **Saved** tab — POIs that were added then removed from the itinerary; can be re-added to any day

### Adding POIs to days
- "Add to day" button on each `LocationCard` opens an inline `DayPicker` dropdown (not in accessibility tree; requires JS evaluate to automate)
- Selecting a day via `DayPicker` dispatches `ADD_POI_TO_DAY` → POI appears in the chosen `DayColumn`
- Hotel card is locked to Day 1 by default; cannot be moved to other days via drag

### DayPlanner / DayColumn
- dnd-kit sortable: drag POIs between day columns and reorder within a day
- On every reorder: calls `POST /pois/distances` → returns travel time + distance (e.g. "26 min · 8.3 km drive") shown as `DistanceConnector` between cards
- `LocationDetailSheet` — slide-up detail panel when clicking a POI in the day planner

### Map interactions
- `TripMap` — pins color-coded by day; route polylines connect POIs in order
- Clicking a day column "focuses" that day: map zooms to show only that day's locations
- "Show all" resets to full-trip bounds

### Generate Itinerary
- "Generate Itinerary" button calls `POST /pois/generate` (Claude narrates each day)
- Auto-navigates to `/export` when complete

## Step 5 — Export (`/export`)

- Read-only summary of the complete trip
- **Your Journey** banner — route string (e.g. "Seattle → Tokyo → Seattle"), adults, total days
- **Transport** section — collapsible flight cards per leg; each shows carrier, date, AI Pick badge, price, duration. External booking link button opens airline/booking site in new tab.
- **Accommodation** section — collapsible hotel card; shows name, AI Pick badge, dates, total price, price/night × nights. External booking link button opens hotel site in new tab.
- **Day by Day** section — each day shows: date, airport code, Claude-generated narration sentence, list of items (airport arrival, hotel, POIs) each as an expandable card with address/details
- **Estimated Total** — sum of flight prices + hotel total in USD
- **Download PDF** — calls `POST /export/pdf`; downloads as `travel-plan.pdf` (server-rendered, not `window.print()`)
- **Download JSON** — calls `POST /export/json`; downloads as `travel-plan.json` (re-importable in a future session)
- **Plan another trip** — resets TripContext and navigates to `/`
- **Edit Itinerary** — navigates back to `/itinerary`

## My Trips (`/trips`)

- Lists all trips associated with the browser's `uid` cookie (fetched from `GET /trips`)
- Empty state: "No trips yet. Start planning your first adventure." with "+ New Trip" CTA
- Each trip card: name, route, dates, step progress indicators, total cost
- **Share** button on card: copies `{origin}/t/{trip_id}` to clipboard; shows "Copied!" for 1.5s
- **Delete** button: calls `DELETE /trips/{id}`; removes from list
- **+ New Trip** button (header): creates new draft and navigates to `/`
- Draft trips expire from Redis after 7 days; named trips after 1 year
- Claimed shared trips (`POST /trips/{id}/claim`) are added to the claimant's trip list
