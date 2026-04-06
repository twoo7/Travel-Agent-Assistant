"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useTripContext } from "@/context/TripContext";
import type { TransportMode } from "@/types/trip";

const STEPS = [
  { label: "Trip Setup",  icon: "✈",  href: "/",          staleKey: "trip-setup" },
  { label: "Segments",    icon: "🛫", href: "/segments",   staleKey: "segments" },
  { label: "Hotels",      icon: "🏨", href: "/hotels",     staleKey: "hotels" },
  { label: "Itinerary",   icon: "🗓", href: "/itinerary",  staleKey: "itinerary" },
  { label: "Export",      icon: "📥", href: "/export",     staleKey: "export" },
];

const TRANSPORT_ICONS: Record<TransportMode, string> = {
  flight: "✈",
  train: "🚂",
  ferry: "⛴",
  car: "🚗",
};

type StepStatus = "active" | "done" | "stale" | "locked";

function TripSummary({ staleSteps }: { staleSteps: string[] }) {
  const { state } = useTripContext();
  const { tripContext } = state;

  if (!tripContext.home_origin && tripContext.legs.length === 0) {
    return (
      <p className="text-slate-400 italic text-xs">Start planning your trip →</p>
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
        <p className="font-medium text-slate-200 truncate">{routeLabel}</p>
      )}

      {tripContext.legs.map((leg) => {
        const transportIcon =
          leg.transport_mode ? TRANSPORT_ICONS[leg.transport_mode] : TRANSPORT_ICONS.flight;
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
              className={`truncate ${legIsStale ? "text-amber-400" : "text-green-400"}`}
            >
              {transportIcon} {flightNum} · {f.currency} {f.price.toLocaleString()}
            </p>
          );
        })() : null;

        const hotelLines = leg.hotel_stays.map((stay) => {
          totalCost += stay.hotel.price_per_night;
          return (
            <p
              key={`hotel-${stay.hotel.id}`}
              className={`truncate ${legIsStale ? "text-amber-300" : "text-slate-300"}`}
            >
              🏨 {stay.hotel.name}
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
        <p className="text-blue-400 font-semibold pt-1 border-t border-slate-700">
          Total ~{tripContext.legs[0]?.selected_flight?.currency ?? "USD"}{" "}
          {totalCost.toLocaleString()}
        </p>
      )}
    </div>
  );
}

