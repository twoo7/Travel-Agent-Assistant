"use client";

import { useState } from "react";
import type { POI } from "@/types/trip";
import { BusyTimesBar } from "./BusyTimesBar";

interface Props {
  pois: POI[];
  addedIds: Set<string>;
  onAdd: (poi: POI) => void;
  loading: boolean;
}

const CATEGORIES = ["All", "Landmark", "Museum", "Restaurant", "Park", "Neighborhood"];

const PRICE_LABELS: Record<number, string> = { 0: "Free", 1: "$", 2: "$$", 3: "$$$", 4: "$$$$" };

export function SuggestionsSidebar({ pois, addedIds, onAdd, loading }: Props) {
  const [filter, setFilter] = useState("All");
  const [collapsed, setCollapsed] = useState(false);

  const filtered = pois.filter(
    (p) => filter === "All" || p.category.toLowerCase() === filter.toLowerCase()
  );

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="w-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-400 hover:text-blue-600 self-start py-3"
        aria-label="Open suggestions"
      >
        ›
      </button>
    );
  }

  return (
    <div className="w-72 shrink-0 bg-white border border-gray-200 rounded-xl flex flex-col h-full max-h-[calc(100vh-140px)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div>
          <h2 className="font-semibold text-gray-900 text-sm">✨ AI Suggestions</h2>
          <p className="text-xs text-gray-400">{pois.length} places</p>
        </div>
        <button onClick={() => setCollapsed(true)} className="text-gray-300 hover:text-gray-500 text-lg">
          ‹
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 px-3 py-2 overflow-x-auto border-b border-gray-100">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`text-xs px-2 py-1 rounded-full whitespace-nowrap transition-colors ${
              filter === cat
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
        {loading && (
          <div className="text-center py-8 text-sm text-gray-400">
            <div className="animate-pulse">Generating suggestions…</div>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-8 text-sm text-gray-400">No suggestions yet.</div>
        )}

        {filtered.map((poi) => {
          const isAdded = addedIds.has(poi.id);
          return (
            <div key={poi.id} className={`px-3 py-3 ${isAdded ? "opacity-50" : ""}`}>
              {poi.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={poi.photo_url}
                  alt={poi.name}
                  className="w-full h-24 object-cover rounded-lg mb-2"
                />
              )}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{poi.name}</p>
                  <p className="text-xs text-gray-400">{poi.category}</p>
                </div>
                <div className="text-right shrink-0">
                  {poi.rating && (
                    <p className="text-xs text-amber-500">★ {poi.rating.toFixed(1)}</p>
                  )}
                  {poi.price_level != null && (
                    <p className="text-xs text-gray-400">{PRICE_LABELS[poi.price_level]}</p>
                  )}
                </div>
              </div>

              {poi.claude_note && (
                <p className="text-xs text-blue-600 italic mt-1">{poi.claude_note}</p>
              )}
              {poi.claude_best_time && (
                <p className="text-xs text-gray-400 mt-0.5">🕐 {poi.claude_best_time}</p>
              )}
              {poi.booking_required && (
                <p className="text-xs text-amber-600 mt-0.5">🎟 Booking required</p>
              )}

              <BusyTimesBar busyTimes={poi.busy_times} />

              <button
                onClick={() => !isAdded && onAdd(poi)}
                disabled={isAdded}
                className={`mt-2 w-full text-xs font-medium py-1.5 rounded-lg transition-colors ${
                  isAdded
                    ? "bg-gray-100 text-gray-400 cursor-default"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {isAdded ? "Added ✓" : "+ Add to itinerary"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
