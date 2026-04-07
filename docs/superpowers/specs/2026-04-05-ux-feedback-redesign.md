# UX Feedback Redesign — Design Spec

**Date:** 2026-04-05
**Branch:** feat/multi-modal-redesign
**Source:** `feedback 4-5.md` (11 feedback items)
**Visual reference:** `.superpowers/brainstorm/103-1775449623/content/cluster2-mockup.html`

---

## Overview

Three clusters of changes addressing all 11 feedback items from the April 5 review. Cluster 1 is foundational (sidebar + state) and must land before Clusters 2 and 3. Clusters 2 and 3 can be implemented in parallel after Cluster 1.

---

## Cluster 1 — Navigation & State
*Covers feedback items 1, 2, 3, 9*

### 1.1 Sidebar — Collapsed State (items 1, 9)

**Problem:** Collapsed sidebar shows only emoji icons with no step number or status context.

**Design:**
- Each collapsed step cell is **56px tall** to fit two stacked elements:
  - Top: step number (1–5) in a small colored label
  - Bottom: step icon (✈ 🛫 🏨 🗓 📥)
- Status communicated by color only (no text in collapsed state):
  - **Indigo** (`bg-indigo-600`) = active step
  - **Green** (`text-green-400`) = completed step
  - **Amber dot overlay** (8px circle, top-right of cell) = stale/needs attention
  - **Gray** (`text-slate-500`) = locked/not yet reachable

### 1.2 Sidebar — Expanded State (items 1, 9)

**Design:**
- Expands on **hover** (mouse enter/leave) — no click required
- Can be **pinned open** with a click on the toggle button; pinned state persists in component state
- Each expanded step row shows: number badge + icon (left cell) · label · status chip
- Status chips: `● Active` (indigo) · `✓ Done` (green) · `⚠ Stale` (amber) · `○ Locked` (gray)
- Stale steps show amber chip replacing the green ✓ chip; sidebar trip summary shows stale items in amber text
- Hover-expand uses `onMouseEnter` / `onMouseLeave` on the `<nav>` element; a 150ms delay on collapse prevents flicker

### 1.3 Auto-Save with Intentional-Change Detection (items 2, 3)

**Problem:** Navigating back to a completed step shows blank forms; edits are lost on navigation.

**Design — form hydration:**
- Every page reads from `TripContext` on mount via `useEffect` and sets local form state
- Trip Setup: replaces `INIT_TRIP` (which resets all state) with `UPDATE_TRIP_META` — a new reducer action that patches only `home_origin`, `adults`, `children` without clearing legs or selections
- Segments, Hotels: local form state initialised from the relevant `TripLeg` fields

**Design — intentional-change detection (save triggers):**
| Input type | Save fires when |
|---|---|
| Airport/city dropdown | User selects an item from the list (completed selection) |
| Date inputs | On `blur` (user tabs or clicks away) |
| Passenger ± buttons | On every button click |
| Transport mode toggle | On selection click |

**Design — stale step cascade:**
When a saved change would invalidate downstream data, a **stale banner** appears at the top of the current page. Simultaneously, affected sidebar steps flip from ✓ Done → ⚠ Stale (amber chip + amber dot in collapsed view).

**Stale banner anatomy:**
```
⚠️  [Title: "{Field} changed — N steps need attention"]        [✕ dismiss]
─────────────────────────────────────────────────────────────
• [Step name]: [Specific required action description]    [Go to Step →]
• [Step name]: [Specific required action description]    [Go to Step →]
```
- Each line names the step, describes exactly what action is needed (not just "stale"), and includes a navigation button
- Banner persists until all flagged steps are re-completed; dismissing hides the banner but the ⚠ amber indicator remains in the sidebar
- Navigation buttons use `router.push(href)` to take the user directly to the affected step

**Staleness rules:**
| Changed field | Invalidates |
|---|---|
| Origin airport (Leg N) | Segments Leg N (flight/transport selection) |
| Destination airport (Leg N) | Segments Leg N + Hotels Leg N |
| Departure date (Leg N) | Segments Leg N + Hotels Leg N (check-in/out) |
| Adults/children count | All selected flights and hotels (price is per-pax) |

**TripContext additions:**
```typescript
// New reducer action
| { type: "UPDATE_TRIP_META"; payload: Pick<TripContextType, "home_origin" | "adults" | "children"> }

// Stale step tracking (string[] not Set — must be serializable)
staleSteps: string[]  // e.g. ["hotels-1", "segments-2"]
// New actions:
| { type: "MARK_STALE"; payload: { keys: string[] } }
| { type: "CLEAR_STALE"; payload: { key: string } }
```

---

## Cluster 2 — Smart Forms
*Covers feedback items 4, 6, 7, 8*

### 2.1 Trip Setup — Spacious Layout (item 4)

**Reference:** `trip-setup-v2.html` (approved mockup in `.superpowers/brainstorm/55-1775368102/content/`)

