# UI Polish & Modernization — Design Spec

**Date:** 2026-04-10  
**Scope:** Full visual redesign of all 5 pages + global shell  
**Approach:** High-impact pages first (Setup → Segments → Itinerary), Hotels + Export inherit the established pattern  
**Theme:** Bold/Immersive dark primary with light mode toggle  
**All existing UI features must be preserved** — this is a reskin + animation overhaul, not a feature cut

---

## 1. Design System

### 1.1 Color Tokens

| Token | Dark Mode | Light Mode | Usage |
|---|---|---|---|
| `--canvas-from` | `#0a1628` | `#FAF8F5` | Background gradient start |
| `--canvas-to` | `#0F2937` | `#FAF8F5` | Background gradient end |
| `--glass-1` | `rgba(255,255,255,0.04)` | `rgba(255,255,255,0.6)` | Base panels, sidebars |
| `--glass-2` | `rgba(255,255,255,0.07)` | `rgba(255,255,255,0.85)` | Standard cards |
| `--glass-3` | `rgba(255,255,255,0.11)` | `rgba(255,255,255,1)` | Selected / elevated |
| `--glass-border-1` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.06)` | Base border |
| `--glass-border-2` | `rgba(255,255,255,0.13)` | `rgba(0,0,0,0.09)` | Card border |
| `--glass-border-3` | `rgba(255,255,255,0.18)` | `rgba(0,0,0,0.12)` | Elevated border |
| `--accent` | `#E07A5F` | `#E07A5F` | Ember — CTA, prices, AI picks |
| `--accent-dark` | `#C96A4F` | `#C96A4F` | Hover / gradient end |
| `--accent-glow` | `rgba(224,122,95,0.3)` | `none` | Box-shadow glow on dark only |
| `--success` | `#6B9080` | `#6B9080` | Sage — selected, done states |
| `--success-glow` | `rgba(107,144,128,0.3)` | `none` | Box-shadow glow on dark only |
| `--warning` | `#D4A574` | `#D4A574` | Stale steps |
| `--text-primary` | `#FFFFFF` | `#1B3A4B` | Body text |
| `--text-muted` | `rgba(255,255,255,0.45)` | `#6B7280` | Secondary text |
| `--text-subtle` | `rgba(255,255,255,0.25)` | `#9CA3AF` | Tertiary / disabled |
| `--text-eyebrow` | `rgba(255,255,255,0.35)` | `rgba(27,58,75,0.5)` | Labels, eyebrows |

### 1.2 Glassmorphism Card System

Three elevation levels. All glass cards use `backdrop-filter: blur(12px)` on dark, `backdrop-filter: blur(8px)` on light.

| Level | Background | Border | Shadow | Usage |
|---|---|---|---|---|
| **Base (glass-1)** | `--glass-1` | `--glass-border-1` | none | Background panels, secondary sections, sidebar backgrounds |
| **Card (glass-2)** | `--glass-2` | `--glass-border-2` | `0 4px 24px rgba(0,0,0,0.3)` | Flight cards, hotel cards, POI cards, form containers |
| **Elevated (glass-3)** | `--glass-3` | `--glass-border-3` | `0 8px 32px rgba(0,0,0,0.4)` | Selected state, AI recommended highlight |

Selected state additionally gets: `box-shadow: 0 0 0 2px var(--success), 0 0 20px var(--success-glow)` (dark) / `0 0 0 2px var(--success)` (light).  
AI Pick gets: `border-color: rgba(224,122,95,0.4)`, `box-shadow: 0 0 20px var(--accent-glow)`.

### 1.3 Ambient Background System

Every page uses a full-viewport gradient canvas with two static radial glows (dark mode only):

