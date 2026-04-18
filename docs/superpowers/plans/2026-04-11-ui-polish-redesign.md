# UI Polish & Modernization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the entire travel-agent app to the Bold/Immersive dark design system while preserving every feature.

**Architecture:** All color tokens become CSS custom properties on `:root` (dark defaults) with `[data-theme="light"]` overrides. Three-level glassmorphism replaces the existing white card system. Framer Motion spring physics replace all CSS transitions on interactive elements. New shared primitives (`GlassCard`, `AnimatedList`, `ThemeToggle`, `AIPulseBadge`) are composed across all pages.

**Tech Stack:** Next.js 14 App Router, Framer Motion (already installed), Tailwind CSS, Lucide React, DM Serif Display + DM Sans (already loaded via `next/font`)

---

## File Map

**Modified:**
- `frontend/src/app/globals.css` — CSS custom properties, page-canvas, input dark styles, skeleton shimmer dark, keyframes
- `frontend/tailwind.config.ts` — canvas color tokens, ai-pulse/glow-pulse keyframes + animations
- `frontend/src/app/layout.tsx` — add `page-canvas` to body, add `data-theme` attribute handling
- `frontend/src/components/LayoutShell.tsx` — wrap children in AnimatePresence for page transitions
- `frontend/src/components/ui/PageTransition.tsx` — upgrade to spring slide-up
- `frontend/src/components/ui/Button.tsx` — add Framer Motion whileTap + ember gradient for primary
- `frontend/src/components/ui/Skeleton.tsx` — use dark glass shimmer
- `frontend/src/components/Sidebar.tsx` — Framer Motion spring expand, mobile drawer, ThemeToggle, step icons
- `frontend/src/app/page.tsx` (Setup) — hero section, glass form container, dark inputs
- `frontend/src/app/segments/page.tsx` — glass cards, stagger, animated sort/filter bar
- `frontend/src/components/flights/FlightCard.tsx` — glass-2, AI Pick glow, stagger item, whileHover/whileTap
- `frontend/src/components/segments/TrainSegmentCard.tsx` — glass-2, same treatment
- `frontend/src/components/segments/FerrySegmentCard.tsx` — glass-2, same treatment
- `frontend/src/components/segments/CarSegmentCard.tsx` — glass-2, same treatment
- `frontend/src/components/hotels/HotelCard.tsx` — glass-2, sage ring, AI Pick glow, stagger
- `frontend/src/app/hotels/page.tsx` — glass layout, stagger lists
- `frontend/src/components/itinerary/SuggestionsSidebar.tsx` — dark glass panel
- `frontend/src/components/itinerary/DayColumn.tsx` — glass-1 column, dashed drop zone
- `frontend/src/components/itinerary/DayPlanner.tsx` — DragOverlay ghost + ember glow
- `frontend/src/components/itinerary/TripMap.tsx` — glass map container
- `frontend/src/components/export/ItinerarySummary.tsx` — glass-2 leg cards
- `frontend/src/components/export/ExportButtons.tsx` — ember primary, ghost secondary
- `frontend/src/app/export/page.tsx` — glass layout

**Created:**
- `frontend/src/components/ui/GlassCard.tsx` — 3-level glass wrapper (level 1|2|3)
- `frontend/src/components/ui/AnimatedList.tsx` — motion.ul + stagger variants
- `frontend/src/components/ui/ThemeToggle.tsx` — Sun/Moon toggle, localStorage, data-theme on html
- `frontend/src/components/ui/AIPulseBadge.tsx` — ✦ AI Pick badge with optional pulsing glow

---

## Task 1: Design Tokens + Globals

**Files:**
- Modify: `frontend/src/app/globals.css`
- Modify: `frontend/tailwind.config.ts`
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Replace globals.css with full design token system**

Replace the entire contents of `frontend/src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ── Dark mode defaults (root) ───────────────────────────────────────────── */
:root {
  --canvas-from:        #0a1628;
  --canvas-to:          #0F2937;
  --canvas-mid:         #0d1f30;
  --glass-1:            rgba(255,255,255,0.04);
  --glass-2:            rgba(255,255,255,0.07);
  --glass-3:            rgba(255,255,255,0.11);
  --glass-border-1:     rgba(255,255,255,0.08);
  --glass-border-2:     rgba(255,255,255,0.13);
  --glass-border-3:     rgba(255,255,255,0.18);
  --accent:             #E07A5F;
  --accent-dark:        #C96A4F;
  --accent-glow:        rgba(224,122,95,0.3);
  --success:            #6B9080;
  --success-glow:       rgba(107,144,128,0.3);
  --warning:            #D4A574;
  --text-primary:       #FFFFFF;
  --text-muted:         rgba(255,255,255,0.45);
  --text-subtle:        rgba(255,255,255,0.25);
  --text-eyebrow:       rgba(255,255,255,0.35);
  --background:         #0a1628;
  --foreground:         #FFFFFF;
}

/* ── Light mode overrides ────────────────────────────────────────────────── */
[data-theme="light"] {
  --canvas-from:        #FAF8F5;
  --canvas-to:          #FAF8F5;
  --glass-1:            rgba(255,255,255,0.6);
  --glass-2:            rgba(255,255,255,0.85);
  --glass-3:            rgba(255,255,255,1);
  --glass-border-1:     rgba(0,0,0,0.06);
  --glass-border-2:     rgba(0,0,0,0.09);
  --glass-border-3:     rgba(0,0,0,0.12);
  --accent-glow:        transparent;
  --success-glow:       transparent;
  --text-primary:       #1B3A4B;
  --text-muted:         #6B7280;
  --text-subtle:        #9CA3AF;
  --text-eyebrow:       rgba(27,58,75,0.5);
  --background:         #FAF8F5;
  --foreground:         #1B3A4B;
}

/* ── Body ────────────────────────────────────────────────────────────────── */
body {
  color: var(--text-primary);
  background: var(--background);
}

/* ── Ambient canvas ──────────────────────────────────────────────────────── */
.page-canvas {
  background: linear-gradient(160deg, var(--canvas-from) 0%, var(--canvas-to) 60%, var(--canvas-mid) 100%);
  min-height: 100vh;
  position: relative;
}

.page-canvas::before {
  content: '';
  position: fixed; top: -80px; right: -80px;
  width: 400px; height: 400px;
  background: radial-gradient(circle, rgba(224,122,95,0.12), transparent 70%);
  border-radius: 50%; pointer-events: none; z-index: 0;
}

.page-canvas::after {
  content: '';
  position: fixed; bottom: -100px; left: -40px;
  width: 350px; height: 350px;
  background: radial-gradient(circle, rgba(107,144,128,0.08), transparent 70%);
  border-radius: 50%; pointer-events: none; z-index: 0;
}

[data-theme="light"] .page-canvas::before,
[data-theme="light"] .page-canvas::after {
  display: none;
}

/* ── Dark input base styles ──────────────────────────────────────────────── */
input[type="text"],
input[type="date"],
input[type="number"],
input[type="search"],
input[type="email"],
select,
textarea {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  color: var(--text-primary);
  border-radius: 10px;
}

input[type="text"]:focus,
input[type="date"]:focus,
input[type="number"]:focus,
input[type="search"]:focus,
input[type="email"]:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: rgba(224,122,95,0.5);
  box-shadow: 0 0 0 3px rgba(224,122,95,0.15);
}

[data-theme="light"] input[type="text"],
[data-theme="light"] input[type="date"],
[data-theme="light"] input[type="number"],
[data-theme="light"] input[type="search"],
[data-theme="light"] input[type="email"],
[data-theme="light"] select,
[data-theme="light"] textarea {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  color: #1B3A4B;
}

/* ── Date input calendar icon color fix ────────────────────────────────────*/
input[type="date"]::-webkit-calendar-picker-indicator {
  filter: invert(1) opacity(0.5);
}
[data-theme="light"] input[type="date"]::-webkit-calendar-picker-indicator {
  filter: none;
}

/* ── Select dropdown option styling ────────────────────────────────────────*/
select option {
  background: #0F2937;
  color: #ffffff;
}
[data-theme="light"] select option {
  background: #ffffff;
  color: #1B3A4B;
}

/* ── Skeleton shimmer (dark) ────────────────────────────────────────────── */
.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    rgba(255,255,255,0.04) 25%,
    rgba(255,255,255,0.08) 50%,
    rgba(255,255,255,0.04) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.8s infinite;
}

[data-theme="light"] .skeleton-shimmer {
  background: linear-gradient(
    90deg,
    #f0ede8 25%,
    #e8e4de 50%,
    #f0ede8 75%
  );
  background-size: 200% 100%;
}

/* ── Keyframes ───────────────────────────────────────────────────────────── */
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}

@keyframes ai-pulse {
  0%, 100% { filter: drop-shadow(0 0 4px rgba(224,122,95,0.4)); }
  50%       { filter: drop-shadow(0 0 12px rgba(224,122,95,0.8)); }
}

@keyframes glow-pulse {
  0%, 100% { opacity: 0.6; }
  50%       { opacity: 1; }
}

/* ── Legacy compatibility ────────────────────────────────────────────────── */
@layer components {
  .card-base {
    @apply rounded-2xl;
    background: var(--glass-2);
    border: 1px solid var(--glass-border-2);
    box-shadow: 0 4px 24px rgba(0,0,0,0.3);
    backdrop-filter: blur(12px);
  }
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
```

- [ ] **Step 2: Update tailwind.config.ts with canvas tokens + animation keyframes**