**Changes to `frontend/src/app/page.tsx`:**
- Field group vertical spacing: 22px between groups (up from ~14px)
- Field labels: uppercase, letter-spacing, with a trailing hairline rule (`::after` pseudo-element via inline style)
- Input height: 46px (padding `11px 14px`) — up from ~36px
- IATA pill displayed inside the input when an airport is selected
- Passenger counter: larger ± buttons (30px circles), larger value display (16px bold)
- Multi-destination section: clearly bordered card with its own header row
- Leg cards: sufficient internal padding (12px × 14px) with breathing room between legs
- Transport availability hint shown below each leg's transport toggle in italic gray/green

### 2.2 Hotel City Search — Replace City Code Input (item 8)

**Problem:** `HotelSearchForm` has a raw 3-letter city code input that users don't know.

**Changes to `frontend/src/components/hotels/HotelSearchForm.tsx`:**
- Replace the city code `<input>` with the existing `AirportSearch` combobox component
- `AirportSearch` receives a new optional prop `showCityCode?: boolean` — when true, each dropdown row shows the Amadeus city code (from `AIRPORT_TO_CITY` map) in a green badge alongside the airport name
- On selection, the component calls `onChange(iata)` as before; the parent derives the city code via `toCityCode(iata)`
- `AIRPORT_TO_CITY` mapping moves from `hotels/page.tsx` into a shared utility `frontend/src/utils/cityCodeMap.ts` so it can be used by both `AirportSearch` and the hotel page
- Label changes to "City or Airport"
- Consistency: same AirportSearch component is already used on Trip Setup — hotel search now matches that UX pattern

### 2.3 Auto-Fire Queries with Pre-filled Data (items 6, 7)

**Problem:** Users arrive at Segments/Hotels and must manually fill dates and click Search even when all data is already in `TripContext`.

**Segments page — auto-fire:**
- On mount, for each leg: if `leg.origin`, `leg.destination`, `leg.departure_date` are populated AND `leg.selected_flight` is null (flight mode) or transport mode is non-flight (auto-confirmed), trigger `handleSearch` automatically
- Show a loading spinner immediately; no "Search" button click needed
- If a search was already done and results exist in local state (or context cache), restore them without re-firing

**Hotels page — pre-filled dates + auto-fire:**
- `check_in` = `leg.departure_date` (the arrival date at the destination)
- `check_out` = next leg's `departure_date`, or return date if last leg; if neither exists, leave blank and show the date input editable
- City auto-detected from `leg.destination` via `toCityCode()`
- On mount: if city + both dates are resolvable, fire hotel search automatically
- Show `✓ Auto` badge on pre-filled date fields (green pill: `bg-green-100 text-green-800`)
- If any required input is missing, render the form in manual-input mode (no auto-fire, no badge)
- Results display immediately with a brief "Searching hotels…" spinner overlay

**No backend changes required** — the same search endpoints are called, just triggered automatically.

---

## Cluster 3 — UX Polish
*Covers feedback items 5, 10, 11*

### 3.1 AI Pick — Bullet Points (item 5)

**Problem:** AI reasoning is a dense paragraph that takes too long to read.

**Changes to `frontend/src/agents/flight_agent.py` + `hotel_agent.py`:**
- Update Claude prompt to return reasoning as a JSON array of 3–4 short bullet strings instead of a paragraph:
  ```json
  {
    "recommended_id": "offer_1",
    "reason_bullets": [
      "💰 Best value: $850/person — $120 cheaper than next option",
      "⏱ Nonstop 7h 30m — no layover risk",
      "✈ Reliable carrier: Air France strong JFK–CDG on-time record",
      "⏰ Good timing: morning departure, evening arrival"
    ]
  }
  ```
- Backend model: `FlightOffer.ai_reason` stays as `str` for backward compat; add `ai_reason_bullets: list[str] = []` field to `FlightOffer` and `HotelOffer`
- Frontend `FlightCard` / `HotelCard`: if `ai_reason_bullets` array is non-empty, render bullet list in the expanded panel; fall back to paragraph `ai_reason` if bullets are absent

**Changes to `frontend/src/components/flights/FlightCard.tsx` and `HotelCard.tsx`:**
- "Why this pick?" toggle button remains
- Expanded panel shows: title "✨ Why AI picked this" + 3–4 bullet rows with colored dot + emoji prefix
- Compact, scannable — each bullet is one line max

### 3.2 Duplicate Confirm Guard (item 10)

**Problem:** Users can click "Select" / "Confirm" on a flight or hotel multiple times, causing duplicate entries and inflated totals.

**Changes:**

*Flights (`segments/page.tsx`):*
- `SET_FLIGHT` reducer action replaces (not appends) the selection — already the case by design, but the UI must visually lock the selected card and disable re-selection of the same offer
- Once a flight is selected for a leg, the other flight cards show a muted "Select" button (not disabled — user can switch); clicking a different card replaces the current selection
- The selected card shows a green "✓ Selected" state that cannot be re-clicked to "confirm again"