```css
.page-canvas {
  background: linear-gradient(160deg, var(--canvas-from) 0%, var(--canvas-to) 60%, #0d1f30 100%);
  position: relative;
}
.page-canvas::before {  /* Ember glow — top right */
  content: '';
  position: fixed; top: -80px; right: -80px;
  width: 400px; height: 400px;
  background: radial-gradient(circle, rgba(224,122,95,0.12), transparent 70%);
  border-radius: 50%; pointer-events: none;
}
.page-canvas::after {   /* Sage glow — bottom left */
  content: '';
  position: fixed; bottom: -100px; left: -40px;
  width: 350px; height: 350px;
  background: radial-gradient(circle, rgba(107,144,128,0.08), transparent 70%);
  border-radius: 50%; pointer-events: none;
}
```

Light mode: solid `#FAF8F5` background, no pseudo-element glows.

### 1.4 Typography

| Role | Font | Size | Weight | Color | Other |
|---|---|---|---|---|---|
| Page title | DM Serif Display | 28–36px | 400 | `--text-primary` | Line height 1.1 |
| Title accent | DM Serif Display | same | 400 | `--accent` | Inline span within title |
| Eyebrow | DM Sans | 10px | 600 | `--text-eyebrow` | Uppercase, letter-spacing 2.5px |
| Section heading | DM Sans | 16–20px | 700 | `--text-primary` | |
| Card label | DM Sans | 12px | 600 | `--text-primary` | |
| Body / description | DM Sans | 13px | 400 | `--text-muted` | |
| Price / stat | DM Sans | 18–22px | 800 | `--accent` | |
| Caption | DM Sans | 10–11px | 400 | `--text-subtle` | |
| Airport code | DM Serif Display | 16–20px | 400 | `--text-primary` | |

### 1.5 Border Radius

| Component | Radius |
|---|---|
| Page-level containers | 0 (full bleed) |
| Cards (glass-2, glass-3) | `16px` |
| Sub-cards / nested glass | `12px` |
| Input fields | `10px` |
| Chips / badges | `999px` |
| Buttons (lg) | `12px` |
| Buttons (md) | `10px` |
| Buttons (sm) | `8px` |
| Day columns (drag targets) | `12px` |
| POI chips (drag items) | `8px` |

---

## 2. Animation System

All animations use Framer Motion. No CSS keyframe animations for interactive elements (CSS keyframes only for ambient shimmer and glow pulses).

### 2.1 Page Transitions

Replace the current `PageTransition` component:

```tsx
// New PageTransition — spring slide-up
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -10 }}
  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
>
```

Wrap in `<AnimatePresence mode="wait">` in `LayoutShell.tsx` around `{children}` so exit + enter don't overlap across route changes.

### 2.2 Card Stagger

Flight cards, hotel cards, POI suggestion cards — all lists use stagger:

```tsx
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } }
}
const item = {
  hidden: { opacity: 0, y: 10, scale: 0.96 },
  show:   { opacity: 1, y: 0,  scale: 1,
             transition: { type: 'spring', stiffness: 300, damping: 28 } }
}
// <motion.ul variants={container}> ... <motion.li variants={item}>
```

### 2.3 Micro-interactions

| Element | Interaction | Animation |
|---|---|---|
| All buttons | Press | `whileTap={{ scale: 0.97 }}` |
| Selectable cards (flight, hotel) | Hover | `whileHover={{ y: -2 }}` + CSS glow transition |
| Selectable cards | Select | layout animation — border/background transition via Framer `animate` |
| Filter chips | Toggle | `whileTap={{ scale: 0.95 }}`, background transition 150ms |
| Input fields | Focus | ring animates in via `transition: box-shadow 200ms ease` |
| AI Pick "Why" toggle | Expand | `AnimatePresence` with `height: 'auto'` + opacity (already exists, keep) |
| Stale banner | Appear | slide down from top with spring |
| Toast notifications | Appear/dismiss | slide in from right, fade out |
| Sidebar expand | Desktop hover | `width` spring transition (already exists — upgrade to spring) |
| Sidebar step labels | Appear | `AnimatePresence` with fade + x: -4 → 0 |
| Status chips | State change | Framer `layout` animation |
| Progress bar | Fill | CSS transition width 600ms ease |
| Theme toggle | Switch | clip-path circle reveal from toggle position |

