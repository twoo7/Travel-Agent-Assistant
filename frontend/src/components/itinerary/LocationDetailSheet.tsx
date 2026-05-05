"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion"; // motion used for DayPicker popover
import {
  MapPin, Clock, X, ExternalLink, Bookmark, ArrowRight,
  Trash2, Plus, ChevronDown, ChevronLeft, ChevronRight,
  Sun, CloudSun, Building2, Lightbulb, Sparkles, Star,
} from "lucide-react";
import type { DayItem, DayPlan, POI } from "@/types/trip";
import { DayPicker } from "./DayPicker";
import { BusyTimesBar } from "./BusyTimesBar";

export type DetailTarget =
  | {
      source: "day";
      dayNumber: number;
      item: DayItem;
      days: DayPlan[];
      onRemove: () => void;
      onMoveToDay: (toDay: number) => void;
      onMoveToSaved: () => void;
    }
  | {
      source: "sidebar";
      poi: POI;
      days: DayPlan[];
      onAddToDay: (dayNumber: number) => void;
      onSave?: () => void;
      onRemove?: () => void;
    };

interface Props {
  target: DetailTarget;
  onClose: () => void;
}

const PRICE_LABELS: Record<number, string> = { 0: "Free", 1: "$", 2: "$$", 3: "$$$", 4: "$$$$" };

const CATEGORY_HERO: Record<string, { bg: string; label: string }> = {
  restaurant:  { bg: "linear-gradient(135deg, #3d1a0a 0%, #7a2e12 100%)", label: "Restaurant" },
  activity:    { bg: "linear-gradient(135deg, #0a2018 0%, #1a5232 100%)", label: "Activity" },
  sightseeing: { bg: "linear-gradient(135deg, #0a1228 0%, #1a2a5e 100%)", label: "Sightseeing" },
  attraction:  { bg: "linear-gradient(135deg, #1e1406 0%, #5c400e 100%)", label: "Attraction" },
  hotel:       { bg: "linear-gradient(135deg, #0a1628 0%, #162840 100%)", label: "Hotel" },
  airport:     { bg: "linear-gradient(135deg, #0c0c1e 0%, #1e1e40 100%)", label: "Airport" },
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT_DAYS: Record<string, string> = {
  Sunday: "Sun", Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed",
  Thursday: "Thu", Friday: "Fri", Saturday: "Sat",
};

function parseHoursRows(hours: string): Array<{ day: string; time: string }> {
  return hours
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((line) => {
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) return { day: line, time: "" };
      return { day: line.slice(0, colonIdx).trim(), time: line.slice(colonIdx + 1).trim() };
    });
}

