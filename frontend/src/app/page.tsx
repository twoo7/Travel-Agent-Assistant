"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTripContext } from "@/context/TripContext";
import AirportSearch from "@/components/AirportSearch";
import { getTransportAvailability } from "@/utils/transportAvailability";
import type { TransportMode } from "@/types/trip";
import type { ModeAvailability } from "@/utils/transportAvailability";
import airportsData from "@/data/airports.json";
import ferryRoutesData from "@/data/ferry_routes.json";
import { Button } from "@/components/ui/Button";
import { PageTransition } from "@/components/ui/PageTransition";
import {
  Plane,
  Train,
  Ship,
  Car,
  AlertTriangle,
  Plus,
  Minus,
  X,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LegDraft {
  origin: string;
  destination: string;
  date: string;
  transport_mode: TransportMode;
}

// ─── Stale step labels ────────────────────────────────────────────────────────

const STEP_LABELS: Record<string, string> = {
  segments: "Segments",
  hotels: "Hotels",
};

const STALE_ACTIONS: Record<string, string> = {
  segments: "re-search and select a flight or confirm your transport",
  hotels: "re-search and confirm a hotel",
};

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENCIES = [
  { code: "USD", label: "USD — US Dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — British Pound" },
  { code: "JPY", label: "JPY — Japanese Yen" },
  { code: "AUD", label: "AUD — Australian Dollar" },
  { code: "CAD", label: "CAD — Canadian Dollar" },
  { code: "CHF", label: "CHF — Swiss Franc" },
  { code: "SGD", label: "SGD — Singapore Dollar" },
  { code: "HKD", label: "HKD — Hong Kong Dollar" },
  { code: "NZD", label: "NZD — New Zealand Dollar" },
];

type ModeMeta = {
  Icon: LucideIcon;
  label: string;
  selectedClass: string;
  dotClass: string;
};

const MODE_META: Record<TransportMode, ModeMeta> = {
  flight: {
    Icon: Plane,
    label: "Flight",
    selectedClass: "border-primary bg-primary/5 text-primary",
    dotClass: "text-primary",
  },
  train: {
    Icon: Train,
    label: "Train",
    selectedClass: "border-success bg-success/5 text-success-dark",
    dotClass: "text-success",
  },
  ferry: {
    Icon: Ship,
    label: "Ferry",
    selectedClass: "border-sky-500 bg-sky-50 text-sky-700",
    dotClass: "text-sky-500",
  },
  car: {
    Icon: Car,
    label: "Bus/Car",
    selectedClass: "border-warning bg-warning/5 text-warning-dark",
    dotClass: "text-warning",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function defaultMode(modes: ModeAvailability[]): TransportMode {
  const recommended = modes.find((m) => m.available && m.recommended);
  if (recommended) return recommended.mode;
  const first = modes.find((m) => m.available);
  return first ? first.mode : "flight";
}

function emptyLeg(origin: string): LegDraft {
  return { origin, destination: "", date: "", transport_mode: "flight" };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface TransportSelectorProps {
  origin: string;
  destination: string;
  selected: TransportMode;
  onSelect: (mode: TransportMode) => void;
}

function TransportSelector({
  origin,
  destination,
  selected,
  onSelect,
}: TransportSelectorProps) {
  const availability = useMemo(() => {
    if (!origin || !destination || origin === destination) return null;
    return getTransportAvailability(
      origin,
      destination,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      airportsData as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ferryRoutesData as any
    );
  }, [origin, destination]);

  if (!availability || availability.modes.length === 0) return null;

  const available = availability.modes.filter((m) => m.available);

  return (
    <div>
      <label className="block text-xs font-medium text-charcoal/70 mb-1.5 font-body">
        How are you getting there?
      </label>
      <div className="flex gap-2 flex-wrap">
        {available.map((m) => {
          const meta = MODE_META[m.mode];
          const { Icon } = meta;
          const isSelected = selected === m.mode;
          return (
            <button
              key={m.mode}
              type="button"
              onClick={() => onSelect(m.mode)}
              aria-pressed={isSelected}
              className={[
                "flex-1 min-w-0 py-2 px-3 rounded-lg border-2 text-sm font-medium font-body transition-all",
                "flex items-center justify-center gap-1.5",
                isSelected
                  ? meta.selectedClass
                  : "border-gray-200 text-muted hover:border-gray-300 hover:text-charcoal",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <Icon size={14} />
              {m.label}
              {!isSelected && m.recommended && (
                <span className={`${meta.dotClass} text-lg leading-none`}>•</span>
              )}
            </button>
          );
        })}
      </div>
      {availability.primaryHint && (
        <p className="text-xs text-muted mt-1 italic font-body">
          {availability.primaryHint}
        </p>
      )}
    </div>
  );
}

interface LegCardProps {
  index: number;
  leg: LegDraft;
  isFirst: boolean;
  isOnly: boolean;
  onChange: (updated: LegDraft) => void;
  onRemove: () => void;
  error?: string;
}

function LegCard({
  index,
  leg,
  isFirst,
  isOnly,
  onChange,
  onRemove,
  error,
}: LegCardProps) {
  const handleDestinationChange = useCallback(
    (iata: string) => {
      if (!iata) {
        onChange({ ...leg, destination: "" });
        return;
      }
      const availability = getTransportAvailability(
        leg.origin,
        iata,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        airportsData as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ferryRoutesData as any
      );
      const mode = defaultMode(availability.modes);
      onChange({ ...leg, destination: iata, transport_mode: mode });
    },
    [leg, onChange]
  );

  return (
    <div className="border border-gray-100 rounded-xl p-4 space-y-3 relative bg-white shadow-card">
      {!isFirst && !isOnly && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-3 right-3 text-muted hover:text-red-500 transition-colors rounded-lg p-1 hover:bg-red-50"
          aria-label="Remove leg"
        >
          <X size={16} />
        </button>
      )}

      <div className="text-xs font-semibold text-muted uppercase tracking-wide font-body">
        Leg {index + 1}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <AirportSearch
          label="From"
          value={leg.origin}
          onChange={(iata) => onChange({ ...leg, origin: iata })}
          placeholder="Origin airport"
          disabled={isFirst || index > 0}
        />
        <AirportSearch
          label="To"
          value={leg.destination}
          onChange={handleDestinationChange}
          placeholder="Destination airport"
        />
      </div>

      {error && (
        <p className="text-xs text-red-500 font-body">{error}</p>
      )}

      <div>
        <label className="block text-xs font-medium text-charcoal/70 mb-1 font-body">
          Departure date
        </label>
        <input
          type="date"
          value={leg.date}
          onChange={(e) => onChange({ ...leg, date: e.target.value })}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
        />
      </div>

      <TransportSelector
        origin={leg.origin}
        destination={leg.destination}
        selected={leg.transport_mode}
        onSelect={(mode) => onChange({ ...leg, transport_mode: mode })}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TripSetupPage() {
  const router = useRouter();
  const { state, dispatch } = useTripContext();
  const { tripContext } = state;

  const [homeOrigin, setHomeOrigin] = useState("");
  const [singleDest, setSingleDest] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  // Currency
  const [currency, setCurrency] = useState("USD");

  // Multi-destination
  const [multiMode, setMultiMode] = useState(false);
  const [legs, setLegs] = useState<LegDraft[]>([
    { origin: "", destination: "", date: "", transport_mode: "flight" },
  ]);
  const [addReturnLeg, setAddReturnLeg] = useState(false);
  const [multiReturnDate, setMultiReturnDate] = useState("");

  const handleHomeOriginChange = useCallback(
    (iata: string) => {
      setHomeOrigin(iata);
      setLegs((prev) => {
        const updated = [...prev];
        updated[0] = { ...updated[0], origin: iata };
        return updated;
      });
      markStaleIfEditing([1], ["segments"]);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tripContext.legs.length]
  );

  const handleMultiToggle = useCallback(
    (checked: boolean) => {
      setMultiMode(checked);
      if (checked) {
        const availability =
          homeOrigin && singleDest
            ? getTransportAvailability(
                homeOrigin,
                singleDest,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                airportsData as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ferryRoutesData as any
              )
            : null;
        const mode = availability ? defaultMode(availability.modes) : "flight";
        setLegs([
          {
            origin: homeOrigin,
            destination: singleDest,
            date: departureDate,
            transport_mode: mode,
          },
        ]);
      }
    },
    [homeOrigin, singleDest, departureDate]
  );

  const updateLeg = useCallback((index: number, updated: LegDraft) => {
    setLegs((prev) => {
      const next = [...prev];
      next[index] = updated;
      if (index < next.length - 1 && updated.destination) {
        next[index + 1] = { ...next[index + 1], origin: updated.destination };
      }
      return next;
    });
  }, []);

  const addLeg = useCallback(() => {
    setLegs((prev) => {
      const lastDest = prev[prev.length - 1]?.destination ?? "";
      return [...prev, emptyLeg(lastDest)];
    });
  }, []);

  const removeLeg = useCallback((index: number) => {
    setLegs((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (index < next.length && index > 0) {
        next[index] = { ...next[index], origin: next[index - 1].destination };
      }
      return next;
    });
  }, []);

  const legErrors: (string | undefined)[] = useMemo(() => {
    if (!multiMode) return [];
    return legs.map((leg) => {
      if (leg.origin && leg.destination && leg.origin === leg.destination) {
        return "Origin and destination cannot be the same.";
      }
      return undefined;
    });
  }, [multiMode, legs]);

  const singleDestError =
    !multiMode && homeOrigin && singleDest && homeOrigin === singleDest
      ? "Origin and destination cannot be the same."
      : undefined;

  const isValid = useMemo(() => {
    if (!homeOrigin) return false;
    if (multiMode) {
      return legs.every(
        (l) => l.origin && l.destination && l.date && l.origin !== l.destination
      );
    }
    return !!singleDest && !!departureDate && homeOrigin !== singleDest;
  }, [homeOrigin, multiMode, legs, singleDest, departureDate]);

  function markStaleIfEditing(legNumbers: number[], steps: string[]) {
    if (tripContext.legs.length === 0) return;
    const keys = legNumbers.flatMap((n) => steps.map((s) => `${s}-${n}`));
    dispatch({ type: "MARK_STALE", payload: { keys } });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;

    if (tripContext.legs.length > 0) {
      dispatch({
        type: "UPDATE_TRIP_META",
        payload: { home_origin: homeOrigin, adults, children, currency },
      });
    } else {
      dispatch({
        type: "INIT_TRIP",
        payload: { home_origin: homeOrigin, adults, children, currency },
      });

      const legsToDispatch: LegDraft[] = multiMode
        ? legs
        : [
            {
              origin: homeOrigin,
              destination: singleDest,
              date: departureDate,
              transport_mode: (() => {
                if (!homeOrigin || !singleDest) return "flight";
                const av = getTransportAvailability(
                  homeOrigin,
                  singleDest,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  airportsData as any,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ferryRoutesData as any
                );
                return defaultMode(av.modes);
              })(),
            },
          ];

      if (!multiMode && returnDate) {
        legsToDispatch.push({
          origin: singleDest,
          destination: homeOrigin,
          date: returnDate,
          transport_mode: "flight" as TransportMode,
        });
      }

      if (multiMode && addReturnLeg && multiReturnDate && legs.length > 0) {
        legsToDispatch.push({
          origin: legs[legs.length - 1].destination,
          destination: homeOrigin,
          date: multiReturnDate,
          transport_mode: "flight" as TransportMode,
        });
      }

      legsToDispatch.forEach((leg, i) => {
        dispatch({
          type: "ADD_LEG",
          payload: {
            leg_number: i + 1,
            origin: leg.origin,
            destination: leg.destination,
            departure_date: leg.date,
            transport_mode: leg.transport_mode,
            hotel_stays: [],
            days: [],
          },
        });
      });
    }

    router.push("/segments");
  }

  const singleAvailability = useMemo(() => {
    if (!homeOrigin || !singleDest || homeOrigin === singleDest) return null;
    return getTransportAvailability(
      homeOrigin,
      singleDest,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      airportsData as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ferryRoutesData as any
    );
  }, [homeOrigin, singleDest]);

  const singleDefaultMode = singleAvailability
    ? defaultMode(singleAvailability.modes)
    : "flight";

  const DefaultModeIcon = MODE_META[singleDefaultMode].Icon;

  // ── Passenger counter helper ──────────────────────────────────────────────
  function makeStaleKeys() {
    return tripContext.legs.flatMap((l) => [
      `segments-${l.leg_number}`,
      `hotels-${l.leg_number}`,
    ]);
  }

  return (
    <PageTransition>
      <div className="max-w-lg mx-auto py-10 px-4 md:px-0">
        {/* Stale banner */}
        {state.staleSteps.length > 0 && (
          <div className="mb-6 bg-warning/10 border border-warning/30 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-warning-dark flex items-center gap-2 font-body">
              <AlertTriangle size={16} />
              Changes detected — {state.staleSteps.length} step
              {state.staleSteps.length > 1 ? "s" : ""} need attention
            </p>
            <div className="space-y-2">
              {state.staleSteps.map((key) => {
                const [stepName, legNum] = key.split("-");
                const label = STEP_LABELS[stepName] ?? stepName;
                const action = STALE_ACTIONS[stepName] ?? "review this step";
                const href = stepName === "segments" ? "/segments" : "/hotels";
                return (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <p className="text-sm text-warning-dark font-body">
                      •{" "}
                      <span className="font-medium">
                        {label} (Leg {legNum})
                      </span>
                      : {action}
                    </p>
                    <button
                      type="button"
                      onClick={() => router.push(href)}
                      className="shrink-0 text-xs font-medium text-warning-dark bg-warning/20 hover:bg-warning/30 px-3 py-1 rounded-lg transition-colors font-body"
                    >
                      Go to {label} →
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/10 mb-4">
            <Plane size={28} className="text-accent" />
          </div>
          <h1 className="font-display text-4xl text-primary mb-2">Plan Your Trip</h1>
          <p className="text-muted font-body">Tell us where you&apos;re going to get started.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="card-base p-8 space-y-[22px]"
        >
          {/* ── Single-destination fields ── */}
          {!multiMode && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <AirportSearch
                  label="From"
                  value={homeOrigin}
                  onChange={handleHomeOriginChange}
                  placeholder="Home airport"
                />
                <AirportSearch
                  label="To"
                  value={singleDest}
                  onChange={(iata) => {
                    setSingleDest(iata);
                    markStaleIfEditing([1], ["segments", "hotels"]);
                  }}
                  placeholder="Destination airport"
                />
              </div>

              {singleDestError && (
                <p className="text-xs text-red-500 -mt-2 font-body">{singleDestError}</p>
              )}

              {/* Transport hint */}
              {singleAvailability && singleAvailability.modes.length > 0 && (
                <div className="bg-background rounded-lg px-3 py-2 flex items-center gap-2 border border-gray-100">
                  <DefaultModeIcon size={18} className="text-primary" />
                  <div>
                    <span className="text-sm font-medium text-charcoal font-body">
                      {MODE_META[singleDefaultMode].label}
                    </span>
                    {singleAvailability.primaryHint && (
                      <p className="text-xs text-muted italic font-body">
                        {singleAvailability.primaryHint}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1 font-body">
                    Departure Date
                  </label>
                  <input
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    onBlur={() => markStaleIfEditing([1], ["segments", "hotels"])}
                    required={!multiMode}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1 font-body">
                    Return Date{" "}
                    <span className="text-subtle font-normal normal-case">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  />
                </div>
              </div>
            </>
          )}

          {/* ── Passengers ── */}
          <div className="grid grid-cols-2 gap-4">
            {(
              [
                {
                  label: "Adults",
                  value: adults,
                  set: setAdults,
                  min: 1,
                  ariaBase: "adults",
                },
                {
                  label: "Children",
                  value: children,
                  set: setChildren,
                  min: 0,
                  ariaBase: "children",
                },
              ] as const
            ).map(({ label, value, set, min, ariaBase }) => (
              <div key={label}>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1 font-body">
                  {label}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      set((v) => Math.max(min, v - 1));
                      const keys = makeStaleKeys();
                      if (keys.length) dispatch({ type: "MARK_STALE", payload: { keys } });
                    }}
                    aria-label={`Decrease ${ariaBase}`}
                    className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-muted hover:bg-gray-50 hover:text-charcoal transition-colors"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="text-base font-bold min-w-[2rem] text-center text-charcoal font-body">
                    {value}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      set((v) => Math.min(9, v + 1));
                      const keys = makeStaleKeys();
                      if (keys.length) dispatch({ type: "MARK_STALE", payload: { keys } });
                    }}
                    aria-label={`Increase ${ariaBase}`}
                    className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-muted hover:bg-gray-50 hover:text-charcoal transition-colors"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* -- Currency -- */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1 font-body">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* -- Multi-destination toggle -- */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={multiMode}
              onChange={(e) => handleMultiToggle(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/30 accent-primary"
            />
            <span className="text-sm font-medium text-charcoal font-body">
              Multi-destination trip
            </span>
          </label>

          {/* -- Multi-destination leg builder -- */}
          {multiMode && (
            <div className="space-y-3">
              <div className="mb-1">
                <AirportSearch
                  label="Home airport (trip origin)"
                  value={homeOrigin}
                  onChange={handleHomeOriginChange}
                  placeholder="Where are you flying from?"
                />
              </div>

              {legs.map((leg, i) => (
                <LegCard
                  key={i}
                  index={i}
                  leg={leg}
                  isFirst={i === 0}
                  isOnly={legs.length === 1}
                  onChange={(updated) => updateLeg(i, updated)}
                  onRemove={() => removeLeg(i)}
                  error={legErrors[i]}
                />
              ))}

              <button
                type="button"
                onClick={addLeg}
                className="w-full py-2.5 px-4 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium font-body text-muted hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={14} />
                Add destination
              </button>

              <div className="flex items-center gap-3 mt-1">
                <label className="flex items-center gap-2 text-sm text-charcoal font-body cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addReturnLeg}
                    onChange={(e) => setAddReturnLeg(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Add return flight home
                </label>
              </div>

              {addReturnLeg && (
                <div className="bg-background border border-gray-100 rounded-xl p-3 space-y-2">
                  <p className="text-sm text-muted font-body">
                    {legs[legs.length - 1]?.destination || "Last destination"} → {homeOrigin}
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1 font-body">Return Date</label>
                    <input
                      type="date"
                      value={multiReturnDate}
                      onChange={(e) => setMultiReturnDate(e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* -- Submit -- */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={!isValid}
            icon={<ArrowRight size={16} />}
            className="mt-2"
          >
            Start Planning
          </Button>
        </form>
      </div>
    </PageTransition>
  );
}
