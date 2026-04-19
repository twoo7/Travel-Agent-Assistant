"use client";

import { useState } from "react";
import type { POI } from "@/types/trip";
import { BusyTimesBar } from "./BusyTimesBar";
import { Sparkles, ChevronRight, Check, Clock, Ticket, Plus, RefreshCw } from "lucide-react";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { motion } from "framer-motion";

interface Props {
  pois: POI[];
  addedIds: Set<string>;
  onAdd: (poi: POI) => void;
  loading: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  defaultCollapsed?: boolean;
}

const CATEGORIES = ["All", "Landmark", "Museum", "Restaurant", "Park", "Neighborhood"];

const PRICE_LABELS: Record<number, string> = { 0: "Free", 1: "$", 2: "$$", 3: "$$$", 4: "$$$$" };

export function SuggestionsSidebar({ pois, addedIds, onAdd, loading, onRefresh, refreshing, defaultCollapsed = false }: Props) {
  const [filter, setFilter] = useState("All");
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const filtered = pois.filter(
    (p) => filter === "All" || p.category.toLowerCase() === filter.toLowerCase()
  );

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="w-10 shrink-0 rounded-xl flex items-center justify-center self-start py-3 transition-colors"
        style={{ background: "var(--sidebar-bg)", backdropFilter: "blur(16px)", border: "1px solid var(--glass-border-1)", color: "var(--text-muted)" }}
        aria-label="Open suggestions"
      >
        <ChevronRight size={16} />
      </button>
    );
  }

  return (
    <div
      className="w-72 shrink-0 rounded-xl flex flex-col h-full max-h-[calc(100vh-140px)] overflow-hidden"
      style={{ background: "var(--sidebar-bg)", backdropFilter: "blur(16px)", border: "1px solid var(--glass-border-1)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--glass-border-1)" }}>
        <div>
          <h2 className="font-semibold text-sm flex items-center gap-1.5 font-body" style={{ color: "var(--text-primary)" }}>
            <Sparkles size={14} className={loading ? "animate-ai-pulse" : undefined} style={{ color: "var(--accent)" }} />
            <span style={{ color: "var(--accent)" }}>✦ AI Picks</span>
          </h2>
          <p className="text-xs font-body" style={{ color: "var(--text-muted)" }}>{pois.length} places</p>
        </div>
        <div className="flex items-center gap-1">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              title="Refresh suggestions"
              className="p-1 rounded-md transition-colors"
              style={{ color: "var(--text-subtle)" }}
            >
              <RefreshCw
                size={13}
                className={refreshing ? "animate-spin" : ""}
              />
            </button>
          )}
          <button
            onClick={() => setCollapsed(true)}
            className="transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--glass-1)]"
            style={{ color: "var(--text-subtle)" }}
            aria-label="Collapse sidebar"
          >
            <ChevronRight size={14} className="rotate-180" />
          </button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5 px-3 py-2" style={{ borderBottom: "1px solid var(--glass-border-1)" }}>
        {CATEGORIES.map((cat) => (
          <motion.button
            key={cat}
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilter(cat)}
            className="text-xs px-2.5 py-1 rounded-full whitespace-nowrap transition-colors font-body"
            style={filter === cat
              ? { background: "var(--accent)", color: "white", border: "none" }
              : { background: "var(--glass-1)", color: "var(--text-muted)", border: "1px solid var(--glass-border-1)" }
            }
          >
            {cat}
          </motion.button>
        ))}
      </div>

      {/* POI list */}
      <div className="flex-1 overflow-y-auto">
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
          <div className="text-center py-10 text-sm font-body" style={{ color: "var(--text-muted)" }}>
            No suggestions yet.
          </div>
        )}

        {filtered.map((poi) => {
          const isAdded = addedIds.has(poi.id);
          return (
            <div key={poi.id} className={`px-3 py-3 mx-2 my-1.5 rounded-lg ${isAdded ? "opacity-50" : ""}`} style={{ background: "var(--glass-2)", border: "1px solid var(--glass-border-2)", ...(poi.ai_recommended ? { borderLeft: "2px solid var(--accent)" } : {}) }}>
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
                  <p className="text-sm font-semibold truncate font-body" style={{ color: "var(--text-primary)" }}>{poi.name}</p>
                  <p className="text-xs font-body" style={{ color: "var(--text-muted)" }}>{poi.category}</p>
                </div>
                <div className="text-right shrink-0">
                  {poi.rating && (
                    <p className="text-xs font-body" style={{ color: "var(--warning)" }}>★ {poi.rating.toFixed(1)}</p>
                  )}
                  {poi.price_level != null && (
                    <p className="text-xs font-body" style={{ color: "var(--text-muted)" }}>{PRICE_LABELS[poi.price_level]}</p>
                  )}
                </div>
              </div>

              {poi.claude_note && (
                <p className="text-xs italic mt-1.5 font-body" style={{ color: "var(--accent)" }}>{poi.claude_note}</p>
              )}
              {poi.claude_best_time && (
                <p className="text-xs mt-0.5 flex items-center gap-1 font-body" style={{ color: "var(--text-muted)" }}>
                  <Clock size={10} />
                  {poi.claude_best_time}
                </p>
              )}
              {poi.booking_required && (
                <p className="text-xs mt-0.5 flex items-center gap-1 font-body" style={{ color: "var(--warning)" }}>
                  <Ticket size={10} />
                  Booking required
                </p>
              )}

              <BusyTimesBar busyTimes={poi.busy_times} />

              <button
                onClick={() => !isAdded && onAdd(poi)}
                disabled={isAdded}
                className="mt-2 w-full text-xs font-medium py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 font-body"
                style={isAdded
                  ? { background: "var(--glass-1)", color: "var(--text-subtle)", cursor: "default" }
                  : { background: "var(--accent)", color: "white" }
                }
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