Replace the entire contents of `frontend/tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "#FFFFFF",
        primary: {
          DEFAULT: "#1B3A4B",
          light: "#2A5068",
          dark: "#0F2937",
        },
        accent: {
          DEFAULT: "#E07A5F",
          light: "#E8967F",
          dark: "#C96A4F",
        },
        success: {
          DEFAULT: "#6B9080",
          light: "#8AB09F",
          dark: "#557363",
        },
        warning: {
          DEFAULT: "#D4A574",
          light: "#E0BC94",
          dark: "#B88E5F",
        },
        muted: "#6B7280",
        subtle: "#9CA3AF",
        charcoal: "#2D2D2D",
        navy: {
          DEFAULT: "#1B3A4B",
          sidebar: "#071420",
        },
        canvas: {
          from: "#0a1628",
          to: "#0F2937",
          mid: "#0d1f30",
        },
      },
      fontFamily: {
        display: ["var(--font-dm-serif)", "Georgia", "serif"],
        body: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 4px 24px rgba(0,0,0,0.3)",
        "card-hover": "0 8px 32px rgba(0,0,0,0.4)",
        warm: "0 4px 14px rgba(139,90,43,0.08)",
      },
      borderRadius: {
        card: "16px",
      },
      keyframes: {
        "fade-in-up": {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "ai-pulse": {
          "0%, 100%": { filter: "drop-shadow(0 0 4px rgba(224,122,95,0.4))" },
          "50%":       { filter: "drop-shadow(0 0 12px rgba(224,122,95,0.8))" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.6" },
          "50%":       { opacity: "1" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.3s ease-out",
        shimmer: "shimmer 1.8s infinite",
        "ai-pulse": "ai-pulse 2s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 3: Add page-canvas + data-theme to layout.tsx**

Replace `frontend/src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { DM_Serif_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import { TripContextProvider } from "@/context/TripContext";
import { LayoutShell } from "@/components/LayoutShell";
import { ToastProvider } from "@/components/ui/Toast";

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dm-serif",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "Travel Agent Assistant",
  description: "AI-powered trip planner",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${dmSerif.variable} ${dmSans.variable} font-body page-canvas`}>
        <TripContextProvider>
          <ToastProvider>
            <LayoutShell>{children}</LayoutShell>
          </ToastProvider>
        </TripContextProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Verify in browser — body should now show dark gradient**

Run `cd frontend && npm run dev`. Open http://localhost:3000 — the background should be dark navy gradient with subtle ember/sage glows visible.

---

## Task 2: Core UI Primitives

**Files:**
- Create: `frontend/src/components/ui/GlassCard.tsx`
- Create: `frontend/src/components/ui/AnimatedList.tsx`
- Create: `frontend/src/components/ui/AIPulseBadge.tsx`
- Modify: `frontend/src/components/ui/PageTransition.tsx`
- Modify: `frontend/src/components/LayoutShell.tsx`
- Modify: `frontend/src/components/ui/Button.tsx`

- [ ] **Step 1: Create GlassCard.tsx**

Create `frontend/src/components/ui/GlassCard.tsx`:

```tsx
"use client";

import React from "react";

type GlassLevel = 1 | 2 | 3;

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  level?: GlassLevel;
  as?: "div" | "article" | "section" | "li";
  selected?: boolean;
  aiPick?: boolean;
}

const levelStyles: Record<GlassLevel, React.CSSProperties> = {
  1: {
    background: "var(--glass-1)",
    border: "1px solid var(--glass-border-1)",
    backdropFilter: "blur(12px)",
  },
  2: {
    background: "var(--glass-2)",
    border: "1px solid var(--glass-border-2)",
    backdropFilter: "blur(12px)",
    boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
  },
  3: {
    background: "var(--glass-3)",
    border: "1px solid var(--glass-border-3)",
    backdropFilter: "blur(12px)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  },
};

export function GlassCard({
  level = 2,
  as: Tag = "div",
  selected = false,
  aiPick = false,
  children,
  style,
  className = "",
  ...props
}: GlassCardProps) {
  const baseStyle = levelStyles[level];

  const selectedStyle: React.CSSProperties = selected
    ? {
        border: "1px solid var(--success)",
        boxShadow: "0 0 0 2px var(--success), 0 0 20px var(--success-glow), 0 8px 32px rgba(0,0,0,0.4)",
      }
    : {};

  const aiStyle: React.CSSProperties = aiPick
    ? {
        border: "1px solid rgba(224,122,95,0.4)",
        boxShadow: "0 0 20px var(--accent-glow), 0 4px 24px rgba(0,0,0,0.3)",
      }
    : {};

  return (
    <Tag
      style={{ ...baseStyle, ...aiStyle, ...selectedStyle, ...style }}
      className={["rounded-2xl", className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </Tag>
  );
}
```

- [ ] **Step 2: Create AnimatedList.tsx**

Create `frontend/src/components/ui/AnimatedList.tsx`:

```tsx
"use client";

import React from "react";
import { motion } from "framer-motion";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

export const listItemVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.96 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 28 },
  },
};

interface AnimatedListProps {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedList({ children, className = "" }: AnimatedListProps) {
  return (
    <motion.ul
      variants={container}
      initial="hidden"
      animate="show"
      className={["space-y-3", className].filter(Boolean).join(" ")}
    >
      {children}
    </motion.ul>
  );
}

export function AnimatedListItem({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.li variants={listItemVariants} className={className}>
      {children}
    </motion.li>
  );
}
```

- [ ] **Step 3: Create AIPulseBadge.tsx**

Create `frontend/src/components/ui/AIPulseBadge.tsx`:

```tsx
"use client";

import React from "react";
import { Sparkles } from "lucide-react";

interface AIPulseBadgeProps {
  pulsing?: boolean;
  className?: string;
}

export function AIPulseBadge({ pulsing = false, className = "" }: AIPulseBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full font-body",
        "text-white",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        background: "linear-gradient(135deg, var(--accent), var(--accent-dark))",
        boxShadow: "0 0 12px var(--accent-glow)",
      }}
    >
      <Sparkles
        size={10}
        className={pulsing ? "animate-ai-pulse" : ""}
      />
      ✦ AI Pick
    </span>
  );
}
```

- [ ] **Step 4: Upgrade PageTransition.tsx to spring slide-up**

Replace `frontend/src/components/ui/PageTransition.tsx`:

```tsx
"use client";

import React from "react";
import { motion } from "framer-motion";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className = "" }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 5: Add AnimatePresence to LayoutShell.tsx**

Replace `frontend/src/components/LayoutShell.tsx`:

```tsx
"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/Sidebar";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [pinned, setPinned] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <Sidebar pinned={pinned} onPinChange={setPinned} />
      <main
        className={[
          "min-h-screen transition-all duration-300 relative z-10",
          "pt-11",
          pinned ? "md:pt-0 md:pl-56" : "md:pt-0 md:pl-12",
        ].join(" ")}
      >
        <AnimatePresence mode="wait">
          <div key={pathname}>
            {children}
          </div>
        </AnimatePresence>
      </main>
    </>
  );
}
```

- [ ] **Step 6: Add whileTap + ember gradient to Button.tsx**

Replace `frontend/src/components/ui/Button.tsx`:

```tsx
"use client";

import React from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "success" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:   "text-white shadow-sm hover:shadow-md",
  secondary: "text-white border border-white/20 hover:border-white/40",
  ghost:     "text-white/60 hover:text-white hover:bg-white/10",
  success:   "bg-success text-white hover:bg-success-light shadow-sm hover:shadow-md",
  danger:    "bg-red-500 text-white hover:bg-red-600 shadow-sm hover:shadow-md",
};

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary:   {
    background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%)",
    boxShadow: "0 0 20px var(--accent-glow)",
  },
  secondary: { background: "var(--glass-2)" },
  ghost:     {},
  success:   {},
  danger:    {},
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs font-medium rounded-lg gap-1.5",
  md: "px-4 py-2 text-sm font-medium rounded-[10px] gap-2",
  lg: "px-6 py-3 text-sm font-semibold rounded-xl gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  icon,
  children,
  className = "",
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      whileTap={isDisabled ? undefined : { scale: 0.97 }}
      disabled={isDisabled}
      style={{ ...variantStyles[variant], ...style }}
      className={[
        "inline-flex items-center justify-center transition-all duration-150 font-body",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...(props as React.ComponentPropsWithoutRef<typeof motion.button>)}
    >
      {loading ? (
        <Loader2 className="animate-spin shrink-0" size={size === "sm" ? 12 : 14} />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </motion.button>
  );
}
```

- [ ] **Step 7: Verify buttons and page transitions in browser**

Open http://localhost:3000. Buttons should have ember gradient. Navigating between pages should have a spring slide-up animation.

---

## Task 3: Sidebar Redesign

**Files:**
- Create: `frontend/src/components/ui/ThemeToggle.tsx`
- Modify: `frontend/src/components/Sidebar.tsx`

- [ ] **Step 1: Create ThemeToggle.tsx**

Create `frontend/src/components/ui/ThemeToggle.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as "dark" | "light" | null;
    if (stored) {
      setTheme(stored);
      document.documentElement.setAttribute("data-theme", stored === "light" ? "light" : "");
    }
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    if (next === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={toggle}
      className="w-full flex items-center justify-center py-3 border-t border-white/10 text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors duration-150"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
    </motion.button>
  );
}
```

- [ ] **Step 2: Rewrite Sidebar.tsx with Framer Motion**

