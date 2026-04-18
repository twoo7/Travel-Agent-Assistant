"use client";

import { useRouter } from "next/navigation";
import { useTripContext } from "@/context/TripContext";
import { ItinerarySummary } from "@/components/export/ItinerarySummary";
import { ExportButtons } from "@/components/export/ExportButtons";
import { Button } from "@/components/ui/Button";
import type { TransportSegment } from "@/types/trip";
import { ArrowLeft, RefreshCw } from "lucide-react";

export default function ExportPage() {
  const router = useRouter();
  const { state } = useTripContext();
  const { tripContext, itinerary } = state;

  if (tripContext.legs.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="font-body" style={{ color: "var(--text-muted)" }}>
          Your session was reset — progress is not saved across page refreshes.
        </p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 font-body text-sm underline underline-offset-2"
          style={{ color: "var(--accent)" }}
        >
          ← Go back to Trip Setup to start planning
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
    <div className="max-w-2xl mx-auto py-10 px-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[2.5px] mb-1 font-body" style={{ color: "var(--text-eyebrow)" }}>
              Step 5 of 5
            </p>
            <h1 className="font-display text-4xl" style={{ color: "var(--text-primary)" }}>
              Your Trip Summary
            </h1>
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

        <div className="space-y-8">
          {/* Export buttons at top */}
          <div
            className="rounded-xl p-5"
            style={{
              background: "var(--glass-2)",
              border: "1px solid var(--glass-border-2)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
            }}
          >
            <h2 className="font-semibold mb-3 font-body text-sm" style={{ color: "var(--text-primary)" }}>Export Your Plan</h2>
            <ExportButtons exportRequest={exportRequest} />
          </div>

          <ItinerarySummary tripContext={tripContext} itinerary={itinerary} />

          {/* Export buttons at bottom */}
          <div
            className="rounded-xl p-5"
            style={{
              background: "var(--glass-2)",
              border: "1px solid var(--glass-border-2)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
            }}
          >
            <ExportButtons exportRequest={exportRequest} />
          </div>

          <div className="pb-6" />
        </div>
      </div>
  );
}