function StatusChip({ status }: { status: StepStatus }) {
  const map: Record<StepStatus, { label: string; cls: string }> = {
    active: { label: "● Active", cls: "bg-indigo-600 text-white" },
    done:   { label: "✓ Done",   cls: "bg-green-900 text-green-300" },
    stale:  { label: "⚠ Stale",  cls: "bg-amber-900 text-amber-300" },
    locked: { label: "○ Locked", cls: "bg-slate-800 text-slate-400" },
  };
  const { label, cls } = map[status];
  return (
    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full shrink-0 ${cls}`}>
      {label}
    </span>
  );
}

export function Sidebar() {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const { state } = useTripContext();
  const { staleSteps } = state;

  const expanded = pinned || hovered;
  const currentIndex = STEPS.findIndex((s) => s.href === pathname);

  useEffect(() => {
    return () => {
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    };
  }, []);

  function handleMouseEnter() {
    if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    setHovered(true);
  }

  function handleMouseLeave() {
    collapseTimerRef.current = setTimeout(() => setHovered(false), 150);
  }

  function isStepStale(staleKey: string): boolean {
    return staleSteps.some((k) => k.startsWith(staleKey + "-"));
  }

  function stepStatus(index: number): StepStatus {
    if (index === currentIndex) return "active";
    const step = STEPS[index];
    if (step.staleKey && isStepStale(step.staleKey)) return "stale";
    if (index < currentIndex) return "done";
    return "locked";
  }

  const desktopNav = (
    <nav
      className={`
        fixed left-0 top-0 h-full z-50 flex flex-col bg-slate-900
        transition-all duration-300 overflow-hidden
        ${expanded ? "w-56" : "w-12"}
      `}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Steps */}
      <ul className="flex flex-col gap-1 p-1.5 flex-1 overflow-y-auto">
        {STEPS.map((step, i) => {
          const status = stepStatus(i);
          const isActive = status === "active";
          const isDone = status === "done";
          const isStale = status === "stale";
          const isLocked = status === "locked";

          return (
            <li key={step.href}>
              <Link
                href={step.href}
                className={`
                  flex items-center gap-2 rounded-lg px-1 py-1
                  transition-colors duration-150 select-none
                  ${isActive ? "bg-indigo-600 text-white" : ""}
                  ${isDone ? "text-green-400 hover:bg-slate-800" : ""}
                  ${isStale ? "text-amber-400 hover:bg-slate-800" : ""}
                  ${isLocked ? "text-slate-500 cursor-default pointer-events-none" : ""}
                `}
                tabIndex={isLocked ? -1 : 0}
                aria-current={isActive ? "page" : undefined}
              >
                {/* Icon cell — stacked number+icon in collapsed, square in expanded */}
                <span
                  className={`
                    w-9 shrink-0 rounded-lg flex flex-col items-center justify-center gap-0.5
                    relative transition-colors
                    ${expanded ? "h-9" : "h-14"}
                  `}
                >
                  {!expanded && (
                    <span className="text-[10px] font-bold leading-none">
                      {i + 1}
                    </span>
                  )}
                  <span className="text-base leading-none">
                    {isDone ? "✓" : step.icon}
                  </span>
                  {/* Amber dot overlay for stale in collapsed view */}
                  {isStale && !expanded && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" />
                  )}
                </span>

                {/* Expanded: label + status chip */}
                {expanded && (
                  <>
                    <span className="whitespace-nowrap text-sm font-medium flex-1 overflow-hidden">
                      {step.label}
                    </span>
                    <StatusChip status={status} />
                  </>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Trip summary — expanded only */}
      {expanded && (
        <div className="px-3 py-2 border-t border-slate-700 text-xs text-slate-300">
          <TripSummary staleSteps={staleSteps} />
        </div>
      )}

      {/* Pin toggle */}
      <button
        onClick={() => setPinned((v) => !v)}
        className="
          w-full flex items-center justify-center py-3
          border-t border-slate-700 text-slate-400
          hover:text-slate-100 hover:bg-slate-800
          transition-colors duration-150 text-base
        "
        aria-label={pinned ? "Unpin sidebar" : "Pin sidebar open"}
        title={pinned ? "Unpin sidebar" : "Pin sidebar open"}
      >
        {pinned ? "‹" : "›"}
      </button>
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:block">{desktopNav}</div>

      {/* Mobile: hamburger in top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-11 z-40 bg-slate-900 flex items-center px-3 shadow">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-slate-300 hover:text-white text-xl w-9 h-9 flex items-center justify-center"
          aria-label="Open navigation"
        >
          ☰
        </button>
        <span className="ml-3 text-slate-200 text-sm font-semibold">
          {STEPS[currentIndex]?.label ?? "Travel Planner"}
        </span>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile slide-in sidebar */}
      <div
        className={`
          md:hidden fixed left-0 top-0 h-full z-50 flex flex-col bg-slate-900 w-56
          transition-transform duration-300
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
          <span className="text-slate-200 text-sm font-semibold">Navigation</span>
          <button
            onClick={() => setMobileOpen(false)}
            className="text-slate-400 hover:text-white text-lg w-8 h-8 flex items-center justify-center"
            aria-label="Close navigation"
          >
            ✕
          </button>
        </div>
        <ul className="flex flex-col gap-1 p-1.5 flex-1 overflow-y-auto">
          {STEPS.map((step, i) => {
            const status = stepStatus(i);
            const isActive = status === "active";
            const isDone = status === "done";
            const isStale = status === "stale";
            const isLocked = status === "locked";
            return (
              <li key={step.href}>
                <Link
                  href={step.href}
                  onClick={() => setMobileOpen(false)}
                  className={`
                    flex items-center gap-3 rounded-lg px-1.5 py-1.5
                    transition-colors duration-150 select-none
                    ${isActive ? "bg-indigo-600 text-white" : ""}
                    ${isDone ? "text-green-400 hover:bg-slate-800" : ""}
                    ${isStale ? "text-amber-400 hover:bg-slate-800" : ""}
                    ${isLocked ? "text-slate-500 cursor-default pointer-events-none" : ""}
                  `}
                  tabIndex={isLocked ? -1 : 0}
                >
                  <span className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-lg">
                    {isDone ? "✓" : step.icon}
                  </span>
                  <span className="whitespace-nowrap text-sm font-medium flex-1">
                    {i + 1}. {step.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="px-3 py-2 border-t border-slate-700 text-xs text-slate-300">
          <TripSummary staleSteps={staleSteps} />
        </div>
      </div>
    </>
  );
}