Replace the entire contents of `frontend/src/components/Sidebar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTripContext } from "@/context/TripContext";
import { calcNights } from "@/utils/dateUtils";
import { formatPrice } from "@/utils/formatPrice";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import type { TransportMode } from "@/types/trip";
import {
  Plane, Train, Ship, Car, Hotel, Calendar, Download,
  Menu, X, Pin, PinOff, Check, AlertTriangle, Lock,
} from "lucide-react";

const STEPS = [
  { label: "Trip Setup",  Icon: Plane,     href: "/",          staleKey: "trip-setup" },
  { label: "Segments",    Icon: Plane,     href: "/segments",  staleKey: "segments" },
  { label: "Hotels",      Icon: Hotel,     href: "/hotels",    staleKey: "hotels" },
  { label: "Itinerary",   Icon: Calendar,  href: "/itinerary", staleKey: "itinerary" },
  { label: "Export",      Icon: Download,  href: "/export",    staleKey: "export" },
];

const TRANSPORT_ICONS: Record<TransportMode, React.ReactNode> = {
  flight: <Plane size={12} />,
  train:  <Train size={12} />,
  ferry:  <Ship  size={12} />,
  car:    <Car   size={12} />,
};

type StepStatus = "active" | "done" | "stale" | "locked";

function TripSummary({ staleSteps }: { staleSteps: string[] }) {
  const { state } = useTripContext();
  const { tripContext } = state;

  if (!tripContext.home_origin && tripContext.legs.length === 0) {
    return (
      <p style={{ color: "var(--text-subtle)" }} className="italic text-xs font-body">
        Start planning your trip →
      </p>
    );
  }

  const firstDestination = tripContext.legs[0]?.destination;
  const routeLabel =
    tripContext.home_origin && firstDestination
      ? `${tripContext.home_origin} → ${firstDestination}`
      : tripContext.home_origin || firstDestination || null;

  let totalCost = 0;

  return (
    <div className="space-y-2">
      {routeLabel && (
        <p className="font-display font-medium truncate text-sm" style={{ color: "var(--text-primary)" }}>
          {routeLabel}
        </p>
      )}
      {tripContext.legs.map((leg) => {
        const transportIcon = leg.transport_mode ? TRANSPORT_ICONS[leg.transport_mode] : TRANSPORT_ICONS.flight;
        const legIsStale =
          staleSteps.some((k) => k.startsWith(`segments-${leg.leg_number}`)) ||
          staleSteps.some((k) => k.startsWith(`hotels-${leg.leg_number}`));

        const flightLine = leg.selected_flight ? (() => {
          const f = leg.selected_flight!;
          totalCost += f.price;
          const seg = f.segments[0];
          const flightNum = seg ? `${seg.carrier_code}${seg.flight_number}` : "Flight";
          return (
            <p
              key={`flight-${leg.leg_number}`}
              className="truncate flex items-center gap-1 text-xs font-body"
              style={{ color: legIsStale ? "var(--warning)" : "var(--success)" }}
            >
              <span className="shrink-0">{transportIcon}</span>
              <span>{flightNum} · {formatPrice(f.price, f.currency)}</span>
            </p>
          );
        })() : null;

        const hotelLines = leg.hotel_stays.map((stay) => {
          const nights = calcNights(stay.check_in, stay.check_out);
          totalCost += stay.hotel.price_per_night * nights;
          return (
            <p
              key={`hotel-${stay.hotel.id}`}
              className="truncate flex items-center gap-1 text-xs font-body"
              style={{ color: legIsStale ? "var(--warning)" : "var(--text-muted)" }}
            >
              <Hotel size={12} className="shrink-0" />
              <span>{stay.hotel.name}</span>
            </p>
          );
        });

        return (
          <div key={leg.leg_number} className="space-y-0.5">
            {flightLine}
            {hotelLines}
          </div>
        );
      })}
      {totalCost > 0 && (
        <p className="font-semibold pt-1 border-t border-white/10 text-xs font-body"
           style={{ color: "var(--accent)" }}>
          Total ~{formatPrice(totalCost, tripContext.currency ?? tripContext.legs[0]?.selected_flight?.currency ?? "USD")}
        </p>
      )}
    </div>
  );
}

function StatusChip({ status }: { status: StepStatus }) {
  const map: Record<StepStatus, { label: string; icon: React.ReactNode; style: React.CSSProperties }> = {
    active: {
      label: "Active",
      icon: null,
      style: { background: "rgba(224,122,95,0.2)", color: "var(--accent)", border: "1px solid rgba(224,122,95,0.3)" },
    },
    done: {
      label: "Done",
      icon: <Check size={10} />,
      style: { background: "rgba(107,144,128,0.2)", color: "var(--success)", border: "1px solid rgba(107,144,128,0.3)" },
    },
    stale: {
      label: "Stale",
      icon: <AlertTriangle size={10} />,
      style: { background: "rgba(212,165,116,0.2)", color: "var(--warning)", border: "1px solid rgba(212,165,116,0.3)" },
    },
    locked: {
      label: "Locked",
      icon: <Lock size={10} />,
      style: { background: "rgba(255,255,255,0.05)", color: "var(--text-subtle)", border: "1px solid rgba(255,255,255,0.08)" },
    },
  };
  const { label, icon, style } = map[status];
  return (
    <motion.span
      layout
      style={style}
      className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 font-body"
    >
      {icon}
      {label}
    </motion.span>
  );
}

function StepIcon({
  step, index, status, expanded,
}: {
  step: (typeof STEPS)[0];
  index: number;
  status: StepStatus;
  expanded: boolean;
}) {
  const { Icon } = step;
  const isDone   = status === "done";
  const isActive = status === "active";
  const isStale  = status === "stale";

  const iconColor = isActive ? "var(--accent)" : isDone ? "var(--success)" : isStale ? "var(--warning)" : "var(--text-subtle)";
  const bgColor   = isActive ? "rgba(224,122,95,0.15)" : "transparent";
  const ringColor = isActive ? "rgba(224,122,95,0.4)" : "transparent";

  return (
    <span
      className={[
        "w-9 shrink-0 rounded-lg flex flex-col items-center justify-center gap-0.5 relative transition-colors",
        expanded ? "h-9" : "h-14",
      ].join(" ")}
      style={{ background: bgColor, boxShadow: isActive ? `0 0 0 1px ${ringColor}` : "none" }}
    >
      {!expanded && (
        <span className="text-[10px] font-bold leading-none" style={{ color: "var(--text-eyebrow)" }}>
          {index + 1}
        </span>
      )}
      <span style={{ color: iconColor }}>
        {isDone ? <Check size={16} /> : <Icon size={16} />}
      </span>
      {isStale && !expanded && (
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: "var(--warning)" }} />
      )}
    </span>
  );
}

export function Sidebar({ pinned, onPinChange }: { pinned: boolean; onPinChange: (v: boolean) => void }) {
  const [hovered, setHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const { state } = useTripContext();
  const { staleSteps, tripContext } = state;

  const expanded = pinned || hovered;
  const currentIndex = STEPS.findIndex((s) => s.href === pathname);

  useEffect(() => {
    return () => { if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current); };
  }, []);

  function handleMouseEnter() {
    if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    setHovered(true);
  }
  function handleMouseLeave() {
    collapseTimerRef.current = setTimeout(() => setHovered(false), 150);
  }

  function isStepStale(staleKey: string) {
    return staleSteps.some((k) => k.startsWith(staleKey + "-"));
  }

  function isStepDone(index: number): boolean {
    const isReturnLeg = (destination: string) => destination === tripContext.home_origin;
    switch (index) {
      case 0: return tripContext.legs.length > 0;
      case 1: return tripContext.legs.length > 0 && tripContext.legs.every(
        (l) => !!l.selected_flight || (l.transport_mode !== "flight" && l.transport_mode !== undefined)
      );
      case 2: return tripContext.legs.length > 0 && tripContext.legs
        .filter((l) => !isReturnLeg(l.destination))
        .every((l) => l.hotel_stays.length > 0);
      case 3: return isStepDone(2);
      case 4: return isStepDone(3);
      default: return false;
    }
  }

  function stepStatus(index: number): StepStatus {
    if (index === currentIndex) return "active";
    const step = STEPS[index];
    if (step.staleKey && isStepStale(step.staleKey)) return "stale";
    if (isStepDone(index)) return "done";
    return "locked";
  }

  const desktopNav = (
    <motion.nav
      animate={{ width: expanded ? 224 : 48 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed left-0 top-0 h-full z-50 flex flex-col overflow-hidden"
      style={{ background: "#071420", borderRight: "1px solid rgba(255,255,255,0.06)" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Brand */}
      <div className="flex items-center h-12 border-b overflow-hidden shrink-0"
           style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="w-12 shrink-0 flex items-center justify-center">
          <Plane size={18} style={{ color: "var(--accent)" }} />
        </div>
        <AnimatePresence>
          {expanded && (
            <motion.span
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              transition={{ duration: 0.15 }}
              className="font-display text-sm font-medium tracking-wide whitespace-nowrap"
              style={{ color: "var(--text-primary)" }}
            >
              Travel Planner
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Steps */}
      <ul className="flex flex-col gap-1 p-1.5 flex-1 overflow-y-auto">
        {STEPS.map((step, i) => {
          const status = stepStatus(i);
          const isLocked = status === "locked";
          return (
            <li key={step.href}>
              <Link
                href={step.href}
                className="flex items-center gap-2 rounded-xl px-1 py-1 transition-colors duration-150 select-none outline-none"
                tabIndex={isLocked ? -1 : 0}
                aria-current={status === "active" ? "page" : undefined}
                data-testid={`sidebar-step-${step.staleKey}`}
                style={{
                  pointerEvents: isLocked ? "none" : "auto",
                  opacity: isLocked ? 0.5 : 1,
                }}
              >
                <StepIcon step={step} index={i} status={status} expanded={expanded} />
                <AnimatePresence>
                  {expanded && (
                    <motion.span
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -4 }}
                      transition={{ duration: 0.15 }}
                      className="whitespace-nowrap text-sm font-body font-medium flex-1 overflow-hidden"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {step.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {expanded && <StatusChip status={status} />}
                </AnimatePresence>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Trip summary */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-3 py-2 border-t text-xs shrink-0"
            style={{ borderColor: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}
          >
            <TripSummary staleSteps={staleSteps} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Theme toggle */}
      <ThemeToggle />

      {/* Pin toggle */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => onPinChange(!pinned)}
        className="w-full flex items-center justify-center py-3 border-t transition-colors duration-150 shrink-0"
        style={{ borderColor: "rgba(255,255,255,0.06)", color: "var(--text-subtle)" }}
        aria-label={pinned ? "Unpin sidebar" : "Pin sidebar open"}
      >
        {pinned ? <PinOff size={15} /> : <Pin size={15} />}
      </motion.button>
    </motion.nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:block">{desktopNav}</div>

      {/* Mobile: hamburger top bar */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 h-11 z-40 flex items-center px-3"
        style={{ background: "rgba(7,20,32,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <button
          onClick={() => setMobileOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: "var(--text-muted)" }}
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>
        <span className="ml-3 text-sm font-body font-semibold" style={{ color: "var(--text-primary)" }}>
          {STEPS[currentIndex]?.label ?? "Travel Planner"}
        </span>
      </div>

      {/* Mobile backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-40 bg-black"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile slide-in drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="drawer"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="md:hidden fixed left-0 top-0 h-full z-50 flex flex-col w-64"
            style={{ background: "#071420", borderRight: "1px solid rgba(255,255,255,0.06)" }}
            role="dialog"
            aria-label="Navigation"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b shrink-0"
                 style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <span className="font-display text-sm tracking-wide" style={{ color: "var(--text-primary)" }}>
                Travel Planner
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                style={{ color: "var(--text-muted)" }}
                aria-label="Close navigation"
              >
                <X size={16} />
              </button>
            </div>
            <ul className="flex flex-col gap-1 p-2 flex-1 overflow-y-auto">
              {STEPS.map((step, i) => {
                const status = stepStatus(i);
                const { Icon } = step;
                const isDone   = status === "done";
                const isActive = status === "active";
                const isLocked = status === "locked";
                return (
                  <li key={step.href}>
                    <Link
                      href={step.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors select-none"
                      style={{
                        background: isActive ? "rgba(224,122,95,0.15)" : "transparent",
                        color: isActive ? "var(--accent)" : isDone ? "var(--success)" : "var(--text-muted)",
                        pointerEvents: isLocked ? "none" : "auto",
                        opacity: isLocked ? 0.5 : 1,
                      }}
                      tabIndex={isLocked ? -1 : 0}
                    >
                      <span className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center">
                        {isDone ? <Check size={16} /> : <Icon size={16} />}
                      </span>
                      <span className="whitespace-nowrap text-sm font-body font-medium flex-1">
                        {i + 1}. {step.label}
                      </span>
                      <StatusChip status={status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="px-4 py-3 border-t text-xs shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}>
              <TripSummary staleSteps={staleSteps} />
            </div>
            <ThemeToggle />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
```

