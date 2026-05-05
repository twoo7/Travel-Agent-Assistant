"use client";

import { useState, useMemo } from "react";
import type { POI, POICategory, SavedHotel, DayPlan } from "@/types/trip";
import { PlacesSearch } from "./PlacesSearch";
import { LocationCard } from "./LocationCard";
import {
  Sparkles, ChevronRight, RefreshCw,
  Search, ChevronDown, ChevronUp, Hotel, Bookmark,
} from "lucide-react";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { motion } from "framer-motion";

interface Props {
  pois: POI[];
  addedIds: Set<string>;
  onAddToDay: (poi: POI, dayNumber: number) => void;
  onSave: (poi: POI) => void;
  loading: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  defaultCollapsed?: boolean;
  savedHotels?: SavedHotel[];
  onRestoreHotel?: (id: string) => void;
  locationBias?: { lat: number; lng: number };
  days: DayPlan[];
  savedPois?: POI[];
  onRemoveSaved?: (id: string) => void;
  onOpenDetail?: (poi: POI) => void;
}

type SidebarTab = "picks" | "search" | "saved";

const CATEGORY_CHIPS: Array<{ label: string; value: POICategory | "all" }> = [
  { label: "All", value: "all" },
  { label: "Activities", value: "activity" },
  { label: "Restaurants", value: "restaurant" },
  { label: "Sightseeing", value: "sightseeing" },
  { label: "Attractions", value: "attraction" },
];


