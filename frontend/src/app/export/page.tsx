"use client";

import { useRouter } from "next/navigation";
import { useTripContext } from "@/context/TripContext";
import { ItinerarySummary } from "@/components/export/ItinerarySummary";
import { ExportButtons } from "@/components/export/ExportButtons";

export default function ExportPage() {
  const router = useRouter();
  const { state } = useTripContext();
  const { tripContext, itinerary } = state;

  if (tripContext.legs.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="text-gray-500">No trip to export yet.</p>
        <button onClick={() => router.push("/")} className="mt-4 text-blue-600 hover:underline">
          ← Start planning
        </button>
      </div>
    );
  }

  const exportRequest = {
    trip_context: tripContext,
    itinerary: itinerary.length > 0 ? itinerary : [],
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Trip Plan</h1>
          <p className="text-gray-500 text-sm mt-1">Review your itinerary and download.</p>
        </div>
        <button
          onClick={() => router.push("/itinerary")}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          ← Edit Itinerary
        </button>
      </div>

      {/* Export buttons at the top and bottom for convenience */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Export Your Plan</h2>
        <ExportButtons exportRequest={exportRequest} />
      </div>

      <ItinerarySummary tripContext={tripContext} itinerary={itinerary} />

      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <ExportButtons exportRequest={exportRequest} />
      </div>

      <div className="flex justify-between pt-2">
        <button
          onClick={() => {
            router.push("/");
          }}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          ← Plan another trip
        </button>
      </div>
    </div>
  );
}
