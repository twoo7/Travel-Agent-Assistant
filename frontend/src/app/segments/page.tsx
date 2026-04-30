"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useTripContext } from "@/context/TripContext";
import { api } from "@/services/api";
import { FlightSearchForm } from "@/components/flights/FlightSearchForm";
import { FlightCard } from "@/components/flights/FlightCard";
import { SelectedFlightSummary } from "@/components/flights/SelectedFlightSummary";
import { TrainSegmentCard } from "@/components/segments/TrainSegmentCard";
import { FerrySegmentCard } from "@/components/segments/FerrySegmentCard";
import { CarSegmentCard } from "@/components/segments/CarSegmentCard";
import { SortBar, SortOption } from "@/components/SortBar";
import { FilterBar, FlightFilters } from "@/components/FilterBar";
import { Button } from "@/components/ui/Button";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { AnimatedList, AnimatedListItem } from "@/components/ui/AnimatedList";
import type { FlightOffer, TripLeg } from "@/types/trip";
import {
  Plane, Train, Ship, Car, Check, AlertTriangle, ArrowRight, ArrowLeft, Plus, X,
  type LucideIcon,
} from "lucide-react";
import { iataToCityName, getAirportName } from "@/utils/airportNames";

const MODE_META: Record<string, { Icon: LucideIcon; label: string }> = {
  flight: { Icon: Plane,  label: "Flight"  },
  train:  { Icon: Train,  label: "Train"   },
  ferry:  { Icon: Ship,   label: "Ferry"   },
  car:    { Icon: Car,    label: "Bus/Car" },
};

const FLIGHT_SORT_OPTIONS: SortOption[] = [
  { key: "ai", label: "AI Pick" },
  { key: "price_asc", label: "Price ↑" },
  { key: "price_desc", label: "Price ↓" },
  { key: "duration", label: "Duration ↑" },
  { key: "stops", label: "Stops ↑" },
];

function parseDuration(iso: string): number | null {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return null;
  return (parseInt(m[1] ?? "0") * 60) + parseInt(m[2] ?? "0");
}

function isLegConfirmed(leg: TripLeg): boolean {
  const mode = leg.transport_mode ?? "flight";
  if (mode === "flight") return !!leg.selected_flight;
  return true;
}