export function SuggestionsSidebar({
  pois, addedIds, onAddToDay, onSave, loading, onRefresh, refreshing,
  defaultCollapsed = false, savedHotels = [], onRestoreHotel, locationBias,
  days, savedPois = [], onRemoveSaved, onOpenDetail,
}: Props) {
  const [tab, setTab] = useState<SidebarTab>("picks");
  const [categoryFilter, setCategoryFilter] = useState<POICategory | "all">("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [hotelsExpanded, setHotelsExpanded] = useState(false);

  const savedIds = useMemo(() => new Set(savedPois.map((p) => p.id)), [savedPois]);

  const availableTags = useMemo(() =>
    Array.from(new Set(pois.flatMap((p) => p.theme_tags ?? []))).sort(),
    [pois]
  );

  const filtered = useMemo(() => pois.filter((p) => {
    if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
    if (tagFilter && !(p.theme_tags ?? []).includes(tagFilter)) return false;
    return true;
  }), [pois, categoryFilter, tagFilter]);

  const grouped = useMemo(() => {
    const result: Array<{ neighborhood: string | null; pois: POI[] }> = [];
    const neighborhoodMap = new Map<string, POI[]>();
    for (const poi of filtered) {
      const key = poi.neighborhood ?? "__none__";
      if (!neighborhoodMap.has(key)) neighborhoodMap.set(key, []);
      neighborhoodMap.get(key)!.push(poi);
    }
    neighborhoodMap.forEach((group, key) => {
      result.push({ neighborhood: key === "__none__" ? null : key, pois: group });
    });
    return result;
  }, [filtered]);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="w-10 shrink-0 rounded-xl flex items-center justify-center self-start py-3 transition-colors bg-surface border border-border text-ink-muted hover:border-teal/40"
        aria-label="Open suggestions"
      >
        <ChevronRight size={16} />
      </button>
    );
  }

  const tabs: Array<{ id: SidebarTab; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: "picks", label: "AI Picks", icon: <Sparkles size={11} /> },
    { id: "search", label: "Search", icon: <Search size={11} /> },
    { id: "saved", label: "Saved", icon: <Bookmark size={11} />, badge: savedPois.length || undefined },
  ];

  return (
    <div className="w-full flex flex-col h-full overflow-hidden rounded-xl bg-surface border border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="font-semibold text-sm flex items-center gap-1.5 font-body text-teal">
          <Sparkles size={14} className={loading ? "animate-pulse" : undefined} />
          Locations
        </h2>
        <div className="flex items-center gap-1">
          {tab === "picks" && onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              title="Refresh suggestions"
              className="p-1 rounded-md transition-colors text-ink-subtle hover:text-ink"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            </button>
          )}
          <button
            onClick={() => setCollapsed(true)}
            className="transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface2 text-ink-subtle"
            aria-label="Collapse sidebar"
          >
            <ChevronRight size={14} className="rotate-180" />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border">
        {tabs.map(({ id, label, icon, badge }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 py-2 text-xs font-semibold font-body flex items-center justify-center gap-1 transition-colors relative border-b-2 ${
              tab === id ? "text-teal border-teal" : "text-ink-muted border-transparent"
            }`}
          >
            {icon}{label}
            {badge != null && badge > 0 && (
              <span className="ml-0.5 text-[9px] px-1 py-0 rounded-full font-medium bg-teal text-surface">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search tab */}
      {tab === "search" && (
        <div className="flex-1 overflow-y-auto p-3">
          <p className="text-xs font-body mb-3 text-ink-muted">
            Search any place and add it to your itinerary.
          </p>
          <PlacesSearch
            onAddToDay={onAddToDay}
            onSave={onSave}
            locationBias={locationBias}
            days={days}
            savedIds={savedIds}
            onRemoveSaved={onRemoveSaved}
          />
        </div>
      )}

      {/* Saved tab */}
      {tab === "saved" && (
        <div className="flex-1 overflow-y-auto">
          {savedPois.length === 0 ? (
            <div className="text-center py-10 text-sm font-body px-4 text-ink-muted">
              <Bookmark size={20} className="mx-auto mb-2 opacity-40" />
              No saved places yet.
              <p className="text-xs mt-1 opacity-60">Save places from AI Picks or Search to plan later.</p>
            </div>
          ) : (
            <div className="space-y-2 p-3">
              {savedPois.map((poi) => (
                <LocationCard
                  key={poi.id}
                  id={poi.id}
                  name={poi.name}
                  address={poi.address}
                  category={poi.category}
                  rating={poi.rating}
                  photoUrl={poi.photo_url}
                  onAddToDay={(dayNumber) => onAddToDay(poi, dayNumber)}
                  onRemove={() => onRemoveSaved?.(poi.id)}
                  onOpenDetail={onOpenDetail ? () => onOpenDetail(poi) : undefined}
                  days={days}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Picks tab */}
      {tab === "picks" && (
        <>
          {/* Category chips */}
          <div className={`flex flex-wrap gap-1.5 px-3 py-2 ${availableTags.length > 0 ? "border-b border-border" : ""}`}>
            {CATEGORY_CHIPS.map(({ label, value }) => (
              <motion.button
                key={value}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCategoryFilter(value)}
                className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap transition-colors font-body ${
                  categoryFilter === value
                    ? "bg-teal text-surface"
                    : "bg-surface2 text-ink-muted border border-border"
                }`}
              >
                {label}
              </motion.button>
            ))}
          </div>

          {/* Theme-tag secondary filter */}
          {availableTags.length > 0 && (
            <div className="flex flex-wrap gap-1 px-3 py-1.5 border-b border-border">
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                  className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap font-body transition-colors ${
                    tagFilter === tag
                      ? "bg-teal-mid text-surface"
                      : "bg-surface2 text-ink-subtle border border-border"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

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
              <div className="text-center py-10 text-sm font-body text-ink-muted">
                No suggestions yet.
              </div>
            )}

            {!loading && grouped.map(({ neighborhood, pois: group }, gi) => (
              <div key={gi}>
                {neighborhood && (
                  <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest font-body text-ink-subtle">
                    {neighborhood}
                  </p>
                )}
                {group.map((poi) => {
                  const poiSaved = savedIds.has(poi.id);
                  return (
                    <div key={poi.id} className="mx-2 my-1.5">
                      <LocationCard
                        id={poi.id}
                        name={poi.name}
                        address={poi.address}
                        category={poi.category}
                        rating={poi.rating}
                        priceLevel={poi.price_level}
                        photoUrl={poi.photo_url}
                        isAdded={addedIds.has(poi.id)}
                        isSaved={poiSaved}
                        recommended={poi.ai_recommended}
                        aiNote={poi.claude_note}
                        bestTime={poi.claude_best_time}
                        bookingRequired={poi.booking_required}
                        busyTimes={poi.busy_times}
                        onAddToDay={(dayNumber) => onAddToDay(poi, dayNumber)}
                        onSave={poiSaved ? undefined : () => onSave(poi)}
                        onRemove={poiSaved ? () => onRemoveSaved?.(poi.id) : undefined}
                        onOpenDetail={onOpenDetail ? () => onOpenDetail(poi) : undefined}
                        days={days}
                      />
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Removed hotels section */}
            {savedHotels.length > 0 && (
              <div className="mx-2 my-3 rounded-lg overflow-hidden border border-border">
                <button
                  onClick={() => setHotelsExpanded((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold font-body transition-colors hover:bg-surface2 bg-surface2 text-ink-subtle"
                >
                  <span className="flex items-center gap-1.5">
                    <Hotel size={11} />
                    Removed hotels ({savedHotels.length})
                  </span>
                  {hotelsExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>
                {hotelsExpanded && (
                  <div className="divide-y divide-border border-t border-border">
                    {savedHotels.map((sh) => (
                      <div key={sh.id} className="flex items-center justify-between px-3 py-2 gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate font-body text-ink">
                            {sh.item.name}
                          </p>
                          <p className="text-[10px] font-body text-ink-muted">
                            Day {sh.day_number}
                          </p>
                        </div>
                        <button
                          onClick={() => onRestoreHotel?.(sh.id)}
                          className="text-[10px] px-2 py-0.5 rounded font-body shrink-0 bg-teal-light text-teal border border-teal/30"
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
