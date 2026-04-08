"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTripContext } from "@/context/TripContext";
import { api } from "@/services/api";
import { FlightSearchForm } from "@/components/flights/FlightSearchForm";
import { FlightCard } from "@/components/flights/FlightCard";
import { TrainSegmentCard } from "@/components/segments/TrainSegmentCard";
import { FerrySegmentCard } from "@/components/segments/FerrySegmentCard";
import { CarSegmentCard } from "@/components/segments/CarSegmentCard";
import { SortBar, SortOption } from "@/components/SortBar";
import { FilterBar, FlightFilters } from "@/components/FilterBar";
import type { FlightOffer, TripLeg } from "@/types/trip";

const MODE_LABELS: Record<string, { icon: string; label: string }> = {
  flight: { icon: "✈", label: "Flight" },
  train: { icon: "🚂", label: "Train" },
  ferry: { icon: "⛴", label: "Ferry" },
  car: { icon: "🚗", label: "Bus/Car" },
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

  const [newLeg, setNewLeg] = useState({
    origin: "",
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
        // Non-flight legs are auto-confirmed — clear stale immediately
        dispatch({ type: "CLEAR_STALE", payload: { key: `segments-${leg.leg_number}` } });
        continue;
      }
      if (!leg.origin || !leg.destination || !leg.departure_date) continue;
      if (leg.selected_flight) {
        // Already has a selection — clear stale
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
    setNewLeg({ origin: "", destination: "", departure_date: "", transport_mode: "flight" });
  }

  function handleRemoveLeg(leg_number: number) {
    dispatch({ type: "REMOVE_LEG", payload: { leg_number } });
  }

  const confirmedLegs = tripContext.legs.filter(isLegConfirmed).length;
  const totalLegs = tripContext.legs.length;
  const allLegsConfirmed = totalLegs > 0 && confirmedLegs === totalLegs;

  const validationIssues = tripContext.legs
    .filter((leg) => !isLegConfirmed(leg))
    .map((leg) => {
      const mode = leg.transport_mode ?? "flight";
      return `Leg ${leg.leg_number} (${leg.origin} → ${leg.destination}): ${
        mode === "flight" ? "search and select a flight" : "confirm your segment"
      }`;
    });

  if (tripContext.legs.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="text-gray-500">No trip set up yet.</p>
        <button onClick={() => router.push("/")} className="mt-4 text-blue-600 hover:underline">
          ← Go back to Trip Setup
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Travel Segments</h1>
        <p className="text-gray-500 mt-1">
          Configure how you&apos;re travelling between each destination.
        </p>
      </div>

      {tripContext.legs.map((leg) => {
        const mode = leg.transport_mode ?? "flight";
        const modeInfo = MODE_LABELS[mode] ?? MODE_LABELS.flight;
        const confirmed = isLegConfirmed(leg);

        return (
          <div key={leg.leg_number} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <span className="text-base">{modeInfo.icon}</span>
                <span>{modeInfo.label}</span>
                <span className="text-gray-400 font-normal">·</span>
                <span>
                  Leg {leg.leg_number}: {leg.origin} → {leg.destination}
                </span>
                <span className="ml-1 text-sm font-normal text-gray-400">{leg.departure_date}</span>
              </h2>
              <div className="flex items-center gap-2">
                {confirmed && (
                  <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
                    ✓ {mode === "flight" ? "Flight selected" : "Confirmed"}
                  </span>
                )}
                {tripContext.legs.length > 1 && (
                  <button
                    onClick={() => handleRemoveLeg(leg.leg_number)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove leg
                  </button>
                )}
              </div>
            </div>

            {mode === "flight" && (
              <>
                <FlightSearchForm
                  leg={leg}
                  onSearch={(params) => handleSearch(leg.leg_number, params)}
                  loading={loading[leg.leg_number] ?? false}
                />

                {loading[leg.leg_number] && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                    <span className="animate-spin inline-block">⟳</span>
                    <span>Searching flights…</span>
                  </div>
                )}

                {error[leg.leg_number] && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                    {error[leg.leg_number]}
                  </p>
                )}

                {displayResults[leg.leg_number] && displayResults[leg.leg_number].length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    <SortBar options={FLIGHT_SORT_OPTIONS} value={sortKey} onChange={setSortKey} />
                    <FilterBar variant="flights" filters={flightFilters} onChange={setFlightFilters} />
                  </div>
                )}

                {displayResults[leg.leg_number] && displayResults[leg.leg_number].length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No flights found.</p>
                )}

                <div className="space-y-2">
                  {(displayResults[leg.leg_number] ?? []).map((offer) => (
                    <FlightCard
                      key={offer.id}
                      offer={offer}
                      selected={leg.selected_flight?.id === offer.id}
                      onSelect={(o) => handleSelectFlight(leg.leg_number, o)}
                    />
                  ))}
                </div>
              </>
            )}

            {mode === "train" && <TrainSegmentCard leg={leg} />}
            {mode === "ferry" && <FerrySegmentCard leg={leg} />}
            {mode === "car" && <CarSegmentCard leg={leg} />}
          </div>
        );
      })}

      {/* Add another leg */}
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-medium text-gray-700 mb-3">+ Add another leg</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input
              value={newLeg.origin}
              onChange={(e) => setNewLeg((p) => ({ ...p, origin: e.target.value }))}
              placeholder="JFK"
              maxLength={3}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase tracking-widest w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input
              value={newLeg.destination}
              onChange={(e) => setNewLeg((p) => ({ ...p, destination: e.target.value }))}
              placeholder="NRT"
              maxLength={3}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase tracking-widest w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
            <input
              type="date"
              value={newLeg.departure_date}
              onChange={(e) => setNewLeg((p) => ({ ...p, departure_date: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Mode</label>
            <select
              value={newLeg.transport_mode}
              onChange={(e) =>
                setNewLeg((p) => ({ ...p, transport_mode: e.target.value as TripLeg["transport_mode"] }))
              }
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="flight">✈ Flight</option>
              <option value="train">🚂 Train</option>
              <option value="ferry">⛴ Ferry</option>
              <option value="car">🚗 Bus/Car</option>
            </select>
          </div>
          <button
            onClick={handleAddLeg}
            disabled={!newLeg.origin || !newLeg.destination || !newLeg.departure_date}
            className="bg-gray-800 hover:bg-gray-900 disabled:bg-gray-300 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Add Leg
          </button>
        </div>
      </div>

      {/* Validation panel + progress bar */}
      <div className="space-y-3 pt-2">
        {!allLegsConfirmed && validationIssues.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
            <p className="text-sm font-semibold text-amber-800">⚠ Before you continue:</p>
            <ul className="space-y-1">
              {validationIssues.map((issue, i) => (
                <li key={i} className="text-sm text-amber-700">• {issue}</li>
              ))}
            </ul>
          </div>
        )}

        {allLegsConfirmed && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <p className="text-sm font-medium text-green-700">
              ✓ All segments confirmed — ready to continue
            </p>
          </div>
        )}

        <div className="space-y-1">
          <div className="text-xs text-gray-500">{confirmedLegs} of {totalLegs} legs confirmed</div>
          <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                allLegsConfirmed ? "bg-green-500" : "bg-blue-400"
              }`}
              style={{ width: totalLegs > 0 ? `${(confirmedLegs / totalLegs) * 100}%` : "0%" }}
            />
          </div>
        </div>

        <div className="flex justify-between">
          <button onClick={() => router.push("/")} className="text-gray-500 hover:text-gray-700 text-sm">
            ← Back
          </button>
          <button
            onClick={() => router.push("/hotels")}
            disabled={!allLegsConfirmed}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2 rounded-lg transition-colors"
          >
            Continue to Hotels →
          </button>
        </div>
      </div>
    </div>
  );
}
