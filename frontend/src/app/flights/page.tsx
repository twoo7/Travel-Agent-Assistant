"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTripContext } from "@/context/TripContext";
import { api } from "@/services/api";
import { FlightSearchForm } from "@/components/flights/FlightSearchForm";
import { FlightCard } from "@/components/flights/FlightCard";
import type { FlightOffer } from "@/types/trip";

export default function FlightsPage() {
  const router = useRouter();
  const { state, dispatch } = useTripContext();
  const { tripContext } = state;

  const [results, setResults] = useState<Record<number, FlightOffer[]>>({});
  const [loading, setLoading] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<Record<number, string>>({});

  const [newLeg, setNewLeg] = useState({ origin: "", destination: "", departure_date: "" });

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
    } catch (e) {
      setError((prev) => ({ ...prev, [legNumber]: String(e) }));
    } finally {
      setLoading((prev) => ({ ...prev, [legNumber]: false }));
    }
  }

  function handleSelectFlight(leg_number: number, offer: FlightOffer) {
    dispatch({ type: "SET_FLIGHT", payload: { leg_number, flight: offer } });
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
        hotel_stays: [],
        days: [],
      },
    });
    setNewLeg({ origin: "", destination: "", departure_date: "" });
  }

  function handleRemoveLeg(leg_number: number) {
    dispatch({ type: "REMOVE_LEG", payload: { leg_number } });
  }

  const allLegsHaveFlights = tripContext.legs.length > 0 && tripContext.legs.every((l) => l.selected_flight);

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
        <h1 className="text-2xl font-bold text-gray-900">Flight Segments</h1>
        <p className="text-gray-500 mt-1">
          Add all flight legs for your trip, then select a flight for each.
        </p>
      </div>

      {tripContext.legs.map((leg) => (
        <div key={leg.leg_number} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">
              Leg {leg.leg_number}: {leg.origin} → {leg.destination}
              <span className="ml-2 text-sm font-normal text-gray-400">{leg.departure_date}</span>
            </h2>
            {leg.selected_flight && (
              <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
                ✓ Flight selected
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

          <FlightSearchForm
            leg={leg}
            onSearch={(params) => handleSearch(leg.leg_number, params)}
            loading={loading[leg.leg_number] ?? false}
          />

          {error[leg.leg_number] && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error[leg.leg_number]}
            </p>
          )}

          {results[leg.leg_number] && results[leg.leg_number].length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">No flights found.</p>
          )}

          <div className="space-y-2">
            {(results[leg.leg_number] ?? []).map((offer) => (
              <FlightCard
                key={offer.id}
                offer={offer}
                selected={leg.selected_flight?.id === offer.id}
                onSelect={(o) => handleSelectFlight(leg.leg_number, o)}
              />
            ))}
          </div>
        </div>
      ))}

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
          <button
            onClick={handleAddLeg}
            disabled={!newLeg.origin || !newLeg.destination || !newLeg.departure_date}
            className="bg-gray-800 hover:bg-gray-900 disabled:bg-gray-300 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Add Leg
          </button>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <button onClick={() => router.push("/")} className="text-gray-500 hover:text-gray-700 text-sm">
          ← Back
        </button>
        <button
          onClick={() => router.push("/hotels")}
          disabled={!allLegsHaveFlights}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2 rounded-lg transition-colors"
        >
          Continue to Hotels →
        </button>
      </div>
    </div>
  );
}
