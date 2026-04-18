"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTripContext } from "@/context/TripContext";
import { api } from "@/services/api";
import { SuggestionsSidebar } from "@/components/itinerary/SuggestionsSidebar";
import { DayPlanner } from "@/components/itinerary/DayPlanner";
import { TripMap } from "@/components/itinerary/TripMap";
import { Button } from "@/components/ui/Button";
import type { DayPlan, DayItem, POI, TripContext } from "@/types/trip";
import { Sparkles, ArrowLeft, ArrowRight } from "lucide-react";
import { iataToCityName } from "@/utils/airportNames";

function buildInitialDays(tripContext: TripContext): DayPlan[] {
  const days: DayPlan[] = [];
  let dayNumber = 1;

  for (const leg of tripContext.legs) {
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

      if (d === 0) {
        items.push({
          type: "airport",
          name: `${leg.origin} → ${leg.destination} Arrival`,
          address: leg.destination,
          lat: 0,
          lng: 0,
        });
      }

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
  const [isMobile, setIsMobile] = useState(false);
  const autoFetched = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (tripContext.legs.length > 0 && days.length === 0) {
      const allExistingDays = tripContext.legs.flatMap((l) => l.days);
      setDays(allExistingDays.length > 0 ? allExistingDays : buildInitialDays(tripContext));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripContext.legs]);

  // Auto-fetch POI suggestions when leg changes (or on initial mount)
  useEffect(() => {
    autoFetched.current = false;
    if (pois.length === 0 && tripContext.legs.length > 0) {
      autoFetched.current = true;
      handleFetchPOIs();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLeg]);

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

  const handleRefreshPOIs = useCallback(async () => {
    setPois([]);
    autoFetched.current = false;
    await handleFetchPOIs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLeg, tripContext]);

  function handleAddPOI(poi: POI) {
    dispatch({ type: "ADD_UNSCHEDULED_POI", payload: poi });
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
    dispatch({ type: "SET_DAYS", payload: days });
    try {
      const narratives = await api.generateItinerary({
        ...tripContext,
        legs: tripContext.legs.map((leg) => ({
          ...leg,
          days: days.filter((d) => d.leg_number === leg.leg_number),
        })),
      });
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
    } finally {
      setGeneratingItinerary(false);
    }
  }

  function handleDaysChange(newDays: DayPlan[]) {
    setDays(newDays);
  }

  if (tripContext.legs.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="font-body" style={{ color: "var(--text-muted)" }}>
          Your session was reset.{" "}
          <a href="/trips" className="underline" style={{ color: "var(--accent)" }}>
            Visit your trips page
          </a>{" "}
          to restore a saved trip.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100dvh-2.75rem)] md:h-screen">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display" style={{ color: "var(--text-primary)" }}>Itinerary Builder</h1>
          <p className="text-sm mt-0.5 font-body" style={{ color: "var(--text-muted)" }}>
            Add places, arrange your days, then generate your final itinerary.
          </p>
        </div>

        <div className="flex items-center gap-3 pr-44">
          {/* Leg selector */}
          {tripContext.legs.length > 1 && (
            <div
              className="flex gap-1 p-1 rounded-lg"
              style={{ background: "var(--glass-2)", border: "1px solid var(--glass-border-2)" }}
            >
              {tripContext.legs.map((leg) => (
                <button
                  key={leg.leg_number}
                  onClick={() => setCurrentLeg(leg.leg_number)}
                  className="text-xs px-3 py-1.5 rounded-md transition-colors font-body font-medium"
                  style={currentLeg === leg.leg_number
                    ? { background: "var(--accent)", color: "white" }
                    : { color: "var(--text-muted)" }
                  }
                >
                  {iataToCityName(leg.destination)}
                </button>
              ))}
            </div>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={handleFetchPOIs}
            loading={loadingPois}
            icon={<Sparkles size={13} />}
          >
            {loadingPois
              ? "Loading…"
              : `Suggest places in ${iataToCityName(tripContext.legs[currentLeg - 1]?.destination ?? "")}`}
          </Button>
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
          onRefresh={handleRefreshPOIs}
          refreshing={loadingPois}
          defaultCollapsed={isMobile}
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
          <TripMap days={days} currentLeg={currentLeg} />
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex justify-between pt-2 border-t" style={{ borderColor: "var(--glass-border-1)" }}>
        <Button variant="ghost" size="md" onClick={() => router.push("/hotels")} icon={<ArrowLeft size={14} />}>
          Back to Hotels
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={handleGenerateItinerary}
          disabled={generatingItinerary || days.length === 0}
          loading={generatingItinerary}
          icon={<ArrowRight size={14} />}
        >
          {generatingItinerary ? "Generating…" : "Generate Itinerary"}
        </Button>
      </div>
    </div>
  );
}