- [ ] **Step 3: Verify sidebar in browser**

Open http://localhost:3000. The left sidebar should be `#071420` dark, with an ember plane icon when collapsed. Hover should spring-expand to show step labels. Mobile: hamburger → Framer slide-in drawer. Theme toggle button should appear at bottom.

---

## Task 4: Setup Page Redesign

**Files:**
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: Update Setup page with hero + glass form**

In `frontend/src/app/page.tsx`, make the following changes:

1. Remove `className="card-base p-8 space-y-[22px]"` from the `<form>` element and replace with inline glass style:
   ```tsx
   <form
     onSubmit={handleSubmit}
     className="p-8 space-y-[22px] rounded-2xl"
     style={{
       background: "var(--glass-2)",
       border: "1px solid var(--glass-border-2)",
       backdropFilter: "blur(12px)",
       boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
     }}
   >
   ```

2. Replace the header section (the `<div className="text-center mb-10">` block) with:
   ```tsx
   {/* Hero section */}
   <div className="text-center mb-10">
     <p className="text-[10px] font-semibold uppercase tracking-[2.5px] mb-4 font-body"
        style={{ color: "var(--text-eyebrow)" }}>
       Step 1 of 5 · Trip Setup
     </p>
     <h1 className="font-display text-4xl mb-3 leading-tight">
       <span style={{ color: "var(--text-primary)" }}>Where are you</span>
       <br />
       <span style={{ color: "var(--accent)" }}>headed?</span>
     </h1>
     <p className="font-body text-sm" style={{ color: "var(--text-muted)" }}>
       Build your journey, one destination at a time.
     </p>
   </div>
   ```

3. Replace the stale banner div `className="mb-6 bg-warning/10 border border-warning/30 rounded-xl p-4 space-y-3"` with an animated version. Wrap it in a Framer Motion AnimatePresence:
   ```tsx
   import { AnimatePresence, motion } from "framer-motion";
   // ...
   <AnimatePresence>
     {state.staleSteps.length > 0 && (
       <motion.div
         initial={{ opacity: 0, y: -12 }}
         animate={{ opacity: 1, y: 0 }}
         exit={{ opacity: 0, y: -12 }}
         transition={{ type: "spring", stiffness: 300, damping: 30 }}
         className="mb-6 rounded-xl p-4 space-y-3"
         style={{
           background: "rgba(212,165,116,0.1)",
           border: "1px solid rgba(212,165,116,0.3)",
         }}
       >
         {/* existing stale banner content unchanged */}
       </motion.div>
     )}
   </AnimatePresence>
   ```

4. Replace all input/label className patterns. Update every `className="w-full border border-gray-200 rounded-lg px-3 py-2..."` to `className="w-full px-3 py-2.5 text-sm font-body"` (the global CSS in globals.css now handles the dark style).

5. Replace all eyebrow labels `className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1 font-body"` with `className="block text-[10px] font-semibold uppercase tracking-[2.5px] mb-1.5 font-body"` and `style={{ color: "var(--text-eyebrow)" }}`.

6. Update the outer wrapper from `className="max-w-lg mx-auto py-10 px-4 md:px-0"` to `className="max-w-lg mx-auto py-10 px-4 md:px-0 min-h-screen flex flex-col justify-center"`.

7. Replace the multi-destination leg card container `className="border border-gray-100 rounded-xl p-4 space-y-3 relative bg-white shadow-card"` with:
   ```tsx
   className="rounded-xl p-4 space-y-3 relative"
   style={{ background: "var(--glass-2)", border: "1px solid var(--glass-border-2)" }}
   ```

8. Replace the transport hint container `className="bg-background rounded-lg px-3 py-2 flex items-center gap-2 border border-gray-100"` with:
   ```tsx
   className="rounded-lg px-3 py-2 flex items-center gap-2"
   style={{ background: "var(--glass-1)", border: "1px solid var(--glass-border-1)" }}
   ```

9. Replace the multi-destination return date container `className="bg-background border border-gray-100 rounded-xl p-3 space-y-2"` with:
   ```tsx
   className="rounded-xl p-3 space-y-2"
   style={{ background: "var(--glass-1)", border: "1px solid var(--glass-border-1)" }}
   ```

10. Update the "Add destination" dashed button to dark style:
    ```tsx
    className="w-full py-2.5 px-4 rounded-xl text-sm font-medium font-body flex items-center justify-center gap-2 transition-colors"
    style={{ border: "2px dashed rgba(255,255,255,0.12)", color: "var(--text-muted)" }}
    ```

11. Replace the TransportSelector button classes for unselected state from `"border-gray-200 text-muted hover:border-gray-300 hover:text-charcoal"` to `"hover:opacity-80"` with inline style `style={{ border: "1px solid rgba(255,255,255,0.12)", color: "var(--text-muted)", background: "var(--glass-1)" }}`.

12. Update all body text references `text-muted`, `text-charcoal`, `text-subtle` in this file to use inline `style={{ color: "var(--text-muted)" }}` etc. where Tailwind utility colors don't match the dark theme.

- [ ] **Step 2: Verify Setup page in browser**

Open http://localhost:3000 — hero text `"Where are you / headed?"` with "headed?" in ember, dark glass form card with backdrop blur, dark inputs.

---

## Task 5: Segments Page + Flight/Transport Cards

**Files:**
- Modify: `frontend/src/components/flights/FlightCard.tsx`
- Modify: `frontend/src/components/segments/TrainSegmentCard.tsx`
- Modify: `frontend/src/components/segments/FerrySegmentCard.tsx`
- Modify: `frontend/src/components/segments/CarSegmentCard.tsx`
- Modify: `frontend/src/app/segments/page.tsx`

- [ ] **Step 1: Redesign FlightCard.tsx**

Replace the entire `frontend/src/components/flights/FlightCard.tsx`:

```tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FlightOffer } from "@/types/trip";
import { Sparkles, ChevronRight, Check } from "lucide-react";
import { formatPrice } from "@/utils/formatPrice";
import { AIPulseBadge } from "@/components/ui/AIPulseBadge";
import { listItemVariants } from "@/components/ui/AnimatedList";

interface Props {
  offer: FlightOffer;
  selected: boolean;
  onSelect: (offer: FlightOffer) => void;
  index?: number;
}

function formatDuration(iso: string) {
  return iso.replace("PT", "").replace("H", "h ").replace("M", "m").trim();
}

function formatTime(dt: string) {
  return new Date(dt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function FlightCard({ offer, selected, onSelect, index = 0 }: Props) {
  const [expanded, setExpanded] = useState(false);
  const seg = offer.segments[0];
  const lastSeg = offer.segments[offer.segments.length - 1];
  const hasBullets = offer.ai_reason_bullets && offer.ai_reason_bullets.length > 0;

  const cardStyle: React.CSSProperties = selected
    ? {
        background: "var(--glass-3)",
        border: "1px solid var(--success)",
        boxShadow: "0 0 0 2px var(--success), 0 0 20px var(--success-glow), 0 8px 32px rgba(0,0,0,0.4)",
        backdropFilter: "blur(12px)",
      }
    : offer.ai_recommended
    ? {
        background: "var(--glass-2)",
        border: "1px solid rgba(224,122,95,0.4)",
        boxShadow: "0 0 20px var(--accent-glow), 0 4px 24px rgba(0,0,0,0.3)",
        backdropFilter: "blur(12px)",
      }
    : {
        background: "var(--glass-2)",
        border: "1px solid var(--glass-border-2)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
        backdropFilter: "blur(12px)",
      };

  return (
    <motion.div
      variants={listItemVariants}
      whileHover={selected ? undefined : { y: -2 }}
      whileTap={selected ? undefined : { scale: 0.99 }}
      onClick={() => { if (!selected) onSelect(offer); }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !selected) { e.preventDefault(); onSelect(offer); } }}
      style={cardStyle}
      className="relative rounded-2xl p-4 transition-shadow duration-200 outline-none cursor-pointer"
    >
      {/* Badges */}
      {offer.ai_recommended && !selected && (
        <span className="absolute top-3 right-3">
          <AIPulseBadge />
        </span>
      )}
      {selected && (
        <span
          className="absolute top-3 left-3 inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full font-body"
          style={{ color: "var(--success)", background: "rgba(107,144,128,0.15)", border: "1px solid rgba(107,144,128,0.3)" }}
        >
          <Check size={10} />
          Selected
        </span>
      )}

      {/* Main flight row */}
      <div className={`flex items-center gap-4 ${selected ? "pl-20" : ""} pr-20`}>
        <div className="text-center min-w-[52px]">
          <div className="text-xl font-bold font-display" style={{ color: "var(--text-primary)" }}>
            {seg.departure_airport}
          </div>
          <div className="text-xs font-body" style={{ color: "var(--text-muted)" }}>
            {formatTime(seg.departure_time)}
          </div>
        </div>

        <div className="flex-1 text-center">
          <div className="text-xs mb-1 font-body" style={{ color: "var(--text-muted)" }}>
            {formatDuration(offer.total_duration)}
          </div>
          <div className="flex items-center gap-1">
            <div className="flex-1 h-px" style={{ background: "var(--glass-border-2)" }} />
            <div className="w-2 h-2 rounded-full border-2" style={{ borderColor: "var(--glass-border-3)", background: "transparent" }} />
            <div className="flex-1 h-px" style={{ background: "var(--glass-border-2)" }} />
          </div>
          <div className="text-xs mt-1 font-body" style={{ color: "var(--text-muted)" }}>
            {offer.stops === 0 ? "Nonstop" : `${offer.stops} stop${offer.stops > 1 ? "s" : ""}`}
          </div>
        </div>

        <div className="text-center min-w-[52px]">
          <div className="text-xl font-bold font-display" style={{ color: "var(--text-primary)" }}>
            {lastSeg.arrival_airport}
          </div>
          <div className="text-xs font-body" style={{ color: "var(--text-muted)" }}>
            {formatTime(lastSeg.arrival_time)}
          </div>
        </div>

        <div className="text-right ml-4 min-w-[88px]">
          <div className="text-xl font-bold font-display" style={{ color: "var(--accent)" }}>
            {formatPrice(offer.price, offer.currency)}
          </div>
          <div className="text-xs font-body" style={{ color: "var(--text-muted)" }}>per person</div>
          <div className="text-xs mt-0.5 font-mono" style={{ color: "var(--text-subtle)" }}>
            {seg.carrier_code}{seg.flight_number}
          </div>
        </div>
      </div>

      {/* AI reason expand */}
      {offer.ai_recommended && (hasBullets || offer.ai_reason) && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="mt-2.5 text-xs font-medium flex items-center gap-1 transition-colors font-body focus:outline-none"
            style={{ color: "var(--accent)" }}
          >
            <Sparkles size={11} />
            <span>Why AI picked this</span>
            <ChevronRight
              size={13}
              className="transition-transform duration-200"
              style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
            />
          </button>
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-2 p-3 rounded-lg overflow-hidden"
                style={{ background: "rgba(224,122,95,0.08)", border: "1px solid rgba(224,122,95,0.15)" }}
              >
                {hasBullets ? (
                  <ul className="space-y-1">
                    {offer.ai_reason_bullets!.map((bullet, idx) => (
                      <li key={idx} className="text-sm leading-snug font-body" style={{ color: "var(--text-muted)" }}>
                        {bullet}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm leading-relaxed font-body" style={{ color: "var(--text-muted)" }}>
                    {offer.ai_reason}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}
```

- [ ] **Step 2: Apply same glass treatment to TrainSegmentCard, FerrySegmentCard, CarSegmentCard**

For each of the three files (`TrainSegmentCard.tsx`, `FerrySegmentCard.tsx`, `CarSegmentCard.tsx`):

Read the file first, then replace:
- The outer `motion.div` className (white border + bg) with the same `cardStyle` object pattern from FlightCard (selected = sage ring, AI pick = ember glow, default = glass-2)
- All `text-charcoal` → `style={{ color: "var(--text-primary)" }}`
- All `text-muted` / `text-gray-*` → `style={{ color: "var(--text-muted)" }}`
- All `text-accent` → `style={{ color: "var(--accent)" }}`
- All `border-gray-*`, `bg-white`, `bg-gray-*` → remove and use CSS var equivalents
- AI Pick badge → replace with `<AIPulseBadge />` from `@/components/ui/AIPulseBadge`
- Add `variants={listItemVariants}` (import from `@/components/ui/AnimatedList`) and `whileHover={{ y: -2 }}` `whileTap={{ scale: 0.99 }}` to the outer `motion.div`

- [ ] **Step 3: Update Segments page layout**

In `frontend/src/app/segments/page.tsx`, make these changes:

1. Wrap the results list with `<AnimatedList>` and `<AnimatedListItem>` (import from `@/components/ui/AnimatedList`):
   ```tsx
   import { AnimatedList, AnimatedListItem } from "@/components/ui/AnimatedList";
   // Around the displayed flight results:
   <AnimatedList>
     {displayResults[leg.leg_number]?.map((offer, idx) => (
       <AnimatedListItem key={offer.id}>
         <FlightCard offer={offer} ... />
       </AnimatedListItem>
     ))}
   </AnimatedList>
   ```

2. Replace the per-leg section heading pattern with eyebrow + title:
   ```tsx
   <p className="text-[10px] font-semibold uppercase tracking-[2.5px] mb-1 font-body"
      style={{ color: "var(--text-eyebrow)" }}>
     Leg {leg.leg_number} · {leg.origin} → {leg.destination} · {leg.departure_date}
   </p>
   <h2 className="font-display text-2xl mb-4" style={{ color: "var(--text-primary)" }}>
     Select Your {MODE_META[leg.transport_mode ?? "flight"]?.label ?? "Flight"}
   </h2>
   ```

3. Replace transport mode selector button classes:
   - Selected: inline style `background: "var(--glass-3)", border: "1px solid var(--accent)", color: "var(--accent)"`
   - Unselected: inline style `background: "var(--glass-1)", border: "1px solid var(--glass-border-1)", color: "var(--text-muted)"`

4. Replace the outer page wrapper `className` to remove `bg-background` / light mode classes. Use `className="max-w-3xl mx-auto py-8 px-4"`.

5. Replace SortBar/FilterBar container styling: any `bg-white border-b border-gray-*` → `style={{ background: "var(--glass-1)", borderBottom: "1px solid var(--glass-border-1)" }}`.

- [ ] **Step 4: Verify segments page in browser**

Navigate to /segments (after setup). Flight cards should show dark glass, AI Pick with ember glow, selected with sage ring. Results should stagger-animate in. Transport mode selector shows dark glass buttons.

---

## Task 6: Itinerary Page + Components

**Files:**
- Modify: `frontend/src/components/itinerary/SuggestionsSidebar.tsx`
- Modify: `frontend/src/components/itinerary/DayColumn.tsx`
- Modify: `frontend/src/components/itinerary/DayPlanner.tsx`
- Modify: `frontend/src/components/itinerary/TripMap.tsx`
- Modify: `frontend/src/components/itinerary/DayItemCard.tsx`

- [ ] **Step 1: Update SuggestionsSidebar.tsx**

Read `frontend/src/components/itinerary/SuggestionsSidebar.tsx`, then apply:

1. Replace the sidebar container background/border with:
   ```tsx
   style={{ background: "rgba(7,20,32,0.75)", backdropFilter: "blur(16px)", borderRight: "1px solid var(--glass-border-1)" }}
   ```

2. Replace `bg-white`, `bg-gray-*`, `border-gray-*` on POI cards and sub-containers with equivalent CSS var styles.

3. Replace the `Sparkles` header icon span with:
   ```tsx
   <Sparkles size={16} style={{ color: "var(--accent)" }} className="animate-ai-pulse" />
   ```

4. Replace the header text `"AI Picks"` with `"✦ AI Picks"` in ember:
   ```tsx
   <span className="font-body font-semibold text-sm" style={{ color: "var(--accent)" }}>✦ AI Picks</span>
   ```

5. Replace filter chip active state: `className` active → inline style `background: "var(--accent)", color: "white"`, inactive → `background: "var(--glass-1)", color: "var(--text-muted)", border: "1px solid var(--glass-border-1)"`.

6. Add `whileTap={{ scale: 0.95 }}` (Framer motion.button) to each filter chip.

