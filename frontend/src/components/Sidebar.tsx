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