### 2.4 Loading States

**Skeleton shimmer (dark mode):** Replace existing warm shimmer with dark glass version:
```css
.skeleton-shimmer-dark {
  background: linear-gradient(90deg,
    rgba(255,255,255,0.04) 25%,
    rgba(255,255,255,0.08) 50%,
    rgba(255,255,255,0.04) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.8s infinite;
}
```

**AI thinking state:** When waiting for Claude responses, the `Sparkles` icon in the AI Suggestions header gets a pulsing ember glow animation:
```css
@keyframes ai-pulse {
  0%, 100% { filter: drop-shadow(0 0 4px rgba(224,122,95,0.4)); }
  50%       { filter: drop-shadow(0 0 12px rgba(224,122,95,0.8)); }
}
```

**Progressive card reveal:** Cards don't wait for all data — reveal as each card arrives using the stagger system.

### 2.5 Drag-and-Drop (Itinerary)

dnd-kit already in use. Enhancements:
- **Drag ghost:** `DragOverlay` component with `opacity: 0.85`, `scale: 1.04`, ember `box-shadow` glow
- **Drop target:** Active drop zone gets `border-color: rgba(224,122,95,0.5)` + subtle pulse animation
- **Drop success:** Dropped item plays a brief scale bounce (spring, `0.96 → 1.04 → 1`)

---

## 3. Page-by-Page Redesign

### 3.1 Global Shell — Sidebar (`Sidebar.tsx`)

**Desktop rail (collapsed, w-12):**
- Background: `#071420` (deeper than canvas)
- Brand mark: Plane icon in ember
- Step icons: numbered circle — active gets ember bg/border, done gets sage check, locked gets 20% white
- Stale indicator: amber dot in top-right of icon (already exists — keep)
- No visual changes to information shown

**Desktop expanded (w-56):**
- Step labels fade + slide in with `AnimatePresence`
- Status chips animate between states with Framer `layout`
- Trip summary section: same content, glass-1 background
- Pin toggle: same behavior

**Mobile:**
- Hamburger top bar: glass-1 background instead of `navy-sidebar`
- Slide-in drawer: spring `x` animation via Framer instead of CSS `translate-x`
- Backdrop: `motion.div` with `opacity: 0 → 0.6` fade

### 3.2 Setup Page (`/`)

**Layout:** Full-viewport dark canvas. Single centered column (max-w-lg), vertically centered with `min-h-screen flex items-center`.

**Hero section (above form):**
- Eyebrow: `Step 1 of 5 · Trip Setup`
- Title: DM Serif 32px — `"Where are you"` + line break + `"headed?"` with "headed?" in `--accent`
- Subtitle: `"Build your journey, one destination at a time."` in `--text-muted`

**Form container:** glass-2 card (`p-8`). All existing fields preserved:
- From/To airport search — glass-sm inputs with eyebrow labels
- Departure / Return date — glass-sm inputs
- Adults / Children counters — same stepper UI, glass-sm container
- Currency selector — glass-sm styled `<select>`
- Multi-destination toggle — custom toggle switch (replaces plain checkbox)
- Multi-destination leg builder — same `LegCard` components, glass-2 styled
- Stale banner — slides down from above form with spring animation

**Button:** Full-width ember gradient button with glow, `whileTap={{ scale: 0.97 }}`.

**Inputs:** All native `<input>` and `<select>` elements get dark-mode CSS:
```css
input, select {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  color: white;
  border-radius: 10px;
}
input:focus, select:focus {
  border-color: rgba(224,122,95,0.5);
  box-shadow: 0 0 0 3px rgba(224,122,95,0.15);
}
```

### 3.3 Segments Page (`/segments`)

**Layout:** Dark canvas. Left: main content area. Sidebar rail always visible.

**Per-leg section:**
- Eyebrow: `Leg N · ORG → DST · Date`
- Title: `Select Your Flight` (or Train / Ferry / Car depending on mode)
- Progress bar below title: fills as legs are completed