function parseTimeMins(t: string): number | null {
  const match = t.trim().match(/(\d+):?(\d*)\s*(AM|PM)/i);
  if (!match) return null;
  let h = parseInt(match[1]);
  const m = match[2] ? parseInt(match[2]) : 0;
  const period = match[3].toUpperCase();
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

function isOpenNow(hoursStr: string): boolean | null {
  const todayName = DAY_NAMES[new Date().getDay()];
  const rows = parseHoursRows(hoursStr);
  const todayRow = rows.find(
    (r) => r.day === todayName || r.day.startsWith(todayName.slice(0, 3))
  );
  if (!todayRow) return null;
  if (!todayRow.time || todayRow.time.toLowerCase() === "closed") return false;
  const parts = todayRow.time.split(/[–—\-]/);
  if (parts.length < 2) return null;
  const open = parseTimeMins(parts[0]);
  const close = parseTimeMins(parts[1]);
  if (open == null || close == null) return null;
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  return cur >= open && cur <= close;
}

function googleMapsUrl(name: string, lat?: number, lng?: number): string {
  if (lat != null && lng != null && !(lat === 0 && lng === 0)) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;
}

export function LocationDetailSheet({ target, onClose }: Props) {
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [hoursExpanded, setHoursExpanded] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => { setShowDayPicker(false); setPhotoIndex(0); setHoursExpanded(false); }, [target]);

  const isDay     = target.source === "day";
  const isSidebar = target.source === "sidebar";

  const name           = isDay ? target.item.name : target.poi.name;
  const address        = isDay ? target.item.address : target.poi.address;
  const photoUrl       = isDay ? target.item.photo_url : target.poi.photo_url;
  const rawPhotoUrls   = isDay ? target.item.photo_urls : target.poi.photo_urls;
  const photoUrls      = rawPhotoUrls?.length ? rawPhotoUrls : (photoUrl ? [photoUrl] : []);
  const rating         = isDay ? target.item.rating : target.poi.rating;
  const reviewCount    = isDay ? target.item.review_count : target.poi.review_count;
  const priceLevel     = isDay ? target.item.price_level : target.poi.price_level;
  const category       = isSidebar ? target.poi.category : (isDay ? target.item.type : undefined);
  const notes          = isDay ? target.item.notes : (target.poi.claude_note || undefined);
  const bestTime       = isDay ? target.item.claude_best_time : target.poi.claude_best_time;
  const bookingRequired = isDay ? (target.item.booking_required ?? false) : target.poi.booking_required;
  const bookingTip     = isDay ? target.item.claude_booking_tip : target.poi.claude_booking_tip;
  const openingHours   = isDay ? target.item.opening_hours : target.poi.opening_hours;
  const indoorOutdoor  = isDay ? target.item.indoor_outdoor : target.poi.indoor_outdoor;
  const nearestTransit = isDay ? target.item.nearest_transit : target.poi.nearest_transit;
  const neighborhood   = isDay ? target.item.neighborhood : target.poi.neighborhood;
  const themeTags      = isDay ? (target.item.theme_tags ?? []) : (target.poi.theme_tags ?? []);
  const aiReason       = isDay ? target.item.ai_reason : target.poi.ai_reason;
  const aiRecommended  = isSidebar ? target.poi.ai_recommended : false;
  const busyTimes      = isDay ? target.item.busy_times : target.poi.busy_times;
  const lat            = isDay ? target.item.lat : target.poi.lat;
  const lng            = isDay ? target.item.lng : target.poi.lng;
  const isPoi          = isDay && target.item.type === "poi";
  const isAirport      = isDay && target.item.type === "airport";

  const prevPhoto = useCallback(() => setPhotoIndex((i) => (i - 1 + photoUrls.length) % photoUrls.length), [photoUrls.length]);
  const nextPhoto = useCallback(() => setPhotoIndex((i) => (i + 1) % photoUrls.length), [photoUrls.length]);

  const dayLabel  = isDay ? `Day ${target.dayNumber}` : null;
  const otherDays = isDay ? target.days.filter((d) => d.day_number !== target.dayNumber) : target.days;
  const mapsUrl   = googleMapsUrl(name, lat, lng);
  const heroMeta  = CATEGORY_HERO[category ?? "attraction"] ?? CATEGORY_HERO.attraction;

  const openStatus = openingHours ? isOpenNow(openingHours) : null;
  const hoursRows  = openingHours ? parseHoursRows(openingHours) : [];
  const todayName  = DAY_NAMES[new Date().getDay()];
  const todayRow   = hoursRows.find((r) => r.day === todayName || r.day.startsWith(todayName.slice(0, 3)));
  const otherRows  = hoursRows.filter((r) => r !== todayRow);

  const hasMetaGrid = priceLevel != null || bestTime || address || indoorOutdoor || bookingRequired;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-surface">

      {/* ── Peek area: name + close + action bar (always visible) ── */}
      <div className="shrink-0 px-4 pt-3 pb-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-[20px] font-medium leading-tight text-ink truncate">
              {name}
            </h2>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {rating != null && (
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} size={10} fill={s <= Math.round(rating) ? "#f59e0b" : "transparent"} color="#f59e0b" />
                    ))}
                  </div>
                  <span className="text-[11px] font-body text-ink-subtle">
                    {rating.toFixed(1)}{reviewCount != null ? ` (${reviewCount.toLocaleString()})` : ""}
                  </span>
                </div>
              )}
              {dayLabel && (
                <span className="text-[9px] font-bold uppercase tracking-[1.5px] px-2 py-0.5 rounded-full font-body bg-teal text-surface">
                  {dayLabel}
                </span>
              )}
              {category && (
                <span className="text-[9px] font-bold uppercase tracking-[1.5px] px-2 py-0.5 rounded-full font-body bg-surface2 text-ink-muted">
                  {heroMeta.label}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface2 transition-colors text-ink-subtle" aria-label="Close">
            <X size={13} />
          </button>
        </div>
      </div>

      {/* ── Action bar (always visible in peek) ─────────────────── */}
      {!isAirport && (
        <div className="shrink-0 px-4 pt-2.5 pb-3 space-y-2">
          {isSidebar && (
            <div className="relative">
              <button
                onClick={() => setShowDayPicker((v) => !v)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold font-body transition-all bg-teal text-surface hover:bg-teal-hover active:scale-[0.98]"
              >
                <Plus size={13} />
                Add to day
                <ChevronDown size={10} style={{ opacity: 0.75, transition: "transform 0.15s", transform: showDayPicker ? "rotate(180deg)" : "rotate(0deg)" }} />
              </button>
              <AnimatePresence>
                {showDayPicker && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.12 }} className="absolute bottom-full mb-1.5 left-0 right-0 z-20">
                    <DayPicker
                      days={(target as Extract<DetailTarget, { source: "sidebar" }>).days}
                      onPick={(dayNumber) => { (target as Extract<DetailTarget, { source: "sidebar" }>).onAddToDay(dayNumber); onClose(); }}
                      onCancel={() => setShowDayPicker(false)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {isDay && otherDays.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowDayPicker((v) => !v)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold font-body transition-all bg-teal text-surface hover:bg-teal-hover active:scale-[0.98]"
              >
                <ArrowRight size={13} />
                Move to day
                <ChevronDown size={10} style={{ opacity: 0.75, transition: "transform 0.15s", transform: showDayPicker ? "rotate(180deg)" : "rotate(0deg)" }} />
              </button>
              <AnimatePresence>
                {showDayPicker && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.12 }} className="absolute bottom-full mb-1.5 left-0 right-0 z-20">
                    <DayPicker
                      days={otherDays}
                      onPick={(toDay) => { (target as Extract<DetailTarget, { source: "day" }>).onMoveToDay(toDay); onClose(); }}
                      onCancel={() => setShowDayPicker(false)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="flex gap-2">
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium font-body transition-all bg-surface2 border border-border text-ink-muted hover:text-ink active:scale-[0.98]">
              <ExternalLink size={11} />
              Maps
            </a>
            {isSidebar && (target as Extract<DetailTarget, { source: "sidebar" }>).onSave && (
              <button onClick={() => { (target as Extract<DetailTarget, { source: "sidebar" }>).onSave!(); onClose(); }} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium font-body transition-colors bg-surface2 border border-border text-ink-muted hover:text-ink active:scale-[0.98]">
                <Bookmark size={11} />
                Save
              </button>
            )}
            {isDay && isPoi && (
              <button onClick={() => { (target as Extract<DetailTarget, { source: "day" }>).onMoveToSaved(); onClose(); }} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium font-body transition-colors bg-surface2 border border-border text-ink-muted hover:text-ink active:scale-[0.98]">
                <Bookmark size={11} />
                Save
              </button>
            )}
            {(isDay || (isSidebar && (target as Extract<DetailTarget, { source: "sidebar" }>).onRemove)) && (
              <button
                onClick={() => {
                  if (isDay) (target as Extract<DetailTarget, { source: "day" }>).onRemove();
                  else (target as Extract<DetailTarget, { source: "sidebar" }>).onRemove!();
                  onClose();
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium font-body transition-all bg-surface2 border border-red/25 text-red/65 hover:bg-red/10 active:scale-[0.98]"
                aria-label="Remove"
              >
                <Trash2 size={11} />
                Delete
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Scrollable body (photo + details) ───────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto">

        {/* Photo carousel */}
        <div className="relative shrink-0 overflow-hidden border-t border-border" style={{ height: 200 }}>
          {photoUrls.length > 0 ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={photoUrls[photoIndex]}
                src={photoUrls[photoIndex]}
                alt={name}
                className="absolute inset-0 w-full h-full"
                style={{ objectFit: "cover", objectPosition: "center" }}
              />
              {photoUrls.length > 1 && (
                <>
                  <button onClick={prevPhoto} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/30 transition-colors" style={{ background: "rgba(0,0,0,0.45)", color: "#fff", backdropFilter: "blur(4px)" }} aria-label="Previous photo">
                    <ChevronLeft size={14} />
                  </button>
                  <button onClick={nextPhoto} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/30 transition-colors" style={{ background: "rgba(0,0,0,0.45)", color: "#fff", backdropFilter: "blur(4px)" }} aria-label="Next photo">
                    <ChevronRight size={14} />
                  </button>
                </>
              )}
              {photoUrls.length > 1 && (
                <div className="absolute bottom-3 right-3 text-[9px] font-bold font-body px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.55)", color: "rgba(255,255,255,0.85)", backdropFilter: "blur(4px)" }}>
                  {photoIndex + 1}/{photoUrls.length}
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0" style={{ background: heroMeta.bg }} />
          )}
        </div>

        {/* Meta grid */}
        {hasMetaGrid && (
          <div className="px-3 pb-2">
            <div className="rounded-lg overflow-hidden border border-border">
              {/* Row 1: price + best time (or indoor/outdoor) */}
              {(priceLevel != null || bestTime || indoorOutdoor || bookingRequired) && (
                <div className={`grid grid-cols-2 ${(address || neighborhood) ? "border-b border-border" : ""}`}>
                  {priceLevel != null && (
                    <MetaCell label="Price" icon={null}>
                      {PRICE_LABELS[priceLevel]}
                    </MetaCell>
                  )}
                  {bestTime && (
                    <MetaCell label="Best time" borderLeft={priceLevel != null}>
                      {bestTime}
                    </MetaCell>
                  )}
                  {!bestTime && indoorOutdoor && (
                    <MetaCell label="Setting" borderLeft={priceLevel != null} icon={
                      indoorOutdoor === "indoor" ? <Building2 size={9} /> : indoorOutdoor === "outdoor" ? <Sun size={9} /> : <CloudSun size={9} />
                    }>
                      {indoorOutdoor === "indoor" ? "Indoor" : indoorOutdoor === "outdoor" ? "Outdoor" : "In/Outdoor"}
                    </MetaCell>
                  )}
                  {!bestTime && !indoorOutdoor && bookingRequired && (
                    <MetaCell label="Booking" borderLeft={priceLevel != null}>
                      Required
                    </MetaCell>
                  )}
                  {priceLevel == null && !bestTime && !indoorOutdoor && !bookingRequired && null}
                </div>
              )}
              {/* Address row */}
              {(address || neighborhood) && (
                <MetaCell label="Address" fullWidth>
                  {address}
                  {neighborhood && (
                    <span className="ml-1 text-[10px] text-ink-subtle">· {neighborhood}</span>
                  )}
                </MetaCell>
              )}
            </div>
          </div>
        )}

        <div className="px-3 space-y-2 pb-3">

          {/* Opening hours — collapsible */}
          {hoursRows.length > 0 && (
            <div className="rounded-lg overflow-hidden border border-border">
              {/* Header row */}
              <button
                onClick={() => setHoursExpanded((v) => !v)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-body transition-colors hover:bg-surface2 text-ink-muted"
              >
                <Clock size={11} className="text-ink-subtle" />
                <span className="font-semibold uppercase tracking-[1.5px] text-[9px] text-ink-subtle">Hours</span>
                <ChevronDown size={10} style={{ opacity: 0.5, transform: hoursExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }} />
                {openStatus != null && (
                  <span className={`ml-auto text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${
                    openStatus
                      ? "bg-teal-light text-teal border border-teal/30"
                      : "bg-red/10 text-red border border-red/25"
                  }`}>
                    {openStatus ? "Open now" : "Closed"}
                  </span>
                )}
              </button>

              {/* Today's row — always visible */}
              {todayRow && (
                <HoursRow day={todayRow.day} time={todayRow.time} isToday />
              )}

              {/* All-days expansion */}
              <AnimatePresence initial={false}>
                {hoursExpanded && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} style={{ overflow: "hidden" }}>
                    {otherRows.map((r, i) => (
                      <HoursRow key={i} day={r.day} time={r.time} isToday={false} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Nearest transit */}
          {nearestTransit && (
            <p className="text-[10px] font-body flex items-center gap-1.5 text-ink-subtle">
              <MapPin size={9} />
              {nearestTransit}
            </p>
          )}

          {/* Theme tags */}
          {themeTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {themeTags.map((tag) => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full font-body bg-surface2 border border-border text-ink-muted">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Claude note */}
          {notes && (
            <p className="text-xs font-body italic leading-relaxed text-ink-muted">
              {notes}
            </p>
          )}

          {/* Booking tip */}
          {bookingTip && (
            <div className="bg-amber/10 border-l-2 border-amber rounded-r-md p-3 flex gap-2 font-body leading-relaxed">
              <Lightbulb size={13} className="shrink-0 mt-0.5 text-amber" />
              <span className="text-[12px] italic text-ink-muted">{bookingTip}</span>
            </div>
          )}

          {/* AI reason */}
          {(aiRecommended || aiReason) && aiReason && (
            <div className="rounded-lg px-3 py-2 text-xs font-body leading-relaxed bg-teal-light border border-teal/20 border-l-2 border-l-teal text-teal">
              <span className="flex items-center gap-1 font-semibold mb-0.5"><Sparkles size={9} />AI pick</span>
              {aiReason}
            </div>
          )}

          {/* Busy times */}
          {busyTimes && <BusyTimesBar busyTimes={busyTimes} />}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function MetaCell({
  label,
  icon,
  children,
  fullWidth,
  borderLeft,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  fullWidth?: boolean;
  borderLeft?: boolean;
}) {
  return (
    <div
      className={`px-3 py-2 ${fullWidth ? "col-span-2" : ""} ${borderLeft ? "border-l border-border" : ""}`}
    >
      <p className="text-[8px] font-bold uppercase tracking-[1.5px] font-body mb-0.5 flex items-center gap-1 text-ink-subtle">
        {icon}
        {label}
      </p>
      <p className="text-xs font-body leading-snug text-ink">
        {children}
      </p>
    </div>
  );
}

function HoursRow({ day, time, isToday }: { day: string; time: string; isToday: boolean }) {
  const closed = !time || time.toLowerCase() === "closed";
  return (
    <div
      className={`flex items-center gap-2 px-3 border-t border-border ${isToday ? "bg-teal-light border-l-2 border-l-teal" : "border-l-2 border-l-transparent"}`}
      style={{ height: 28 }}
    >
      <span
        className={`w-8 shrink-0 font-bold uppercase tracking-wide font-body text-[9px] ${isToday ? "text-teal" : "text-ink-subtle"}`}
      >
        {SHORT_DAYS[day] ?? day.slice(0, 3)}
      </span>
      <span
        className={`flex-1 text-right text-[10px] font-body ${closed ? "text-ink-subtle" : isToday ? "text-ink" : "text-ink-muted"}`}
      >
        {closed ? "Closed" : time}
      </span>
    </div>
  );
}