7. Replace POI card styling: `bg-white border-gray-*` → `style={{ background: "var(--glass-2)", border: "1px solid var(--glass-border-2)" }}`. AI top-pick POI card gets additional `borderLeft: "2px solid var(--accent)"`.

8. Replace all text color classes (`text-gray-*`, `text-muted`, etc.) with `style={{ color: "var(--text-muted)" }}` etc.

- [ ] **Step 2: Update DayColumn.tsx**

Read `frontend/src/components/itinerary/DayColumn.tsx`, then apply:

1. Replace column container background with:
   ```tsx
   style={{ background: "var(--glass-1)", border: "1px solid var(--glass-border-1)" }}
   ```

2. Replace the column header eyebrow:
   ```tsx
   <p className="text-[10px] font-semibold uppercase tracking-[2.5px] font-body"
      style={{ color: "var(--text-eyebrow)" }}>
     {/* day header text */}
   </p>
   ```

3. Replace empty-column placeholder with:
   ```tsx
   style={{ border: "2px dashed rgba(255,255,255,0.12)", borderRadius: "8px" }}
   <p style={{ color: "var(--text-subtle)" }}>Drop here</p>
   ```

4. When the column is an active drop target (using `isOver` from dnd-kit), add:
   ```tsx
   style={{ borderColor: "rgba(224,122,95,0.5)" }}
   ```

- [ ] **Step 3: Update DayPlanner.tsx — DragOverlay ghost**

Read `frontend/src/components/itinerary/DayPlanner.tsx`, then:

1. Add/update `DragOverlay` component (already using dnd-kit) to include glow style:
   ```tsx
   <DragOverlay>
     {activeId ? (
       <div style={{ opacity: 0.85, transform: "scale(1.04)", boxShadow: "0 0 20px var(--accent-glow)" }}>
         {/* render the dragged item */}
       </div>
     ) : null}
   </DragOverlay>
   ```

2. Replace all `bg-white`, `bg-gray-*`, `border-gray-*` in this file with CSS var equivalents.

- [ ] **Step 4: Update DayItemCard.tsx**

Read `frontend/src/components/itinerary/DayItemCard.tsx`, then replace card styling with glass-2 treatment (same pattern as FlightCard) using `style={{ background: "var(--glass-2)", border: "1px solid var(--glass-border-2)" }}`.

- [ ] **Step 5: Update TripMap.tsx**

Read `frontend/src/components/itinerary/TripMap.tsx`, then wrap the map container with:
```tsx
style={{ border: "1px solid var(--glass-border-1)", borderRadius: "12px", overflow: "hidden" }}
```

Any overlay controls panel over the map:
```tsx
style={{ background: "var(--glass-2)", backdropFilter: "blur(12px)", border: "1px solid var(--glass-border-2)" }}
```

- [ ] **Step 6: Verify itinerary page in browser**

Navigate to /itinerary. Left panel dark glass, POI cards dark, day columns dark with dashed drop zones. Drag an item — ghost should show ember glow.

---

## Task 7: Hotels Page

**Files:**
- Modify: `frontend/src/components/hotels/HotelCard.tsx`
- Modify: `frontend/src/app/hotels/page.tsx`

- [ ] **Step 1: Redesign HotelCard.tsx**

Replace the entire `frontend/src/components/hotels/HotelCard.tsx`:

```tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { HotelOffer } from "@/types/trip";
import { calcNights } from "@/utils/dateUtils";
import { formatPrice } from "@/utils/formatPrice";
import { Sparkles, ChevronRight, Check } from "lucide-react";
import { AIPulseBadge } from "@/components/ui/AIPulseBadge";
import { listItemVariants } from "@/components/ui/AnimatedList";

interface Props {
  offer: HotelOffer;
  selected: boolean;
  confirmed: boolean;
  onSelect: (offer: HotelOffer) => void;
  checkIn?: string;
  checkOut?: string;
  index?: number;
}

function StarRating({ rating }: { rating?: number }) {
  if (!rating) return null;
  const filled = Math.round(rating);
  return (
    <span className="text-xs" style={{ color: "var(--warning)" }}>
      {"★".repeat(filled)}{"☆".repeat(5 - filled)}
      <span className="ml-1 font-body" style={{ color: "var(--text-muted)" }}>{rating.toFixed(1)}</span>
    </span>
  );
}

export function HotelCard({ offer, selected, confirmed, onSelect, checkIn, checkOut, index = 0 }: Props) {
  const [expanded, setExpanded] = useState(false);
  const hasBullets = offer.ai_reason_bullets && offer.ai_reason_bullets.length > 0;

  const cardStyle: React.CSSProperties = confirmed || selected
    ? {
        background: "var(--glass-3)",
        border: "1px solid var(--success)",
        boxShadow: "0 0 0 2px var(--success), 0 0 20px var(--success-glow), 0 8px 32px rgba(0,0,0,0.4)",
        backdropFilter: "blur(12px)",
      }
    : offer.ai_recommended
    ? {
        background: "var(--glass-2)",
        border: "1px solid rgba(224,122,95,0.4)",
        boxShadow: "0 0 20px var(--accent-glow), 0 4px 24px rgba(0,0,0,0.3)",
        backdropFilter: "blur(12px)",
      }
    : {
        background: "var(--glass-2)",
        border: "1px solid var(--glass-border-2)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
        backdropFilter: "blur(12px)",
      };

  return (
    <motion.div
      variants={listItemVariants}
      whileHover={confirmed ? undefined : { y: -2 }}
      whileTap={confirmed ? undefined : { scale: 0.99 }}
      onClick={() => { if (!confirmed) onSelect(offer); }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !confirmed) { e.preventDefault(); onSelect(offer); } }}
      style={cardStyle}
      className="relative rounded-2xl p-4 outline-none"
    >
      {offer.ai_recommended && !confirmed && (
        <span className="absolute top-3 right-3">
          <AIPulseBadge />
        </span>
      )}
      {confirmed && (
        <span
          className="absolute top-3 left-3 inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full font-body"
          style={{ color: "var(--success)", background: "rgba(107,144,128,0.15)", border: "1px solid rgba(107,144,128,0.3)" }}
        >
          <Check size={10} />
          Stay Confirmed
        </span>
      )}

      <div className={`flex items-start justify-between ${confirmed ? "pl-32" : ""} pr-20`}>
        <div className="flex-1">
          <h3 className="font-semibold font-display text-base" style={{ color: "var(--text-primary)" }}>
            {offer.name}
          </h3>
          <p className="text-xs mt-0.5 font-body" style={{ color: "var(--text-muted)" }}>{offer.address}</p>
          <div className="mt-1">
            <StarRating rating={offer.rating} />
          </div>
        </div>
        <div className="text-right ml-4 shrink-0">
          <div className="text-xl font-bold font-display" style={{ color: "var(--accent)" }}>
            {formatPrice(offer.price_per_night, offer.currency)}
          </div>
          <div className="text-xs font-body" style={{ color: "var(--text-muted)" }}>per night</div>
          {checkIn && checkOut && (() => {
            const nights = calcNights(checkIn, checkOut);
            return (
              <div className="text-xs font-body mt-0.5" style={{ color: "var(--text-muted)" }}>
                {formatPrice(offer.price_per_night * nights, offer.currency)} total ({nights} night{nights !== 1 ? "s" : ""})
              </div>
            );
          })()}
        </div>
      </div>

      {offer.ai_recommended && (hasBullets || offer.ai_reason) && (
        <div className="mt-3 pt-2" style={{ borderTop: "1px solid var(--glass-border-1)" }}>
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded((prev) => !prev); }}
            className="text-xs font-medium flex items-center gap-1 transition-colors font-body focus:outline-none"
            style={{ color: "var(--accent)" }}
          >
            <Sparkles size={11} />
            <span>Why AI picked this</span>
            <ChevronRight size={13} className="transition-transform duration-200"
              style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }} />
          </button>
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-2 rounded-lg p-3 overflow-hidden"
                style={{ background: "rgba(224,122,95,0.08)", border: "1px solid rgba(224,122,95,0.15)" }}
              >
                {hasBullets ? (
                  <ul className="space-y-1">
                    {offer.ai_reason_bullets!.map((bullet, idx) => (
                      <li key={idx} className="text-sm leading-snug font-body" style={{ color: "var(--text-muted)" }}>{bullet}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm font-body" style={{ color: "var(--text-muted)" }}>{offer.ai_reason}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
```

- [ ] **Step 2: Update hotels/page.tsx layout**

Read `frontend/src/app/hotels/page.tsx`, then apply:
1. Wrap hotel result lists with `<AnimatedList>` / `<AnimatedListItem>` (same as segments page)
2. Replace `bg-white`, `border-gray-*`, light-mode text colors with CSS var equivalents
3. Replace section heading labels with eyebrow style (`text-[10px]`, `tracking-[2.5px]`, `color: var(--text-eyebrow)`)
4. Replace form containers (hotel search form) with `style={{ background: "var(--glass-2)", border: "1px solid var(--glass-border-2)" }}`

- [ ] **Step 3: Verify hotels page in browser**

Navigate to /hotels. Hotel cards: dark glass, star rating in amber, price in ember, AI Pick badge with ember glow, sage ring on confirmed.

---

## Task 8: Export Page

**Files:**
- Modify: `frontend/src/components/export/ItinerarySummary.tsx`
- Modify: `frontend/src/components/export/ExportButtons.tsx`
- Modify: `frontend/src/app/export/page.tsx`

- [ ] **Step 1: Update ItinerarySummary.tsx**

Read `frontend/src/components/export/ItinerarySummary.tsx`, then:
1. Wrap each leg section in a glass-2 card: `style={{ background: "var(--glass-2)", border: "1px solid var(--glass-border-2)", backdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}`
2. Replace all `bg-white`, `border-gray-*`, `text-charcoal`, `text-muted` with CSS var equivalents
3. Replace leg header with eyebrow + DM Serif title pattern (same as segments page)
4. Flight/transport inset row: `style={{ background: "var(--glass-1)", border: "1px solid var(--glass-border-1)" }}`