**Transport mode selector:** Same 4 modes, glass-sm buttons with mode-specific accent colors. Selected mode gets elevated glass-3 + glow.

**Search form (`FlightSearchForm`, `HotelSearchForm`, etc.):** glass-2 card, same fields.

**Result cards:**
- `FlightCard`, `TrainSegmentCard`, `FerrySegmentCard`, `CarSegmentCard` — all get glass-2 treatment
- AI Pick: glass-3 + ember border + ember glow. `✦ AI Pick` badge in ember top-left
- Selected: glass-3 + sage ring + sage glow
- Stagger animation on list render
- `whileHover={{ y: -2 }}` on unselected cards
- `whileTap={{ scale: 0.99 }}` on all cards

**AI reason expand:** Already uses Framer Motion — keep, style to match dark theme.

**Sort bar / Filter bar:** glass-1 sticky bar below title. Chips get `whileTap` + active ember bg.

### 3.4 Hotels Page (`/hotels`)

**Layout:** Same as Segments. Dark canvas + sidebar rail.

**Hotel cards (`HotelCard`):** glass-2. Key info:
- Hotel name in DM Serif 16px
- Nightly rate in ember accent (large)  
- Stars as small filled circles in amber/gold
- AI Pick: same ember glow treatment as flight cards
- Selected: sage ring

All existing hotel stay / check-in / check-out fields preserved.

### 3.5 Itinerary Page (`/itinerary`)

**Layout:** Three-panel: nav rail | suggestions sidebar | day planner + map

**Suggestions Sidebar (`SuggestionsSidebar`):**
- Background: `rgba(7,20,32,0.75)` with `backdrop-filter: blur(16px)`
- Header: `✦ AI Picks` in ember + count in muted
- Filter chips: ember active, glass-sm inactive
- POI cards: glass-sm. AI top pick gets ember left-border (`border-left: 2px solid --accent`)
- `BusyTimesBar`: same bars, dark bg
- Collapsed state: same chevron button, glass-1 styling
- `onAdd` animation: card briefly scales up + fades out before moving to unscheduled list

**Day Planner (`DayPlanner` / `DayColumn`):**
- Day column header: eyebrow style
- Column background: glass-1
- Empty column: dashed border `rgba(255,255,255,0.12)`, "Drop here" in subtle text
- POI chips: glass-sm drag items
- `DistanceConnector`: same component, dimmed white (`rgba(255,255,255,0.25)`)
- Drag ghost: `DragOverlay` with scale 1.04 + ember glow
- Drop zone active: ember border pulse

**Map (`TripMap`):**
- Google Maps iframe/component unchanged functionally
- Map container: rounded-xl border `rgba(255,255,255,0.08)`
- Controls overlay (day selector, legend): glass-2 panel over map

**Unscheduled POIs row:** glass-1 horizontal scrollable strip below planner.

### 3.6 Export Page (`/export`)

**Layout:** Dark canvas. Single column, max-w-2xl.

**Header:** DM Serif title `"Your Trip Summary"`, subtitle with trip origin + dates.

**Leg sections (`ItinerarySummary`):** Each leg is a glass-2 card with:
- Leg header: eyebrow + route in DM Serif
- Flight/transport row: same info, styled with glass-sm inset
- Hotel rows: same
- Day itinerary: POI list with icons

**Export buttons (`ExportButtons`):**
- PDF: ember gradient full-width button with glow
- JSON: ghost button (glass-sm with white border)

---

## 4. Light Mode

**Toggle:** Sun/Moon icon button in the sidebar (below pin toggle). Stores preference in `localStorage`, applies `data-theme="light"` to `<html>`.

**Implementation:** All color tokens are CSS custom properties on `:root`. A `[data-theme="light"]` selector overrides the dark values. No separate component trees.

**Theme toggle animation:** `clip-path: circle(0% at Xpx Ypx)` expands to `circle(150% ...)` on the new-theme overlay, triggered from the toggle button's position.