*Hotels (`hotels/page.tsx`):*
- `ADD_HOTEL_STAY` reducer: before adding, check if a stay with the same `hotel.id` already exists for that leg; if so, replace it rather than append
- Hotel card "Confirm Stay" button changes to "✓ Stay Confirmed" (green, disabled) once selected for a leg
- Remove button available to deselect; clicking a different hotel replaces the current stay for that leg

### 3.3 Dynamic Validation + Next Button (item 11)

**Problem:** Users can't tell why the "Continue" button is disabled; no feedback near the button.

**Design — validation panel above the Continue button (all step pages):**
```
[When blocked]
⚠ Before you continue:
• Leg 1: No flight selected — search and pick a flight
• Leg 2: Train segment not confirmed — scroll down to confirm
[progress bar: 0 of 2 legs confirmed]    [Continue → (disabled, gray)]

[When ready]
✓ All segments confirmed — ready to continue
[progress bar: 2 of 2 legs confirmed]    [Continue → (active, indigo)]
```

- Validation state computed from `TripContext` on every render (no extra state needed)
- Progress bar (4px height, full width) shows `confirmedLegs / totalLegs` ratio, green when complete
- "Continue" button: `disabled` + gray when validation fails; indigo + enabled when all legs confirmed
- Validation messages are specific per leg and per failure type (not generic "please complete all steps")
- Same pattern applied to: Segments page, Hotels page

---

## File Change Summary

### Frontend files modified
| File | Change |
|---|---|
| `frontend/src/context/TripContext.tsx` | Add `UPDATE_TRIP_META`, `MARK_STALE`, `CLEAR_STALE` actions; add `staleSteps` to state |
| `frontend/src/components/Sidebar.tsx` | Hover-expand; collapsed number+icon stacked cell; stale amber state |
| `frontend/src/components/AirportSearch.tsx` | Add `showCityCode?: boolean` prop |
| `frontend/src/utils/cityCodeMap.ts` | Extract `AIRPORT_TO_CITY` mapping (moved from hotels/page.tsx) |
| `frontend/src/app/page.tsx` | Spacious layout; `UPDATE_TRIP_META` on edit; intentional-change save triggers; stale banner |
| `frontend/src/app/segments/page.tsx` | Auto-fire search on mount; duplicate-select guard; validation panel + progress bar |
| `frontend/src/app/hotels/page.tsx` | City dropdown; auto-fill dates; auto-fire search; duplicate-confirm guard; validation panel |
| `frontend/src/components/hotels/HotelSearchForm.tsx` | Replace city code input with AirportSearch; `✓ Auto` date badges |
| `frontend/src/components/flights/FlightCard.tsx` | Bullet-point AI reason panel; selected state lock |
| `frontend/src/components/hotels/HotelCard.tsx` | Bullet-point AI reason panel; confirmed state lock |

### Backend files modified
| File | Change |
|---|---|
| `backend/src/models/flight.py` | Add `ai_reason_bullets: list[str] = []` to `FlightOffer` |
| `backend/src/models/hotel.py` | Add `ai_reason_bullets: list[str] = []` to `HotelOffer` |
| `backend/src/agents/flight_agent.py` | Update Claude prompt to return `reason_bullets` array; parse and populate field |
| `backend/src/agents/hotel_agent.py` | Same as flight agent |

### New files
| File | Purpose |
|---|---|
| `frontend/src/utils/cityCodeMap.ts` | Shared airport IATA → Amadeus city code mapping |

---

## Data Flow — Stale Step Detection

```
User edits Trip Setup field
  → onChange / onBlur fires (intentional-change gate)
  → dispatch(UPDATE_TRIP_META | UPDATE_LEG)
  → reducer computes which downstream steps are invalidated
  → dispatch(MARK_STALE { keys: ["hotels-1", "segments-2"] })
  → Sidebar reads staleSteps → renders ⚠ amber chip
  → Page renders stale banner with specific action + navigation button
  → User clicks "Go to Hotels →" → navigates → re-completes step
  → dispatch(CLEAR_STALE { key: "hotels-1" })
  → Sidebar reverts to ✓ Done chip
```

---

## Testing Requirements

- All existing backend tests must remain green (54/54)
- New backend tests: `FlightOffer.ai_reason_bullets` parsing from Claude response
- Frontend: Playwright E2E covering:
  1. Sidebar hover-expand works; collapsed shows number + icon
  2. Navigate back to Trip Setup → form pre-fills from context
  3. Change destination → stale banner appears with correct step names and nav buttons
  4. Hotel page → dates auto-fill from segments; search auto-fires
  5. Hotel city dropdown filters and shows city code
  6. Flight/hotel AI pick panel shows bullet list (not paragraph)
  7. Cannot double-confirm a flight or hotel; total remains correct
  8. Continue button disabled with error list when legs incomplete; enabled when all confirmed