- [ ] **Step 2: Update ExportButtons.tsx**

Read `frontend/src/components/export/ExportButtons.tsx`, then replace button styles:
- PDF button: use `<Button variant="primary" size="lg" fullWidth>` (already ember gradient from Task 2)
- JSON button: use `<Button variant="secondary" size="lg" fullWidth>` (already glass from Task 2)

- [ ] **Step 3: Update export/page.tsx layout**

Read `frontend/src/app/export/page.tsx`, then:
1. Update header to DM Serif title: `<h1 className="font-display text-4xl" style={{ color: "var(--text-primary)" }}>Your Trip Summary</h1>`
2. Replace any `bg-white`, `border-gray-*`, `text-muted` with CSS var equivalents
3. Wrap in `<PageTransition>` (already there — verify it's still wrapping)
4. Add `className="max-w-2xl mx-auto py-10 px-4"` to the content wrapper

- [ ] **Step 4: Verify export page in browser**

Navigate to /export. Leg sections in dark glass cards, DM Serif headers, ember price/total, PDF button in ember gradient.

---

## Task 9: Light Mode

**Files:**
- Already handled in `ThemeToggle.tsx` (Task 3) and `globals.css` (Task 1)

- [ ] **Step 1: Verify light mode toggle**

1. Open http://localhost:3000 in browser
2. Click the Sun icon in the sidebar bottom
3. Verify the page switches to `#FAF8F5` background
4. Verify glass cards become `rgba(255,255,255,0.85)` (white-ish)
5. Verify text switches to `#1B3A4B`
6. Verify accent/success/warning colors unchanged
7. Verify glows disappear in light mode
8. Click Moon icon — verify dark mode restores
9. Reload page — verify preference persists (localStorage)

- [ ] **Step 2: Fix any light mode color issues**

Check each page in light mode. Common issues to look for:
- White-on-white text (text using `var(--text-primary)` on a white card — should be fine since `--text-primary` becomes `#1B3A4B` in light mode)
- Dark input styles on light mode — already handled with `[data-theme="light"]` overrides in globals.css
- Any hardcoded dark hex values on elements that need to be light-mode-aware (use CSS vars instead)

If issues found, add `[data-theme="light"]` overrides to `globals.css` for the specific selectors.

---

## Task 10: Skeleton + Loading States

**Files:**
- Modify: `frontend/src/components/ui/Skeleton.tsx`
- Modify: `frontend/src/components/itinerary/SuggestionsSidebar.tsx` (AI pulse icon when loading)

- [ ] **Step 1: Update Skeleton.tsx to use dark glass shimmer**

Replace `frontend/src/components/ui/Skeleton.tsx`:

```tsx
"use client";

import React from "react";

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
}

export function Skeleton({ className = "", width, height }: SkeletonProps) {
  return (
    <div
      className={["skeleton-shimmer rounded-lg", className].filter(Boolean).join(" ")}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 1, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={["space-y-2", className].filter(Boolean).join(" ")}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-4" width={i === lines - 1 && lines > 1 ? "60%" : "100%"} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={["rounded-2xl p-4 space-y-3", className].filter(Boolean).join(" ")}
      style={{
        background: "var(--glass-1)",
        border: "1px solid var(--glass-border-1)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-8 w-16 rounded-full" />
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-px flex-1" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex justify-between items-center pt-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add AI pulse animation to loading states in SuggestionsSidebar**

In `frontend/src/components/itinerary/SuggestionsSidebar.tsx`:

Find the `Sparkles` icon in the sidebar header. When `loading` is true, add `className="animate-ai-pulse"` to the Sparkles icon. Framer Motion is not needed here — use the Tailwind `animate-ai-pulse` class defined in tailwind.config.ts.

- [ ] **Step 3: Final cross-page verification**

Run through all 5 pages and verify:
1. `/` — Dark canvas, ember glow, glass form, hero text
2. `/segments` — Dark glass flight cards, stagger, AI Pick badge with ember glow, sage selected ring
3. `/hotels` — Same glass treatment, hotel name in DM Serif, price in ember
4. `/itinerary` — Dark suggestion sidebar, glass day columns, dashed empty drop zone
5. `/export` — Glass leg cards, ember PDF button, ghost JSON button
6. Light mode toggle: all pages switch cleanly
7. Sidebar spring expand/collapse: smooth spring animation on hover
8. Mobile sidebar: spring slide-in drawer
9. Page transitions: spring slide-up on route changes
10. Skeletons: dark glass shimmer (not warm shimmer)

---

## Self-Review Against Spec

### Spec Coverage Check

| Spec Section | Task |
|---|---|
| 1.1 Color tokens (CSS vars) | Task 1 |
| 1.2 Glassmorphism (GlassCard) | Task 2 |
| 1.3 Ambient background (page-canvas) | Task 1 |
| 1.4 Typography (DM Serif/Sans) | Already in layout — verified in each task |
| 1.5 Border radius tokens | Applied per component |
| 2.1 Page transitions (spring) | Task 2 |
| 2.2 Card stagger | Tasks 5, 7 |
| 2.3 Micro-interactions (whileTap, whileHover) | Tasks 2, 3, 5, 6, 7 |
| 2.4 Loading states (dark shimmer, AI pulse) | Task 10 |
| 2.5 Drag-and-drop ghost + drop zone | Task 6 |
| 3.1 Sidebar | Task 3 |
| 3.2 Setup page | Task 4 |
| 3.3 Segments page | Task 5 |
| 3.4 Hotels page | Task 7 |
| 3.5 Itinerary page | Task 6 |
| 3.6 Export page | Task 8 |
| 4. Light mode | Task 9 (CSS in Task 1, toggle in Task 3) |
| 5. Tailwind config | Task 1 |
| 6. New components | Tasks 2, 3 |
| 7. Constraints preserved | Verified in each task's browser check |

### Gaps Identified

- **Section 2.3: Stale banner** — "slide down from top with spring" is covered in Task 4 (AnimatePresence + spring `y: -12 → 0`)
- **Section 2.3: Toast notifications** — `Toast.tsx` not in scope of this plan (no design change requested for toast content, only slide-in animation). Add if user requests.
- **Section 2.3: Progress bar fill** — CSS `transition: width 600ms ease` — already uses CSS transitions; no change needed unless a specific progress bar component exists
- **Section 3.5: `DistanceConnector`** — dimmed white `rgba(255,255,255,0.25)` — this is a small visual tweak inside DayColumn; handled in Task 6 general cleanup
- **Section 6: `EmbedGlow` component** — Not created as a standalone component; the glow effect is applied inline in GlassCard's `aiPick` and `selected` states. This is sufficient for current usage.

---

## Extension: Missed Components (Tasks 11–15)

Final code review identified these components were not covered in the original plan. All still use hardcoded Tailwind tokens that break in dark mode.

---

## Task 11: UI Primitives — Button, Badge, Input, ThemeToggle

**Files:**
- Modify: `frontend/src/components/ui/Button.tsx`
- Modify: `frontend/src/components/ui/Badge.tsx`
- Modify: `frontend/src/components/ui/Input.tsx`
- Modify: `frontend/src/components/ui/ThemeToggle.tsx`

### Button.tsx

Replace these Tailwind variants with inline CSS var styles:

- `ghost` variant: `text-white/60 hover:text-white hover:bg-white/10` → inline style with `color: "var(--text-muted)"` on the button element, hover handled via motion `whileHover`
- `secondary` variant: `text-white border border-white/20 hover:border-white/40` → `color: "var(--text-primary)", border: "1px solid var(--glass-border-2)"`
- `success` variant: `bg-success text-white hover:bg-success-light` → `background: "var(--success)", color: "white"` inline

Current file structure (partial):
```tsx
const variantStyles: Record<string, string> = {
  primary: "bg-accent ...",
  secondary: "text-white border border-white/20 ...",
  ghost: "text-white/60 hover:text-white hover:bg-white/10",
  success: "bg-success text-white hover:bg-success-light",
  danger: "...",
};
```

Replace `variantStyles` Record with a split approach — keep className for layout/shape, use `variantInlineStyles` for colors:

```tsx
const variantClassNames: Record<string, string> = {
  primary: "font-semibold",
  secondary: "font-medium",
  ghost: "font-medium",
  success: "font-semibold",
  danger: "font-semibold",
};

const variantInlineStyles: Record<string, React.CSSProperties> = {
  primary: { background: "var(--accent)", color: "white" },
  secondary: { color: "var(--text-primary)", border: "1px solid var(--glass-border-2)", background: "transparent" },
  ghost: { color: "var(--text-muted)", background: "transparent" },
  success: { background: "var(--success)", color: "white" },
  danger: { background: "#dc2626", color: "white" },
};
```

Merge into existing `style` prop on the button element.

### Badge.tsx

Read the file first. Replace:
- `status` variant: any `bg-gray-*`, `text-muted`, `border-gray-*` → `background: "var(--glass-1)", color: "var(--text-muted)", border: "1px solid var(--glass-border-1)"`
- `default` variant: same treatment

### Input.tsx

Read the file first. The component adds Tailwind classes that override `globals.css` base styles. Replace:
- `border-gray-200` → remove (globals.css handles `border: 1px solid rgba(255,255,255,0.12)`)
- `text-charcoal` → remove (globals.css handles `color: var(--text-primary)`)
- `bg-white` → remove (globals.css handles `background: rgba(255,255,255,0.06)`)
- `placeholder:text-subtle` → `placeholder:text-[var(--text-subtle)]` or use `style` prop on input
- `disabled:bg-gray-50 disabled:text-muted` → `disabled:opacity-50` (simpler, works in both modes)
- `focus:ring-primary/20 focus:border-primary` → remove (globals.css handles focus ring)

### ThemeToggle.tsx

Read the file first. Line 33 area has `border-white/10 text-white/40 hover:text-white/80 hover:bg-white/5`. Replace:
- `border-white/10` → remove from className, add `borderColor: "var(--sidebar-border)"` to `style`
- `text-white/40` → remove from className, add `color: "var(--text-subtle)"` to `style`
- Hover colors: add `whileHover` motion prop with `color` animation OR use CSS var approach

- [ ] **Step 1: Read all four files**

```bash
# Read to understand current structure
```

- [ ] **Step 2: Fix Button.tsx variant styles**

Open `frontend/src/components/ui/Button.tsx`. Find the `variantStyles` Record and the button JSX. Split into `variantClassNames` + `variantInlineStyles` as shown above. Merge `variantInlineStyles[variant]` into the button's `style` prop.

- [ ] **Step 3: Fix Badge.tsx**

Open `frontend/src/components/ui/Badge.tsx`. Find `status` and `default` variants. Replace gray/muted Tailwind tokens with CSS var inline styles.

- [ ] **Step 4: Fix Input.tsx**

Open `frontend/src/components/ui/Input.tsx`. Strip the overriding gray/charcoal/white classes as described above. The globals.css handles the base dark styling.

- [ ] **Step 5: Fix ThemeToggle.tsx**

Open `frontend/src/components/ui/ThemeToggle.tsx`. Replace `border-white/10`, `text-white/40`, `hover:text-white/80`, `hover:bg-white/5` with CSS var inline styles.

- [ ] **Step 6: Build check**

```bash
cd frontend && npm run build 2>&1 | tail -20
```
Expected: no new TypeScript or JSX errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/ui/Button.tsx frontend/src/components/ui/Badge.tsx frontend/src/components/ui/Input.tsx frontend/src/components/ui/ThemeToggle.tsx
git commit -m "fix: Task 11 — UI primitives Button/Badge/Input/ThemeToggle dark tokens"
```

---

## Task 12: FilterBar + SortBar chip patterns

**Files:**
- Modify: `frontend/src/components/FilterBar.tsx`
- Modify: `frontend/src/components/SortBar.tsx`

### FilterBar.tsx chip pattern

Read the file. Find the chip/button elements. Replace:
- Active chip: `bg-primary/10 text-primary` → `style={{ background: "rgba(224,122,95,0.1)", color: "var(--accent)" }}`
- Inactive chip: `bg-gray-100 text-charcoal/70 hover:bg-gray-200` → `style={{ background: "var(--glass-2)", color: "var(--text-muted)" }}`
- Label: `text-muted` Tailwind class → `style={{ color: "var(--text-muted)" }}`
- Any `border-gray-*` → `style={{ border: "1px solid var(--glass-border-2)" }}`

### SortBar.tsx chip pattern

Same chip treatment as FilterBar. Also fix any `text-muted` Tailwind labels.

- [ ] **Step 1: Read both files**

- [ ] **Step 2: Fix FilterBar.tsx**

Replace active/inactive chip Tailwind tokens with inline CSS var styles.

- [ ] **Step 3: Fix SortBar.tsx**

Same treatment.

- [ ] **Step 4: Build check**

```bash
cd frontend && npm run build 2>&1 | tail -20
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/FilterBar.tsx frontend/src/components/SortBar.tsx
git commit -m "fix: Task 12 — FilterBar/SortBar chip dark tokens"
```

---

## Task 13: AirportSearch component dark glass treatment

**Files:**
- Modify: `frontend/src/components/AirportSearch.tsx`

### Changes needed

Read the file. Apply:

1. **Input element**: strip `border-gray-200 bg-white placeholder:text-subtle text-charcoal disabled:bg-gray-50 disabled:text-muted focus:ring-primary/20 focus:border-primary` — globals.css handles bare inputs. Replace `disabled:*` with `disabled:opacity-50`. For `placeholder`, add `style={{ color: "var(--text-subtle)" }}` ... actually the input itself is styled by globals.css; only the overriding classes need removal.

2. **IATA badge**: `text-primary bg-primary/10` → `style={{ color: "var(--accent)", background: "rgba(224,122,95,0.1)" }}`

3. **Dropdown container**: `bg-white border border-gray-100 rounded-xl` → `style={{ background: "var(--glass-2)", border: "1px solid var(--glass-border-2)", backdropFilter: "blur(12px)" }}`

4. **List items**: `border-b border-gray-50` → `style={{ borderBottom: "1px solid var(--glass-border-1)" }}`; hover `bg-primary/5` → `bg-[rgba(224,122,95,0.05)]` or inline hover via motion

5. **City badge**: `text-success-dark bg-success/10` → `style={{ color: "var(--success)", background: "rgba(107,144,128,0.1)" }}`

6. **Label**: `text-charcoal/70` → `style={{ color: "var(--text-muted)" }}`

- [ ] **Step 1: Read AirportSearch.tsx**

- [ ] **Step 2: Apply all 6 changes listed above**

- [ ] **Step 3: Build check**

```bash
cd frontend && npm run build 2>&1 | tail -20
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/AirportSearch.tsx
git commit -m "fix: Task 13 — AirportSearch dark glass treatment"
```

---

## Task 14: FlightSearchForm + HotelSearchForm containers

**Files:**
- Modify: `frontend/src/components/flights/FlightSearchForm.tsx`
- Modify: `frontend/src/components/hotels/HotelSearchForm.tsx`

### FlightSearchForm.tsx

Read the file. Apply:
1. **Container**: `bg-white border border-gray-100 rounded-xl p-4` → `style={{ background: "var(--glass-2)", border: "1px solid var(--glass-border-2)", backdropFilter: "blur(12px)" }}` (keep `rounded-xl p-4` as Tailwind)
2. **Labels**: `text-charcoal/60` → `style={{ color: "var(--text-muted)" }}`
3. **Any `border-gray-*`** inside the form → `var(--glass-border-1)` or `var(--glass-border-2)`

### HotelSearchForm.tsx

Read the file. Apply:
1. **Container**: same glass-2 treatment as FlightSearchForm
2. **"Auto" badge**: `text-success bg-success/10 border border-success/20` → `style={{ color: "var(--success)", background: "rgba(107,144,128,0.1)", border: "1px solid rgba(107,144,128,0.2)" }}`
3. **Labels**: `text-charcoal/60` → `style={{ color: "var(--text-muted)" }}`

- [ ] **Step 1: Read both files**

- [ ] **Step 2: Fix FlightSearchForm.tsx**

- [ ] **Step 3: Fix HotelSearchForm.tsx**

- [ ] **Step 4: Build check**

```bash
cd frontend && npm run build 2>&1 | tail -20
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/flights/FlightSearchForm.tsx frontend/src/components/hotels/HotelSearchForm.tsx
git commit -m "fix: Task 14 — FlightSearchForm/HotelSearchForm dark glass containers"
```

---

## Task 15: Itinerary page header + SuggestionsSidebar container + DistanceConnector

**Files:**
- Modify: `frontend/src/app/itinerary/page.tsx`
- Modify: `frontend/src/components/itinerary/SuggestionsSidebar.tsx`
- Modify: `frontend/src/components/itinerary/DistanceConnector.tsx` (if exists; check first)

### itinerary/page.tsx

Read the file (focus on lines 164–264 area based on prior review). Apply:
1. **Empty state text**: `text-muted` Tailwind → `style={{ color: "var(--text-muted)" }}`; `text-primary` Tailwind → `style={{ color: "var(--accent)" }}`
2. **H1**: `text-primary font-display` → `style={{ color: "var(--text-primary)" }}` + keep `className="font-display"`
3. **Subtitle**: `text-muted` → `style={{ color: "var(--text-muted)" }}`
4. **Leg selector container**: `bg-gray-100 p-1 rounded-lg` → `style={{ background: "var(--glass-2)", border: "1px solid var(--glass-border-2)" }}` + keep `p-1 rounded-lg`
5. **Active leg button**: `bg-primary text-white` → `style={{ background: "var(--accent)", color: "white" }}`
6. **Inactive leg button**: `text-charcoal/70 hover:bg-white hover:shadow-sm` → `style={{ color: "var(--text-muted)" }}`
7. **Bottom border**: `border-gray-100` → `style={{ borderColor: "var(--glass-border-1)" }}`

### SuggestionsSidebar.tsx collapsed button container

The collapsed button at line 34 has `background: "rgba(7,20,32,0.75)"` — replace with `background: "var(--sidebar-bg)"`. Same for the main container at line 45.

### DistanceConnector.tsx

Check if file exists at `frontend/src/components/itinerary/DistanceConnector.tsx`. If it has `text-subtle` as a Tailwind class, replace with `style={{ color: "var(--text-subtle)" }}`.

- [ ] **Step 1: Read itinerary/page.tsx, SuggestionsSidebar.tsx, and check DistanceConnector.tsx**

- [ ] **Step 2: Fix itinerary/page.tsx** (all 7 changes listed)

- [ ] **Step 3: Fix SuggestionsSidebar.tsx** collapsed button + main container rgba values

- [ ] **Step 4: Fix DistanceConnector.tsx** if `text-subtle` Tailwind class present

- [ ] **Step 5: Build check**

```bash
cd frontend && npm run build 2>&1 | tail -20
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/itinerary/page.tsx frontend/src/components/itinerary/SuggestionsSidebar.tsx
git commit -m "fix: Task 15 — itinerary page header, SuggestionsSidebar, DistanceConnector dark tokens"
```