**Light mode surface rules:**
- Canvas: solid `#FAF8F5`, no ambient glows, no `backdrop-filter`
- Glass-2 cards: `background: white`, `border: 1px solid rgba(0,0,0,0.08)`, `box-shadow: 0 1px 3px rgba(27,58,75,0.08)`
- Inputs: white background, `border: 1px solid #e5e7eb`
- Text: `--text-primary: #1B3A4B`, `--text-muted: #6B7280`
- Accent/success/warning colors: unchanged
- No glows (`box-shadow` glow effects removed in light mode)

---

## 5. Tailwind Config Changes

### 5.1 Color tokens

Add only solid/hex colors to `tailwind.config.ts`. **Do not add `rgba()` glass values as Tailwind color tokens** — `rgba()` strings don't compose with Tailwind's opacity modifier syntax (`bg-glass-1/50` would not work), and JIT cannot resolve them reliably at build time. Glass surfaces are applied by the `GlassCard` component via CSS custom properties instead (see Section 6).

```ts
colors: {
  canvas: { from: '#0a1628', to: '#0F2937', mid: '#0d1f30' },
  // accent, success, warning already exist — no changes needed
}
```

### 5.2 New keyframes

```ts
keyframes: {
  'ai-pulse': {
    '0%, 100%': { filter: 'drop-shadow(0 0 4px rgba(224,122,95,0.4))' },
    '50%':       { filter: 'drop-shadow(0 0 12px rgba(224,122,95,0.8))' },
  },
  'glow-pulse': {
    '0%, 100%': { opacity: '0.6' },
    '50%':       { opacity: '1' },
  }
},
animation: {
  'ai-pulse': 'ai-pulse 2s ease-in-out infinite',
  'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
}
```

### 5.3 Global CSS responsibilities

`globals.css` owns:
- All CSS custom property declarations (`:root` dark defaults + `[data-theme="light"]` overrides)
- `.page-canvas` with pseudo-element ambient glows
- Dark-mode input/select base styles
- `.skeleton-shimmer-dark` keyframe
- `@keyframes ai-pulse` and `@keyframes glow-pulse` (Tailwind `animation` utilities reference these)

---

## 6. New Components

| Component | Purpose |
|---|---|
| `ThemeToggle` | Sun/Moon icon button, dispatches theme token swap + clip-path animation |
| `GlassCard` | Wrapper div with glass level prop (`1 \| 2 \| 3`), applies correct bg/border/shadow |
| `AnimatedList` | `motion.ul` + `motion.li` wired to stagger variants |
| `EmbedGlow` | Reusable ember or sage `box-shadow` glow on any element |
| `AIPulseBadge` | `✦ AI Pick` badge with pulsing glow when in loading state |

Existing components updated in place — no deletions, no feature removals.

---

## 7. Constraints & Preservation

- All 5 funnel steps preserved with identical routing and logic
- All existing form fields, validations, and API integrations untouched
- dnd-kit drag-and-drop preserved — only drag ghost and drop zone visuals enhanced
- Google Maps component preserved — only container border/overlay panel restyled
- TripContext, reducers, sessionStorage persistence — no changes
- Playwright e2e tests: selectors based on `data-testid` attributes will continue to work; update screenshot baselines

---

## 8. Implementation Order

1. **Design tokens + globals** — CSS variables, ambient canvas, input dark styles, Tailwind additions
2. **Core components** — `GlassCard`, `AnimatedList`, `ThemeToggle`, `Button` micro-interactions, `PageTransition` upgrade
3. **Sidebar** — desktop spring expand, mobile Framer drawer, step icon animations
4. **Setup page** — hero layout, glass form, stale banner animation
5. **Segments page** — glass flight/transport cards, stagger, AI Pick glow, sort/filter bar
6. **Itinerary page** — suggestions sidebar, day columns, drag ghost, map container
7. **Hotels page** — hotel cards (inherits segment card pattern)
8. **Export page** — summary cards, export buttons
9. **Light mode** — CSS token override layer + theme toggle + clip-path transition
10. **Skeleton + loading states** — dark shimmer, AI pulse, progressive reveal
