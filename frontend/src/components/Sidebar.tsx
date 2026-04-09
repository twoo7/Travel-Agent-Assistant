"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useTripContext } from "@/context/TripContext";
import { calcNights } from "@/utils/dateUtils";
import { formatPrice } from "@/utils/formatPrice";
import type { TransportMode } from "@/types/trip";
import {
  Plane,
  Train,
  Ship,
  Car,
  Hotel,
  Calendar,
  Download,
  Menu,
  X,
  Pin,
  PinOff,
  Check,
  AlertTriangle,
  Lock,
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
        <p className="font-display font-medium text-slate-200 truncate text-sm">{routeLabel}</p>
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
              className={`truncate flex items-center gap-1 ${legIsStale ? "text-amber-400" : "text-green-400"}`}
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
              className={`truncate flex items-center gap-1 ${legIsStale ? "text-amber-300" : "text-slate-300"}`}
            >
              <Hotel size={12} className="shrink-0" />
              <span>{stay.hotel.name}</span>
            </p>
          );
        });

        return (
          <div key={leg.leg_number} className="space-y-0.5 text-xs">
            {flightLine}
            {hotelLines}
          </div>
        );
      })}

      {totalCost > 0 && (
        <p className="text-accent font-semibold pt-1 border-t border-slate-700 text-xs">
          Total ~{formatPrice(totalCost, tripContext.currency ?? tripContext.legs[0]?.selected_flight?.currency ?? "USD")}
        </p>
      )}
    </div>
  );
}

