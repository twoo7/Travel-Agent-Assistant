"use client";

import { useState } from "react";
import type { POI } from "@/types/trip";
import { BusyTimesBar } from "./BusyTimesBar";
import { Sparkles, ChevronRight, Check, Clock, Ticket, Plus } from "lucide-react";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

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
        className="w-10 bg-white border border-gray-100 shadow-card rounded-xl flex items-center justify-center text-muted hover:text-primary self-start py-3 transition-colors"
        aria-label="Open suggestions"
      >
        <ChevronRight size={16} />
      </button>
    );
  }

  return (
    <div className="w-72 shrink-0 bg-white border border-gray-100 rounded-xl shadow-card flex flex-col h-full max-h-[calc(100vh-140px)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div>
          <h2 className="font-semibold text-charcoal text-sm flex items-center gap-1.5 font-body">
            <Sparkles size={14} className="text-accent" />
            AI Suggestions
          </h2>
          <p className="text-xs text-muted font-body">{pois.length} places</p>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="text-subtle hover:text-muted transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100"
          aria-label="Collapse sidebar"
        >
          <ChevronRight size={14} className="rotate-180" />
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b border-gray-100">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap transition-colors font-body ${
              filter === cat
                ? "bg-primary text-white"
                : "bg-gray-100 text-charcoal/70 hover:bg-gray-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* POI list */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
        {loading && (
          <div className="p-3 space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-20 w-full rounded-lg" />
                <SkeletonText lines={2} />
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-10 text-sm text-muted font-body">
            No suggestions yet.
          </div>
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
                  <p className="text-sm font-semibold text-charcoal truncate font-body">{poi.name}</p>
                  <p className="text-xs text-muted font-body">{poi.category}</p>
                </div>
                <div className="text-right shrink-0">
                  {poi.rating && (
                    <p className="text-xs text-warning-dark font-body">★ {poi.rating.toFixed(1)}</p>
                  )}
                  {poi.price_level != null && (
                    <p className="text-xs text-muted font-body">{PRICE_LABELS[poi.price_level]}</p>
                  )}
                </div>
              </div>

              {poi.claude_note && (
                <p className="text-xs text-accent italic mt-1.5 font-body">{poi.claude_note}</p>
              )}
              {poi.claude_best_time && (
                <p className="text-xs text-muted mt-0.5 flex items-center gap-1 font-body">
                  <Clock size={10} />
                  {poi.claude_best_time}
                </p>
              )}
              {poi.booking_required && (
                <p className="text-xs text-warning-dark mt-0.5 flex items-center gap-1 font-body">
                  <Ticket size={10} />
                  Booking required
                </p>
              )}

              <BusyTimesBar busyTimes={poi.busy_times} />

              <button
                onClick={() => !isAdded && onAdd(poi)}
                disabled={isAdded}
                className={`mt-2 w-full text-xs font-medium py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 font-body ${
                  isAdded
                    ? "bg-gray-100 text-subtle cursor-default"
                    : "bg-primary hover:bg-primary-dark text-white"
                }`}
              >
                {isAdded ? (
                  <>
                    <Check size={11} />
                    Added
                  </>
                ) : (
                  <>
                    <Plus size={11} />
                    Add to itinerary
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
