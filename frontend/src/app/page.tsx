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

const MODE_META: Record<
  TransportMode,
  { icon: string; label: string; selectedClass: string; dotClass: string }
> = {
  flight: {
    icon: "✈",
    label: "Flight",
    selectedClass: "border-blue-500 bg-blue-50 text-blue-700",
    dotClass: "text-blue-500",
  },
  train: {
    icon: "🚂",
    label: "Train",
    selectedClass: "border-green-500 bg-green-50 text-green-700",
    dotClass: "text-green-500",
  },
  ferry: {
    icon: "⛴",
    label: "Ferry",
    selectedClass: "border-sky-500 bg-sky-50 text-sky-700",
    dotClass: "text-sky-500",
  },
  car: {
    icon: "🚗",
    label: "Bus/Car",
    selectedClass: "border-amber-500 bg-amber-50 text-amber-700",
    dotClass: "text-amber-500",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function defaultMode(modes: ModeAvailability[]): TransportMode {
  // Prefer recommended mode; fall back to first available
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
      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        How are you getting there?
      </label>
      <div className="flex gap-2 flex-wrap">
        {available.map((m) => {
          const meta = MODE_META[m.mode];
          const isSelected = selected === m.mode;
          return (
            <button
              key={m.mode}
              type="button"
              onClick={() => onSelect(m.mode)}
              className={`flex-1 min-w-0 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                isSelected
                  ? meta.selectedClass
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              <span className="mr-1">{meta.icon}</span>
              {m.label}
              {!isSelected && m.recommended && (
                <span className={`ml-1 ${meta.dotClass}`}>•</span>
              )}
            </button>
          );
        })}
      </div>
      {availability.primaryHint && (
        <p className="text-xs text-gray-500 mt-1 italic">
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
  // When destination changes, recompute default transport mode
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
    <div className="border border-gray-200 rounded-xl p-4 space-y-3 relative">
      {!isFirst && !isOnly && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-lg leading-none"
          aria-label="Remove leg"
        >
          ✕
        </button>
      )}

      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
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
        <p className="text-xs text-red-500">{error}</p>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Departure date
        </label>
        <input
          type="date"
          value={leg.date}
          onChange={(e) => onChange({ ...leg, date: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

  // Single-destination fields
  const [homeOrigin, setHomeOrigin] = useState("");
  const [singleDest, setSingleDest] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");

  // Passengers
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

  // ── Sync home origin into first leg ────────────────────────────────────────
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

  // ── Multi-destination toggle ───────────────────────────────────────────────
  const handleMultiToggle = useCallback(
    (checked: boolean) => {
      setMultiMode(checked);
      if (checked) {
        // Build first leg from single-destination fields
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

  // ── Leg mutations ──────────────────────────────────────────────────────────
  const updateLeg = useCallback((index: number, updated: LegDraft) => {
    setLegs((prev) => {
      const next = [...prev];
      next[index] = updated;
      // Lock subsequent legs' origins to this leg's destination
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
      // Re-lock the origin of the leg that slid into this position
      if (index < next.length && index > 0) {
        next[index] = {
          ...next[index],
          origin: next[index - 1].destination,
        };
      }
      return next;
    });
  }, []);

  // ── Validation ─────────────────────────────────────────────────────────────
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
      return (
        legs.every(
          (l) => l.origin && l.destination && l.date && l.origin !== l.destination
        )
      );
    }
    return (
      !!singleDest &&
      !!departureDate &&
      homeOrigin !== singleDest
    );
  }, [homeOrigin, multiMode, legs, singleDest, departureDate]);

  // ── Stale helper ───────────────────────────────────────────────────────────
  function markStaleIfEditing(legNumbers: number[], steps: string[]) {
    if (tripContext.legs.length === 0) return;
    const keys = legNumbers.flatMap((n) => steps.map((s) => `${s}-${n}`));
    dispatch({ type: "MARK_STALE", payload: { keys } });
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;

    if (tripContext.legs.length > 0) {
      // Editing an existing trip — preserve legs, just update meta
      dispatch({
        type: "UPDATE_TRIP_META",
        payload: { home_origin: homeOrigin, adults, children, currency },
      });
    } else {
      // First-time setup — reset and add legs
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

  // ── Single-destination transport hint ─────────────────────────────────────
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto">
      {/* Stale banner */}
      {state.staleSteps.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-amber-800">
            ⚠️ Changes detected — {state.staleSteps.length} step{state.staleSteps.length > 1 ? "s" : ""} need attention
          </p>
          <div className="space-y-2">
            {state.staleSteps.map((key) => {
              const [stepName, legNum] = key.split("-");
              const label = STEP_LABELS[stepName] ?? stepName;
              const action = STALE_ACTIONS[stepName] ?? "review this step";
              const href = stepName === "segments" ? "/segments" : "/hotels";
              return (
                <div key={key} className="flex items-center justify-between gap-3">
                  <p className="text-sm text-amber-700">
                    • <span className="font-medium">{label} (Leg {legNum})</span>: {action}
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push(href)}
                    className="shrink-0 text-xs font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 px-3 py-1 rounded-lg transition-colors"
                  >
                    Go to {label} →
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="text-center mb-8">
        <div className="text-5xl mb-3">✈️</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Plan Your Trip</h1>
        <p className="text-gray-500">Tell us where you&apos;re going to get started.</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-[22px]"
      >
        {/* ── Single-destination fields (always visible) ── */}
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
              <p className="text-xs text-red-500 -mt-2">{singleDestError}</p>
            )}

            {/* Transport hint for single mode */}
            {singleAvailability && singleAvailability.modes.length > 0 && (
              <div className="bg-gray-50 rounded-lg px-3 py-2 flex items-center gap-2">
                <span className="text-lg">{MODE_META[singleDefaultMode].icon}</span>
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    {MODE_META[singleDefaultMode].label}
                  </span>
                  {singleAvailability.primaryHint && (
                    <p className="text-xs text-gray-500 italic">
                      {singleAvailability.primaryHint}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                  Departure Date
                </label>
                <input
                  type="date"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  onBlur={() => markStaleIfEditing([1], ["segments", "hotels"])}
                  required={!multiMode}
                  className="w-full border border-gray-300 rounded-lg px-[14px] py-[11px] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                  Return Date{" "}
                  <span className="text-gray-400 font-normal normal-case">(optional)</span>
                </label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-[14px] py-[11px] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </>
        )}

        {/* ── Passengers ── */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Adults
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setAdults((a) => Math.max(1, a - 1));
                  const keys = tripContext.legs.flatMap((l) => [
                    `segments-${l.leg_number}`,
                    `hotels-${l.leg_number}`,
                  ]);
                  if (keys.length) dispatch({ type: "MARK_STALE", payload: { keys } });
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium"
              >
                −
              </button>
              <span className="text-base font-bold min-w-[2rem] text-center text-gray-900">
                {adults}
              </span>
              <button
                type="button"
                onClick={() => {
                  setAdults((a) => Math.min(9, a + 1));
                  const keys = tripContext.legs.flatMap((l) => [
                    `segments-${l.leg_number}`,
                    `hotels-${l.leg_number}`,
                  ]);
                  if (keys.length) dispatch({ type: "MARK_STALE", payload: { keys } });
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium"
              >
                +
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Children
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setChildren((c) => Math.max(0, c - 1));
                  const keys = tripContext.legs.flatMap((l) => [
                    `segments-${l.leg_number}`,
                    `hotels-${l.leg_number}`,
                  ]);
                  if (keys.length) dispatch({ type: "MARK_STALE", payload: { keys } });
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium"
              >
                −
              </button>
              <span className="text-base font-bold min-w-[2rem] text-center text-gray-900">
                {children}
              </span>
              <button
                type="button"
                onClick={() => {
                  setChildren((c) => Math.min(9, c + 1));
                  const keys = tripContext.legs.flatMap((l) => [
                    `segments-${l.leg_number}`,
                    `hotels-${l.leg_number}`,
                  ]);
                  if (keys.length) dispatch({ type: "MARK_STALE", payload: { keys } });
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* ── Multi-destination toggle ── */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={multiMode}
            onChange={(e) => handleMultiToggle(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">
            Multi-destination trip
          </span>
        </label>

        {/* ── Multi-destination leg builder ── */}
        {multiMode && (
          <div className="space-y-3">
            {/* Home origin — only shown once above the leg list */}
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
              className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              + Add destination
            </button>

            <div className="flex items-center gap-3 mt-1">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
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
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <p className="text-sm text-gray-600">
                  {legs[legs.length - 1]?.destination || "Last destination"} → {homeOrigin}
                </p>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Return Date</label>
                  <input
                    type="date"
                    value={multiReturnDate}
                    onChange={(e) => setMultiReturnDate(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Currency ── */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
            Currency
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* ── Submit ── */}
        <button
          type="submit"
          disabled={!isValid}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors mt-2"
        >
          Start Planning →
        </button>
      </form>
    </div>
  );
}