export default function SegmentsPage() {
  const router = useRouter();
  const { state, dispatch } = useTripContext();
  const { tripContext } = state;

  const [results, setResults] = useState<Record<number, FlightOffer[]>>({});
  const [loading, setLoading] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<Record<number, string>>({});
  const autoFiredRef = useRef<Set<number>>(new Set());

  const [sortKey, setSortKey] = useState("ai");
  const [flightFilters, setFlightFilters] = useState<FlightFilters>({ maxStops: null, maxPrice: null });

  const lastDestination = tripContext.legs[tripContext.legs.length - 1]?.destination ?? "";
  const [newLeg, setNewLeg] = useState({
    origin: lastDestination,
    destination: "",
    departure_date: "",
    transport_mode: "flight" as TripLeg["transport_mode"],
  });

  const displayResults = useMemo(() => {
    const display: Record<number, FlightOffer[]> = {};
    for (const [key, offers] of Object.entries(results)) {
      let filtered = [...offers];
      if (flightFilters.maxStops !== null) filtered = filtered.filter((o) => o.stops <= flightFilters.maxStops!);
      if (flightFilters.maxPrice !== null) filtered = filtered.filter((o) => o.price <= flightFilters.maxPrice!);
      filtered.sort((a, b) => {
        if (sortKey === "ai") return a.ai_recommended === b.ai_recommended ? 0 : a.ai_recommended ? -1 : 1;
        if (sortKey === "price_asc") return a.price - b.price;
        if (sortKey === "price_desc") return b.price - a.price;
        if (sortKey === "stops") return a.stops - b.stops;
        if (sortKey === "duration") return (parseDuration(a.total_duration) ?? 0) - (parseDuration(b.total_duration) ?? 0);
        return 0;
      });
      display[Number(key)] = filtered;
    }
    return display;
  }, [results, sortKey, flightFilters]);

  async function handleSearch(
    legNumber: number,
    params: { origin: string; destination: string; departure_date: string }
  ) {
    setLoading((prev) => ({ ...prev, [legNumber]: true }));
    setError((prev) => ({ ...prev, [legNumber]: "" }));
    try {
      const offers = await api.searchFlights({
        trip_context: tripContext,
        leg_number: legNumber,
        origin: params.origin,
        destination: params.destination,
        departure_date: params.departure_date,
        adults: tripContext.adults,
        currency: tripContext.currency,
      });
      setResults((prev) => ({ ...prev, [legNumber]: offers }));
      dispatch({ type: "SET_FLIGHT_RESULTS", payload: { leg_number: legNumber, results: offers } });
    } catch (e) {
      setError((prev) => ({ ...prev, [legNumber]: String(e) }));
    } finally {
      setLoading((prev) => ({ ...prev, [legNumber]: false }));
    }
  }

  // Auto-fire search on mount for flight-mode legs; clear stale for non-flight legs
  useEffect(() => {
    for (const leg of tripContext.legs) {
      const mode = leg.transport_mode ?? "flight";
      if (mode !== "flight") {
        dispatch({ type: "CLEAR_STALE", payload: { key: `segments-${leg.leg_number}` } });
        continue;
      }
      if (!leg.origin || !leg.destination || !leg.departure_date) continue;
      if (leg.selected_flight) {
        dispatch({ type: "CLEAR_STALE", payload: { key: `segments-${leg.leg_number}` } });
        continue;
      }
      if (autoFiredRef.current.has(leg.leg_number)) continue;

      // Check if results are already cached in context
      if (leg.flight_results && leg.flight_results.length > 0) {
        setResults((prev) => ({ ...prev, [leg.leg_number]: leg.flight_results! }));
        autoFiredRef.current.add(leg.leg_number);
        continue;
      }

      autoFiredRef.current.add(leg.leg_number);
      handleSearch(leg.leg_number, {
        origin: leg.origin,
        destination: leg.destination,
        departure_date: leg.departure_date,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelectFlight(leg_number: number, offer: FlightOffer) {
    dispatch({ type: "SET_FLIGHT", payload: { leg_number, flight: offer } });
    dispatch({ type: "CLEAR_STALE", payload: { key: `segments-${leg_number}` } });
  }

  function handleAddLeg() {
    if (!newLeg.origin || !newLeg.destination || !newLeg.departure_date) return;
    const nextNum = (tripContext.legs[tripContext.legs.length - 1]?.leg_number ?? 0) + 1;
    dispatch({
      type: "ADD_LEG",
      payload: {
        leg_number: nextNum,
        origin: newLeg.origin.toUpperCase(),
        destination: newLeg.destination.toUpperCase(),
        departure_date: newLeg.departure_date,
        transport_mode: newLeg.transport_mode,
        hotel_stays: [],
        days: [],
      },
    });
    setNewLeg({ origin: "", destination: "", departure_date: "", transport_mode: "flight" as TripLeg["transport_mode"] });
  }

  function handleRemoveLeg(leg_number: number) {
    dispatch({ type: "REMOVE_LEG", payload: { leg_number } });
  }

  const confirmedLegs = tripContext.legs.filter(isLegConfirmed).length;
  const totalLegs = tripContext.legs.length;
  const allLegsConfirmed = totalLegs > 0 && confirmedLegs === totalLegs;
  const progressPct = totalLegs > 0 ? (confirmedLegs / totalLegs) * 100 : 0;

  const validationIssues = tripContext.legs
    .filter((leg) => !isLegConfirmed(leg))
    .map((leg) => {
      const mode = leg.transport_mode ?? "flight";
      return `Leg ${leg.leg_number} (${iataToCityName(leg.origin)} → ${iataToCityName(leg.destination)}): ${
        mode === "flight" ? "search and select a flight" : "confirm your segment"
      }`;
    });

  if (tripContext.legs.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="font-body" style={{ color: "var(--text-muted)" }}>No trip set up yet.</p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 font-body text-sm underline underline-offset-2"
          style={{ color: "var(--accent)" }}
        >
          ← Go back to Trip Setup
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[10px] font-semibold uppercase tracking-[2.5px] mb-2 font-body"
             style={{ color: "var(--text-eyebrow)" }}>
            Step 2 of 5 · Travel Segments
          </p>
          <h1 className="font-display text-4xl mb-2 leading-tight" style={{ color: "var(--text-primary)" }}>
            How are you <span style={{ color: "var(--accent)" }}>getting there?</span>
          </h1>
          <p className="font-body text-sm" style={{ color: "var(--text-muted)" }}>
            Configure how you&apos;re travelling between each destination.
          </p>
        </div>

        {/* Leg cards */}
        {tripContext.legs.map((leg) => {
          const mode = leg.transport_mode ?? "flight";
          const meta = MODE_META[mode] ?? MODE_META.flight;
          const { Icon } = meta;
          const confirmed = isLegConfirmed(leg);

          return (
            <div key={leg.leg_number} className="space-y-3">
              {/* Leg header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[2.5px] mb-1 font-body"
                     style={{ color: "var(--text-eyebrow)" }}>
                    Leg {leg.leg_number} · {leg.origin} {iataToCityName(leg.origin)} ({getAirportName(leg.origin)}) → {leg.destination} {iataToCityName(leg.destination)} ({getAirportName(leg.destination)}) · {leg.departure_date}
                  </p>
                  <h2 className="font-display text-2xl" style={{ color: "var(--text-primary)" }}>
                    Select Your {MODE_META[leg.transport_mode ?? "flight"]?.label ?? "Flight"}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {confirmed && (
                    <span
                      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full font-body"
                      style={{ color: "var(--success)", background: "rgba(107,144,128,0.15)", border: "1px solid rgba(107,144,128,0.3)" }}
                    >
                      <Check size={10} />
                      {mode === "flight" ? "Flight selected" : "Confirmed"}
                    </span>
                  )}
                  {/* Icon for mode indicator */}
                  <Icon size={16} style={{ color: "var(--accent)" }} />
                  {tripContext.legs.length > 1 && (
                    <motion.button
                      whileHover={{ color: "rgba(239,68,68,0.85)", backgroundColor: "rgba(239,68,68,0.1)" }}
                      onClick={() => handleRemoveLeg(leg.leg_number)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                      style={{ color: "var(--text-muted)" }}
                      aria-label={`Remove leg ${leg.leg_number}`}
                    >
                      <X size={14} />
                    </motion.button>
                  )}
                </div>
              </div>

              {/* Flight mode content */}
              {mode === "flight" && leg.selected_flight && (
                <SelectedFlightSummary
                  leg={leg}
                  onChangeFlight={() => dispatch({ type: "SET_FLIGHT", payload: { leg_number: leg.leg_number, flight: null } })}
                  onSaveBooking={(booking) => dispatch({ type: "SET_FLIGHT_BOOKING", payload: { leg_number: leg.leg_number, booking } })}
                />
              )}

              {mode === "flight" && !leg.selected_flight && (
                <>
                  <FlightSearchForm
                    leg={leg}
                    onSearch={(params) => handleSearch(leg.leg_number, params)}
                    loading={loading[leg.leg_number] ?? false}
                  />

                  {loading[leg.leg_number] && (
                    <div className="space-y-2">
                      {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
                    </div>
                  )}

                  {error[leg.leg_number] && (
                    <div className="flex items-start gap-2 text-sm rounded-xl px-4 py-3 font-body"
                         style={{ color: "rgba(239,68,68,0.9)", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                      <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                      <span>{error[leg.leg_number]}</span>
                    </div>
                  )}

                  {results[leg.leg_number] && results[leg.leg_number].length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      <SortBar options={FLIGHT_SORT_OPTIONS} value={sortKey} onChange={setSortKey} />
                      <FilterBar variant="flights" filters={flightFilters} onChange={setFlightFilters} />
                    </div>
                  )}

                  {displayResults[leg.leg_number] && displayResults[leg.leg_number].length === 0 && (
                    <p className="text-sm text-center py-6 font-body" style={{ color: "var(--text-muted)" }}>No flights found.</p>
                  )}

                  <AnimatedList>
                    {(displayResults[leg.leg_number] ?? []).map((offer) => (
                      <AnimatedListItem key={offer.id}>
                        <FlightCard
                          offer={offer}
                          selected={leg.selected_flight?.id === offer.id}
                          onSelect={(o) => handleSelectFlight(leg.leg_number, o)}
                        />
                      </AnimatedListItem>
                    ))}
                  </AnimatedList>
                </>
              )}

              {mode === "train" && <TrainSegmentCard leg={leg} />}
              {mode === "ferry" && <FerrySegmentCard leg={leg} />}
              {mode === "car" && <CarSegmentCard leg={leg} />}
            </div>
          );
        })}

        {/* Add another leg */}
        <div className="rounded-xl p-5 space-y-3"
             style={{ border: "1px dashed rgba(255,255,255,0.15)", background: "var(--glass-1)" }}>
          <h3 className="text-sm font-semibold flex items-center gap-1.5 font-body" style={{ color: "var(--text-muted)" }}>
            <Plus size={14} />
            Add another leg
          </h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-medium mb-1 font-body" style={{ color: "var(--text-muted)" }}>From</label>
              <input
                value={newLeg.origin}
                onChange={(e) => setNewLeg((p) => ({ ...p, origin: e.target.value }))}
                placeholder="e.g. KIX"
                maxLength={3}
                className="w-full rounded-lg px-3 py-2 text-sm uppercase tracking-widest font-mono focus:outline-none transition-colors"
                style={{ border: "1px solid var(--glass-border-2)" }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-medium mb-1 font-body" style={{ color: "var(--text-muted)" }}>To</label>
              <input
                value={newLeg.destination}
                onChange={(e) => setNewLeg((p) => ({ ...p, destination: e.target.value }))}
                placeholder="Destination"
                maxLength={3}
                className="w-full rounded-lg px-3 py-2 text-sm uppercase tracking-widest font-mono focus:outline-none transition-colors"
                style={{ border: "1px solid var(--glass-border-2)" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 font-body" style={{ color: "var(--text-muted)" }}>Date</label>
              <input
                type="date"
                value={newLeg.departure_date}
                onChange={(e) => setNewLeg((p) => ({ ...p, departure_date: e.target.value }))}
                className="rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors font-body"
                style={{ border: "1px solid var(--glass-border-2)" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 font-body" style={{ color: "var(--text-muted)" }}>Mode</label>
              <select
                value={newLeg.transport_mode}
                onChange={(e) =>
                  setNewLeg((p) => ({ ...p, transport_mode: e.target.value as TripLeg["transport_mode"] }))
                }
                className="rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors font-body"
                style={{ border: "1px solid var(--glass-border-2)" }}
              >
                <option value="flight">Flight</option>
                <option value="train">Train</option>
                <option value="ferry">Ferry</option>
                <option value="car">Bus/Car</option>
              </select>
            </div>
            <Button
              variant="secondary"
              size="md"
              onClick={handleAddLeg}
              disabled={!newLeg.origin || !newLeg.destination || !newLeg.departure_date}
              icon={<Plus size={14} />}
            >
              Add Leg
            </Button>
          </div>
        </div>

        {/* Validation + progress */}
        <div className="space-y-3 pt-2">
          {!allLegsConfirmed && validationIssues.length > 0 && (
            <div className="flex items-start gap-3 rounded-xl p-4"
                 style={{ background: "rgba(212,165,116,0.1)", border: "1px solid rgba(212,165,116,0.3)" }}>
              <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: "var(--warning)" }} />
              <div>
                <p className="text-sm font-semibold font-body mb-1" style={{ color: "var(--warning)" }}>Before you continue:</p>
                <ul className="space-y-0.5">
                  {validationIssues.map((issue, i) => (
                    <li key={i} className="text-sm font-body" style={{ color: "rgba(212,165,116,0.8)" }}>• {issue}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {allLegsConfirmed && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3"
                 style={{ background: "rgba(107,144,128,0.1)", border: "1px solid rgba(107,144,128,0.2)" }}>
              <Check size={15} style={{ color: "var(--success)" }} />
              <p className="text-sm font-medium font-body" style={{ color: "var(--success)" }}>
                All segments confirmed — ready to continue
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-body" style={{ color: "var(--text-muted)" }}>{confirmedLegs} of {totalLegs} legs confirmed</span>
              <span className="text-xs font-semibold font-body" style={{ color: "var(--accent)" }}>{Math.round(progressPct)}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "var(--glass-2)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%`, background: allLegsConfirmed ? "var(--success)" : "var(--accent)" }}
              />
            </div>
          </div>

          <div className="flex justify-between pt-1">
            <Button variant="ghost" size="md" onClick={() => router.push("/")} icon={<ArrowLeft size={14} />}>
              Back
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => router.push("/hotels")}
              disabled={!allLegsConfirmed}
              icon={<ArrowRight size={14} />}
            >
              Continue to Hotels
            </Button>
          </div>
        </div>
      </div>
  );
}