function StatusChip({ status }: { status: StepStatus }) {
  const map: Record<StepStatus, { label: string; icon: React.ReactNode; cls: string }> = {
    active: { label: "Active",  icon: null,                          cls: "bg-accent/20 text-accent border border-accent/30" },
    done:   { label: "Done",    icon: <Check size={10} />,           cls: "bg-success/20 text-success border border-success/30" },
    stale:  { label: "Stale",   icon: <AlertTriangle size={10} />,   cls: "bg-warning/20 text-warning border border-warning/30" },
    locked: { label: "Locked",  icon: <Lock size={10} />,            cls: "bg-slate-800 text-slate-500 border border-slate-700" },
  };
  const { label, icon, cls } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${cls}`}>
      {icon}
      {label}
    </span>
  );
}

function StepIcon({
  step,
  index,
  status,
  expanded,
}: {
  step: (typeof STEPS)[0];
  index: number;
  status: StepStatus;
  expanded: boolean;
}) {
  const { Icon } = step;
  const isDone = status === "done";
  const isActive = status === "active";
  const isStale = status === "stale";

  const iconColor = isActive
    ? "text-white"
    : isDone
    ? "text-success"
    : isStale
    ? "text-warning"
    : "text-slate-500";

  return (
    <span
      className={[
        "w-9 shrink-0 rounded-lg flex flex-col items-center justify-center gap-0.5 relative transition-colors",
        expanded ? "h-9" : "h-14",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {!expanded && (
        <span className="text-[10px] font-bold leading-none text-slate-500">
          {index + 1}
        </span>
      )}
      <span className={iconColor}>
        {isDone ? <Check size={16} /> : <Icon size={16} />}
      </span>
      {isStale && !expanded && (
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-warning" />
      )}
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

  const stepLinkClass = (status: StepStatus) => {
    const base =
      "flex items-center gap-2 rounded-xl px-1 py-1 transition-all duration-150 select-none";
    if (status === "active")
      return `${base} bg-primary text-white border-l-2 border-accent`;
    if (status === "done")
      return `${base} text-success hover:bg-slate-800/60`;
    if (status === "stale")
      return `${base} text-warning hover:bg-slate-800/60`;
    return `${base} text-slate-500 cursor-default pointer-events-none`;
  };

  const desktopNav = (
    <nav
      className={[
        "fixed left-0 top-0 h-full z-50 flex flex-col bg-navy-sidebar border-r border-accent/10",
        "transition-all duration-300 overflow-hidden",
        expanded ? "w-56" : "w-12",
      ]
        .filter(Boolean)
        .join(" ")}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Brand mark — collapsed */}
      {!expanded && (
        <div className="flex items-center justify-center h-12 border-b border-slate-800">
          <Plane size={18} className="text-accent" />
        </div>
      )}

      {/* Brand name — expanded */}
      {expanded && (
        <div className="flex items-center px-4 h-12 border-b border-slate-800">
          <span className="font-display text-slate-100 text-sm font-medium tracking-wide">
            Travel Planner
          </span>
        </div>
      )}

      {/* Steps */}
      <ul className="flex flex-col gap-1 p-1.5 flex-1 overflow-y-auto">
        {STEPS.map((step, i) => {
          const status = stepStatus(i);

          return (
            <li key={step.href}>
              <Link
                href={step.href}
                className={stepLinkClass(status)}
                tabIndex={status === "locked" ? -1 : 0}
                aria-current={status === "active" ? "page" : undefined}
                data-testid={`sidebar-step-${step.staleKey}`}
              >
                <StepIcon step={step} index={i} status={status} expanded={expanded} />
                {expanded && (
                  <>
                    <span className="whitespace-nowrap text-sm font-body font-medium flex-1 overflow-hidden">
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
        <div className="px-3 py-2 border-t border-slate-800 text-xs text-slate-300">
          <TripSummary staleSteps={staleSteps} />
        </div>
      )}

      {/* Pin toggle */}
      <button
        onClick={() => setPinned((v) => !v)}
        className="w-full flex items-center justify-center py-3 border-t border-slate-800 text-slate-500 hover:text-slate-200 hover:bg-slate-800/50 transition-colors duration-150"
        aria-label={pinned ? "Unpin sidebar" : "Pin sidebar open"}
        title={pinned ? "Unpin sidebar" : "Pin sidebar open"}
      >
        {pinned ? <PinOff size={15} /> : <Pin size={15} />}
      </button>
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:block">{desktopNav}</div>

      {/* Mobile: hamburger top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-11 z-40 bg-navy-sidebar border-b border-accent/10 flex items-center px-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-slate-400 hover:text-white w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>
        <span className="ml-3 text-slate-200 text-sm font-body font-semibold">
          {STEPS[currentIndex]?.label ?? "Travel Planner"}
        </span>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile slide-in sidebar */}
      <div
        className={[
          "md:hidden fixed left-0 top-0 h-full z-50 flex flex-col bg-navy-sidebar w-64",
          "transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        ]
          .filter(Boolean)
          .join(" ")}
        role="dialog"
        aria-label="Navigation"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <span className="font-display text-slate-100 text-sm tracking-wide">Travel Planner</span>
          <button
            onClick={() => setMobileOpen(false)}
            className="text-slate-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close navigation"
          >
            <X size={16} />
          </button>
        </div>
        <ul className="flex flex-col gap-1 p-2 flex-1 overflow-y-auto">
          {STEPS.map((step, i) => {
            const status = stepStatus(i);
            const { Icon } = step;
            const isDone = status === "done";
            const isActive = status === "active";
            const isStale = status === "stale";
            const isLocked = status === "locked";

            return (
              <li key={step.href}>
                <Link
                  href={step.href}
                  onClick={() => setMobileOpen(false)}
                  className={[
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150 select-none",
                    isActive ? "bg-primary text-white border-l-2 border-accent" : "",
                    isDone ? "text-success hover:bg-slate-800/60" : "",
                    isStale ? "text-warning hover:bg-slate-800/60" : "",
                    isLocked ? "text-slate-500 cursor-default pointer-events-none" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
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
        <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-300">
          <TripSummary staleSteps={staleSteps} />
        </div>
      </div>
    </>
  );
}
