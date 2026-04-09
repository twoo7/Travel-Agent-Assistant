"use client";

import { useRouter } from "next/navigation";
import { useTripContext } from "@/context/TripContext";
import { ItinerarySummary } from "@/components/export/ItinerarySummary";
import { ExportButtons } from "@/components/export/ExportButtons";
import { Button } from "@/components/ui/Button";
import { PageTransition } from "@/components/ui/PageTransition";
import type { TransportSegment } from "@/types/trip";
import { ArrowLeft, RefreshCw } from "lucide-react";

export default function ExportPage() {
  const router = useRouter();
  const { state } = useTripContext();
  const { tripContext, itinerary } = state;

  if (tripContext.legs.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="text-muted font-body">No trip to export yet.</p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 text-primary hover:text-primary-dark font-body text-sm underline underline-offset-2"
        >
          ← Start planning
        </button>
      </div>
    );
  }

  // Build transport segments from legs
  const transportSegments: TransportSegment[] = tripContext.legs.map((leg) => ({
    leg_number: leg.leg_number,
    mode: leg.transport_mode ?? "flight",
    origin: leg.origin,
    destination: leg.destination,
    departure_date: leg.departure_date,
    booking_ref: leg.selected_flight
      ? `${leg.selected_flight.segments[0]?.carrier_code}${leg.selected_flight.segments[0]?.flight_number}`
      : undefined,
    notes:
      leg.transport_mode === "ferry"
        ? "Book via ferry operator website"
        : leg.transport_mode === "train"
        ? "Book via Trainline, Eurail, or national rail"
        : leg.transport_mode === "car"
        ? "Self-drive or hire car"
        : undefined,
  }));

  const exportRequest = {
    trip_context: tripContext,
    itinerary: itinerary.length > 0 ? itinerary : [],
    transport_segments: transportSegments,
  };

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary font-display">Your Trip Plan</h1>
            <p className="text-muted text-sm mt-0.5 font-body">Review your itinerary and download.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push("/")}
              icon={<RefreshCw size={14} />}
            >
              Plan another trip
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/itinerary")}
              icon={<ArrowLeft size={14} />}
            >
              Edit Itinerary
            </Button>
          </div>
        </div>

        {/* Export buttons at top */}
        <div className="bg-white border border-gray-100 shadow-card rounded-xl p-5">
          <h2 className="font-semibold text-charcoal mb-3 font-body text-sm">Export Your Plan</h2>
          <ExportButtons exportRequest={exportRequest} />
        </div>

        <ItinerarySummary tripContext={tripContext} itinerary={itinerary} />

        {/* Export buttons at bottom */}
        <div className="bg-white border border-gray-100 shadow-card rounded-xl p-5">
          <ExportButtons exportRequest={exportRequest} />
        </div>

        <div className="pb-6" />
      </div>
    </PageTransition>
  );
}
