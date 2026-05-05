"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { APIProvider } from "@vis.gl/react-google-maps";
import { useTripContext } from "@/context/TripContext";
import { api } from "@/services/api";
import { SuggestionsSidebar } from "@/components/itinerary/SuggestionsSidebar";
import { DayPlanner } from "@/components/itinerary/DayPlanner";
import { TripMap } from "@/components/itinerary/TripMap";
import { LocationDetailSheet, type DetailTarget } from "@/components/itinerary/LocationDetailSheet";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { DayPlan, DayItem, POI, TripContext, HopMode, RouteSegment } from "@/types/trip";
import { Sparkles, ArrowLeft, ArrowRight, CalendarDays, Lightbulb, Map } from "lucide-react";
import { iataToCityName } from "@/utils/airportNames";
import { haversineKm, recommendedMode } from "@/utils/distance";

type MobileTab = "plan" | "suggest" | "map";

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
          name: `${iataToCityName(leg.origin)} → ${iataToCityName(leg.destination)} Arrival`,
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

  const { toast } = useToast();
  const [days, setDays] = useState<DayPlan[]>([]);
  const [pois, setPois] = useState<POI[]>([]);
  const [loadingPois, setLoadingPois] = useState(false);
  const [generatingItinerary, setGeneratingItinerary] = useState(false);
  const [currentLeg, setCurrentLeg] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("plan");
  const [focusedDays, setFocusedDays] = useState<number[]>([]);
  const [scheduledPoiIds, setScheduledPoiIds] = useState<Set<string>>(new Set());
  const [detailTarget, setDetailTarget] = useState<DetailTarget | null>(null);
  const autoFetched = useRef(false);
  const distanceFetchIdRef = useRef(0);
  const daysFingerprintRef = useRef("");

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
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

  useEffect(() => {
    autoFetched.current = false;
    if (pois.length === 0 && tripContext.legs.length > 0) {
      autoFetched.current = true;
      handleFetchPOIs();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLeg]);

  // Debounced distance/polyline fetch — fires 600ms after any relevant days change
  useEffect(() => {
    if (days.length === 0) return;
    const fingerprint = days
      .flatMap((d) => d.items.map((item) => `${item.lat},${item.lng},${item.transport_mode ?? ""}`))
      .join("|");
    if (fingerprint === daysFingerprintRef.current) return;
    daysFingerprintRef.current = fingerprint;

    const fetchId = ++distanceFetchIdRef.current;
    const timer = setTimeout(async () => {
      try {
        const newDays = await Promise.all(
          days.map(async (day) => {
            const validItems = day.items.filter((item) => !(item.lat === 0 && item.lng === 0));
            if (validItems.length < 2) return day;

            const mode_per_hop = validItems.slice(0, -1).map((item, i) => {
              if (item.transport_mode) return item.transport_mode;
              const next = validItems[i + 1];
              return recommendedMode(haversineKm(item.lat, item.lng, next.lat, next.lng));
            });

            const segments: RouteSegment[] = await api.getDistances({ day_items: validItems, mode_per_hop });
            if (distanceFetchIdRef.current !== fetchId) return day;

            let validIdx = 0;
            const newItems = day.items.map((item) => {
              if (item.lat === 0 && item.lng === 0) return item;
              const vi = validIdx++;
              if (vi < segments.length && segments[vi]) {
                const seg = segments[vi];
                return {
                  ...item,
                  distance_to_next_km: seg.distance_km ?? undefined,
                  travel_time_to_next_mins: seg.travel_time_mins ?? undefined,
                  route_polyline_to_next: seg.encoded_polyline ?? undefined,
                  transport_mode: seg.mode as HopMode,
                };
              }
              return {
                ...item,
                distance_to_next_km: undefined,
                travel_time_to_next_mins: undefined,
                route_polyline_to_next: undefined,
              };
            });
            return { ...day, items: newItems };
          })
        );
        if (distanceFetchIdRef.current !== fetchId) return;
        setDays(newDays);
      } catch (e) {
        console.error("Distance fetch failed:", e);
      }
    }, 600);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const handleFetchPOIs = useCallback(async (excludeNames?: string[]) => {
    const leg = tripContext.legs[currentLeg - 1];
    if (!leg) return;
    if (leg.destination === tripContext.home_origin) return;
    setLoadingPois(true);
    try {
      const results = await api.suggestPOIs({
        trip_context: tripContext,
        leg_number: currentLeg,
        ...(excludeNames?.length ? { exclude_names: excludeNames } : {}),
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
  }, [tripContext, currentLeg]);

  const handleRefreshPOIs = useCallback(async () => {
    const excludeNames = pois.map((p) => p.name);
    setPois([]);
    autoFetched.current = false;
    await handleFetchPOIs(excludeNames.length ? excludeNames : undefined);
  }, [currentLeg, tripContext, pois, handleFetchPOIs]);

  function handleAddPOIToDay(poi: POI, dayNumber: number) {
    const newItem: DayItem = {
      type: "poi",
      name: poi.name,
      address: poi.address,
      lat: poi.lat,
      lng: poi.lng,
      duration_mins: poi.typical_visit_duration_mins,
      notes: poi.claude_note,
      photo_url: poi.photo_url,
      photo_urls: poi.photo_urls,
      rating: poi.rating,
      review_count: poi.review_count,
      price_level: poi.price_level,
      opening_hours: poi.opening_hours,
      indoor_outdoor: poi.indoor_outdoor,
      nearest_transit: poi.nearest_transit,
      neighborhood: poi.neighborhood,
      booking_required: poi.booking_required,
      theme_tags: poi.theme_tags,
      claude_best_time: poi.claude_best_time,
      claude_booking_tip: poi.claude_booking_tip,
      ai_reason: poi.ai_reason,
      busy_times: poi.busy_times,
    };
    setDays((prev) =>
      prev.map((d) =>
        d.day_number === dayNumber ? { ...d, items: [...d.items, newItem] } : d
      )
    );
    // Remove from saved/unscheduled if present, track as scheduled
    if (tripContext.unscheduled_pois.some((p) => p.id === poi.id)) {
      dispatch({ type: "REMOVE_UNSCHEDULED_POI", payload: { poi_id: poi.id } });
    }
    setScheduledPoiIds((prev) => { const next = new Set(prev); next.add(poi.id); return next; });
  }

  function handleSavePOI(poi: POI) {
    dispatch({ type: "ADD_UNSCHEDULED_POI", payload: poi });
    toast("Saved for later");
  }

  function handleRemoveSavedPOI(id: string) {
    dispatch({ type: "REMOVE_UNSCHEDULED_POI", payload: { poi_id: id } });
  }

  const addedIds = useMemo(() => new Set(Array.from(scheduledPoiIds)), [scheduledPoiIds]);

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

  // Sync local days to TripContext so autosave picks them up
  useEffect(() => {
    if (days.length > 0) {
      dispatch({ type: "SET_DAYS", payload: days });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  function handleDaysChange(newDays: DayPlan[]) {
    setDays(newDays);
  }

  if (tripContext.legs.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="font-body text-ink-muted">
          Your session was reset.{" "}
          <Link href="/trips" className="underline text-teal hover:text-teal-hover">
            Visit your trips page
          </Link>{" "}
          to restore a saved trip.
        </p>
      </div>
    );
  }

  const currentLegData = tripContext.legs[currentLeg - 1];
  const locationBias = (() => {
    const hotel = currentLegData?.hotel_stays[0]?.hotel;
    if (hotel?.lat && hotel?.lng) return { lat: hotel.lat, lng: hotel.lng };
    return undefined;
  })();

  const currentLegDays = days.filter((d) => d.leg_number === currentLeg);

  const suggestionsSidebar = (
    <SuggestionsSidebar
      pois={pois}
      addedIds={addedIds}
      onAddToDay={handleAddPOIToDay}
      onSave={handleSavePOI}
      loading={loadingPois}
      onRefresh={handleRefreshPOIs}
      refreshing={loadingPois}
      defaultCollapsed={false}
      savedHotels={tripContext.saved_hotels}
      onRestoreHotel={(id) => dispatch({ type: "RESTORE_HOTEL", payload: { saved_hotel_id: id } })}
      locationBias={locationBias}
      days={currentLegDays}
      savedPois={tripContext.unscheduled_pois}
      onRemoveSaved={handleRemoveSavedPOI}
      onOpenDetail={(poi) => {
        const isSaved = tripContext.unscheduled_pois.some((p) => p.id === poi.id);
        setDetailTarget({
          source: "sidebar",
          poi,
          days: currentLegDays,
          onAddToDay: (dayNumber) => handleAddPOIToDay(poi, dayNumber),
          onSave: !isSaved ? () => handleSavePOI(poi) : undefined,
          onRemove: isSaved ? () => handleRemoveSavedPOI(poi.id) : undefined,
        });
      }}
    />
  );

  const dayPlanner = (
    <DayPlanner
      days={days}
      onDaysChange={handleDaysChange}
      unscheduledPois={tripContext.unscheduled_pois}
      legs={tripContext.legs}
      currentLeg={currentLeg}
      onCurrentLegChange={(leg) => { setCurrentLeg(leg); setFocusedDays([]); }}
      focusedDays={focusedDays}
      onFocusedDaysChange={setFocusedDays}
      onSavePOI={(item: DayItem) => {
        const poi: POI = {
          id: item.id ?? `saved-${Date.now()}`,
          name: item.name,
          category: "attraction",
          address: item.address ?? "",
          lat: item.lat,
          lng: item.lng,
          booking_required: item.booking_required ?? false,
          claude_note: item.notes ?? "",
          theme_tags: item.theme_tags ?? [],
          ai_recommended: false,
          photo_url: item.photo_url,
          photo_urls: item.photo_urls,
          rating: item.rating,
          review_count: item.review_count,
          price_level: item.price_level,
          opening_hours: item.opening_hours,
          indoor_outdoor: item.indoor_outdoor,
          nearest_transit: item.nearest_transit,
          neighborhood: item.neighborhood,
          claude_best_time: item.claude_best_time,
          claude_booking_tip: item.claude_booking_tip,
          ai_reason: item.ai_reason,
          busy_times: item.busy_times,
          typical_visit_duration_mins: item.duration_mins,
        };
        dispatch({ type: "ADD_UNSCHEDULED_POI", payload: poi });
      }}
      onOpenDetail={(target) => setDetailTarget(target)}
    />
  );

  const selectedMapLocation = (() => {
    if (!detailTarget) return null;
    const lat = detailTarget.source === "day" ? detailTarget.item.lat : detailTarget.poi.lat;
    const lng = detailTarget.source === "day" ? detailTarget.item.lng : detailTarget.poi.lng;
    const name = detailTarget.source === "day" ? detailTarget.item.name : detailTarget.poi.name;
    if (!lat && !lng) return null;
    return { lat, lng, name };
  })();

  const tripMap = (
    <TripMap
      days={days}
      currentLeg={currentLeg}
      focusedDays={focusedDays}
      onFocusedDaysChange={setFocusedDays}
      selectedLatLng={selectedMapLocation}
    />
  );

  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  return (
    <APIProvider apiKey={mapsApiKey}>
    <div className="flex flex-col gap-4 h-[calc(100dvh-2.75rem)] md:h-screen overflow-hidden p-4">
      {/* Three-panel layout */}
      {isMobile ? (
        /* Mobile: tabbed layout — all three panels stay mounted, hidden via visibility */
        <div className="flex flex-col flex-1 min-h-0">
          {/* Tab bar */}
          <div className="flex gap-1 p-1 rounded-xl mb-3 shrink-0 bg-surface2 border border-border">
            {([
              { id: "suggest" as MobileTab, label: "Suggest", icon: <Lightbulb size={14} /> },
              { id: "plan" as MobileTab, label: "Plan", icon: <CalendarDays size={14} /> },
              { id: "map" as MobileTab, label: "Map", icon: <Map size={14} /> },
            ] as const).map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setMobileTab(id)}
                className={[
                  "flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg transition-colors font-body font-medium",
                  mobileTab === id ? "bg-teal text-surface" : "text-ink-muted hover:text-ink",
                ].join(" ")}
              >
                {icon}{label}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 relative">
            <div className={`absolute inset-0 overflow-y-auto ${mobileTab !== "suggest" ? "invisible" : ""}`}>
              {suggestionsSidebar}
            </div>
            <div className={`absolute inset-0 overflow-y-auto ${mobileTab !== "plan" ? "invisible" : ""}`}>
              {dayPlanner}
            </div>
            <div className={`absolute inset-0 ${mobileTab !== "map" ? "invisible" : ""}`}>
              {tripMap}
            </div>
          </div>
        </div>
      ) : (
        /* Desktop: sidebar + middle (day planner ± detail sheet) + map */
        <PanelGroup
          direction="horizontal"
          autoSaveId="itinerary-layout"
          className="flex-1 min-h-0 gap-2"
        >
          <Panel defaultSize={24} minSize={18} maxSize={40} collapsible>
            <div className="h-full overflow-y-auto">{suggestionsSidebar}</div>
          </Panel>
          <PanelResizeHandle
            className="w-1 rounded-full transition-colors cursor-col-resize bg-border2"
            onDragging={(isDragging) => { document.body.style.cursor = isDragging ? "col-resize" : ""; }}
          />
          <Panel minSize={30}>
            <div className="h-full relative overflow-hidden">
              <div className="h-full">{dayPlanner}</div>
              <BottomSheet open={!!detailTarget} onClose={() => setDetailTarget(null)}>
                {detailTarget && <LocationDetailSheet target={detailTarget} onClose={() => setDetailTarget(null)} />}
              </BottomSheet>
            </div>
          </Panel>
          <PanelResizeHandle
            className="w-1 rounded-full transition-colors cursor-col-resize bg-border2"
            onDragging={(isDragging) => { document.body.style.cursor = isDragging ? "col-resize" : ""; }}
          />
          <Panel defaultSize={30} minSize={20} maxSize={45}>
            <div className="h-full">{tripMap}</div>
          </Panel>
        </PanelGroup>
      )}

      {/* Bottom actions */}
      <div className="flex justify-between pt-2 border-t border-border shrink-0">
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
    </APIProvider>
  );
}
