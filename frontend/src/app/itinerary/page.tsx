"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTripContext } from "@/context/TripContext";
import { api } from "@/services/api";
import { SuggestionsSidebar } from "@/components/itinerary/SuggestionsSidebar";
import { DayPlanner } from "@/components/itinerary/DayPlanner";
import { TripMap } from "@/components/itinerary/TripMap";
import type { DayPlan, DayItem, POI, TripContext } from "@/types/trip";

function buildInitialDays(tripContext: TripContext): DayPlan[] {
  const days: DayPlan[] = [];
  let dayNumber = 1;

  for (const leg of tripContext.legs) {
    // Build date range from departure_date using hotel check-in/check-out if available
    const checkIn = leg.hotel_stays[0]?.check_in ?? leg.departure_date;
    const checkOut = leg.hotel_stays[leg.hotel_stays.length - 1]?.check_out ?? leg.departure_date;

    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    const numDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000));

    for (let d = 0; d < numDays; d++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + d);
      const dateStr = date.toISOString().split("T")[0];

      const items: DayItem[] = [];

      // Arrival day: pin airport
      if (d === 0) {
        items.push({
          type: "airport",
          name: `${leg.origin} → ${leg.destination} Arrival`,
          address: leg.destination,
          lat: 0,
          lng: 0,
        });
      }

      // Add hotel as default first item (after airport on arrival day)
      if (leg.hotel_stays.length > 0) {
        const stay = leg.hotel_stays[0];
        items.push({
          type: "hotel",
          name: stay.hotel.name,
          address: stay.hotel.address,
          lat: stay.hotel.lat,
          lng: stay.hotel.lng,
        });
      }

      days.push({
        day_number: dayNumber++,
        date: dateStr,
        leg_number: leg.leg_number,
        city: leg.destination,
        items,
      });
    }
  }

  return days;
}

export default function ItineraryPage() {
  const router = useRouter();
  const { state, dispatch } = useTripContext();
  const { tripContext } = state;

  const [days, setDays] = useState<DayPlan[]>([]);
  const [pois, setPois] = useState<POI[]>([]);
  const [loadingPois, setLoadingPois] = useState(false);
  const [generatingItinerary, setGeneratingItinerary] = useState(false);
  const [currentLeg, setCurrentLeg] = useState(1);

  // Initialize days from trip context
  useEffect(() => {
    if (tripContext.legs.length > 0 && days.length === 0) {
      const allExistingDays = tripContext.legs.flatMap((l) => l.days);
      setDays(allExistingDays.length > 0 ? allExistingDays : buildInitialDays(tripContext));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripContext.legs]);

  async function handleFetchPOIs() {
    if (!tripContext.legs[currentLeg - 1]) return;
    setLoadingPois(true);
    try {
      const results = await api.suggestPOIs({
        trip_context: tripContext,
        leg_number: currentLeg,
      });
      setPois((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        return [...prev, ...results.filter((r) => !existingIds.has(r.id))];
      });
    } catch (e) {
      console.error("POI fetch failed:", e);
    } finally {
      setLoadingPois(false);
    }
  }

  function handleAddPOI(poi: POI) {
    dispatch({ type: "ADD_UNSCHEDULED_POI", payload: poi });
    // Add to the first day of the current leg as a starting point
    const legDays = days.filter((d) => d.leg_number === currentLeg);
    if (legDays.length === 0) return;
    const targetDay = legDays[0];
    const newItem: DayItem = {
      type: "poi",
      name: poi.name,
      address: poi.address,
      lat: poi.lat,
      lng: poi.lng,
      duration_mins: poi.typical_visit_duration_mins,
      notes: poi.claude_note,
    };
    setDays((prev) =>
      prev.map((d) =>
        d.day_number === targetDay.day_number
          ? { ...d, items: [...d.items, newItem] }
          : d
      )
    );
  }

  const addedIds = new Set(
    [...tripContext.unscheduled_pois, ...tripContext.saved_pois].map((p) => p.id)
  );

  async function handleGenerateItinerary() {
    setGeneratingItinerary(true);
    // Persist current days into context before generating
    dispatch({ type: "SET_DAYS", payload: days });
    try {
      const narratives = await api.generateItinerary({
        ...tripContext,
        legs: tripContext.legs.map((leg) => ({
          ...leg,
          days: days.filter((d) => d.leg_number === leg.leg_number),
        })),
      });
      // Build ItineraryDay array from narrative + day data
      const itineraryDays = days.map((day) => ({
        day_number: day.day_number,
        date: day.date,
        city: day.city,
        narrative: narratives[`day_${day.day_number}`] ?? "",
        items: day.items,
      }));
      dispatch({ type: "SET_ITINERARY", payload: itineraryDays });
      router.push("/export");
    } catch (e) {
      console.error("Itinerary generation failed:", e);
      setGeneratingItinerary(false);
    }
  }

  function handleDaysChange(newDays: DayPlan[]) {
    setDays(newDays);
  }

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
    <div className="flex flex-col gap-4 h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Itinerary Builder</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Add POIs, arrange your days, then generate the narrative.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Leg selector */}
          {tripContext.legs.length > 1 && (
            <div className="flex gap-1">
              {tripContext.legs.map((leg) => (
                <button
                  key={leg.leg_number}
                  onClick={() => setCurrentLeg(leg.leg_number)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                    currentLeg === leg.leg_number
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {leg.destination}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={handleFetchPOIs}
            disabled={loadingPois}
            className="text-sm bg-white border border-gray-200 hover:border-blue-400 text-gray-700 px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {loadingPois ? "Loading…" : "✨ Get AI Suggestions"}
          </button>
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: Suggestions sidebar */}
        <SuggestionsSidebar
          pois={pois}
          addedIds={addedIds}
          onAdd={handleAddPOI}
          loading={loadingPois}
        />

        {/* Middle: Day planner */}
        <div className="flex-1 overflow-y-auto">
          <DayPlanner
            days={days}
            onDaysChange={handleDaysChange}
            unscheduledPois={tripContext.unscheduled_pois}
          />
        </div>

        {/* Right: Map */}
        <div className="w-80 shrink-0 hidden lg:flex flex-col">
          <TripMap days={days} />
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex justify-between pt-2 border-t border-gray-200">
        <button onClick={() => router.push("/hotels")} className="text-gray-500 hover:text-gray-700 text-sm">
          ← Back to Hotels
        </button>
        <button
          onClick={handleGenerateItinerary}
          disabled={generatingItinerary || days.length === 0}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          {generatingItinerary ? (
            <>
              <span className="animate-spin">⟳</span> Generating…
            </>
          ) : (
            "✨ Generate Itinerary →"
          )}
        </button>
      </div>
    </div>
  );
}
