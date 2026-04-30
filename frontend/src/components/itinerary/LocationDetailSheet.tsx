"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
    <motion.div
      className="h-full flex flex-col overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      style={{ background: "var(--glass-2)", backdropFilter: "blur(24px)" }}
    >
      {/* ── Photo carousel ──────────────────────────────────────── */}
      <div className="relative shrink-0 overflow-hidden" style={{ height: 156 }}>
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
                <button onClick={prevPhoto} className="absolute left-1.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/30 transition-colors" style={{ background: "rgba(0,0,0,0.45)", color: "#fff", backdropFilter: "blur(4px)" }} aria-label="Previous photo">
                  <ChevronLeft size={13} />
                </button>
                <button onClick={nextPhoto} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/30 transition-colors" style={{ background: "rgba(0,0,0,0.45)", color: "#fff", backdropFilter: "blur(4px)" }} aria-label="Next photo">
                  <ChevronRight size={13} />
                </button>
              </>
            )}
            {/* Photo label bottom-left */}
            {photoUrls.length > 1 && (
              <div className="absolute bottom-2 left-3 text-[9px] font-semibold font-body" style={{ color: "rgba(255,255,255,0.6)" }}>
                photo {photoIndex + 1} / {photoUrls.length}
              </div>
            )}
            {/* Counter badge bottom-right */}
            {photoUrls.length > 1 && (
              <div className="absolute bottom-2 right-2.5 text-[9px] font-bold font-body px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.55)", color: "rgba(255,255,255,0.85)", backdropFilter: "blur(4px)" }}>
                {photoIndex + 1}/{photoUrls.length}
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: heroMeta.bg }} />
        )}

        {/* Bottom scrim */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to bottom, rgba(10,22,40,0.1) 0%, rgba(10,22,40,0.55) 100%)" }} />

        {/* Badges top-left */}
        <div className="absolute top-2.5 left-3 flex items-center gap-1.5 pointer-events-none">
          {dayLabel && (
            <span className="text-[9px] font-bold uppercase tracking-[2px] px-2 py-0.5 rounded-full font-body" style={{ background: "#E07A5F", color: "#fff" }}>
              {dayLabel}
            </span>
          )}
          {category && (
            <span className="text-[9px] font-semibold uppercase tracking-[2px] px-2 py-0.5 rounded-full font-body" style={{ background: "rgba(10,22,40,0.65)", color: "rgba(255,255,255,0.9)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.2)" }}>
              {heroMeta.label}
            </span>
          )}
        </div>

        {/* Close */}
        <button onClick={onClose} className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors" style={{ background: "rgba(0,0,0,0.4)", color: "#fff", backdropFilter: "blur(4px)" }} aria-label="Close">
          <X size={12} />
        </button>
      </div>

      {/* ── Scrollable body ─────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto">

        {/* Name + rating */}
        <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-3">
          <h2 className="font-display text-xl leading-tight flex-1" style={{ color: "var(--text-primary)" }}>
            {name}
          </h2>
          {rating != null && (
            <div className="shrink-0 flex flex-col items-end gap-0.5 mt-0.5">
              <div className="flex items-center gap-0.5">
                {[1,2,3,4,5].map((s) => (
                  <Star key={s} size={11} fill={s <= Math.round(rating) ? "#f59e0b" : "transparent"} color="#f59e0b" />
                ))}
              </div>
              <span className="text-[10px] font-body" style={{ color: "var(--text-muted)" }}>
                {rating.toFixed(1)}{reviewCount != null ? ` (${reviewCount.toLocaleString()})` : ""}
              </span>
            </div>
          )}
        </div>

        {/* Meta grid */}
        {hasMetaGrid && (
          <div className="px-3 pb-2">
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--glass-border-2)" }}>
              {/* Row 1: price + best time (or indoor/outdoor) */}
              {(priceLevel != null || bestTime || indoorOutdoor || bookingRequired) && (
                <div className="grid grid-cols-2" style={{ borderBottom: (address || neighborhood) ? "1px solid var(--glass-border-1)" : undefined }}>
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
                    <span className="ml-1 text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>· {neighborhood}</span>
                  )}
                </MetaCell>
              )}
            </div>
          </div>
        )}

        <div className="px-3 space-y-2 pb-3">

          {/* Opening hours — collapsible */}
          {hoursRows.length > 0 && (
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--glass-border-2)" }}>
              {/* Header row */}
              <button
                onClick={() => setHoursExpanded((v) => !v)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-body transition-colors hover:bg-white/5"
                style={{ color: "var(--text-muted)" }}
              >
                <Clock size={11} style={{ color: "var(--text-subtle)" }} />
                <span className="font-semibold uppercase tracking-[1.5px] text-[9px]" style={{ color: "var(--text-eyebrow)" }}>Hours</span>
                <ChevronDown size={10} style={{ opacity: 0.5, transform: hoursExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }} />
                {openStatus != null && (
                  <span className="ml-auto text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full" style={{
                    background: openStatus ? "rgba(107,144,128,0.2)" : "rgba(239,68,68,0.12)",
                    color: openStatus ? "var(--success)" : "#f87171",
                    border: `1px solid ${openStatus ? "rgba(107,144,128,0.35)" : "rgba(239,68,68,0.25)"}`,
                  }}>
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
            <p className="text-[10px] font-body flex items-center gap-1.5" style={{ color: "var(--text-subtle)" }}>
              <MapPin size={9} />
              {nearestTransit}
            </p>
          )}

          {/* Theme tags */}
          {themeTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {themeTags.map((tag) => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full font-body" style={{ background: "var(--glass-1)", border: "1px solid var(--glass-border-1)", color: "var(--text-muted)" }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Claude note */}
          {notes && (
            <p className="text-xs font-body italic leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {notes}
            </p>
          )}

          {/* Booking tip */}
          {bookingTip && (
            <div className="rounded-lg px-3 py-2.5 flex gap-2 text-xs font-body leading-relaxed" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <Lightbulb size={13} className="shrink-0 mt-0.5" style={{ color: "rgba(245,158,11,0.75)" }} />
              <span style={{ color: "rgba(245,158,11,0.9)" }}>
                <span className="font-semibold">Tip: </span>{bookingTip}
              </span>
            </div>
          )}

          {/* AI reason */}
          {(aiRecommended || aiReason) && aiReason && (
            <div className="rounded-lg px-3 py-2 text-xs font-body leading-relaxed" style={{ background: "rgba(224,122,95,0.06)", border: "1px solid rgba(224,122,95,0.18)", borderLeft: "2px solid rgba(224,122,95,0.5)", color: "rgba(224,122,95,0.85)" }}>
              <span className="flex items-center gap-1 font-semibold mb-0.5"><Sparkles size={9} />AI pick</span>
              {aiReason}
            </div>
          )}

          {/* Busy times */}
          {busyTimes && <BusyTimesBar busyTimes={busyTimes} />}
        </div>
      </div>

      {/* ── Action bar ───────────────────────────────────────────── */}
      {!isAirport && (
        <div className="shrink-0 px-3 py-2 flex items-center gap-1.5" style={{ borderTop: "1px solid var(--glass-border-1)", background: "var(--glass-1)" }}>

          {/* Move to day / Add to day */}
          {isSidebar && (
            <div className="relative">
              <button
                onClick={() => setShowDayPicker((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-body transition-all hover:opacity-90 active:scale-95"
                style={{ background: "var(--accent)", color: "#fff", boxShadow: "0 0 10px rgba(224,122,95,0.25)" }}
              >
                <Plus size={11} />
                Add to day
                <ChevronDown size={9} style={{ opacity: 0.75, transition: "transform 0.15s", transform: showDayPicker ? "rotate(180deg)" : "rotate(0deg)" }} />
              </button>
              <AnimatePresence>
                {showDayPicker && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.12 }} className="absolute bottom-full mb-1.5 left-0 z-20" style={{ minWidth: 160 }}>
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium font-body transition-all hover:bg-white/10 active:scale-95"
                style={{ border: "1px solid var(--glass-border-2)", color: "var(--text-primary)" }}
              >
                <ArrowRight size={11} />
                Move to day
                <ChevronDown size={9} style={{ opacity: 0.6, transition: "transform 0.15s", transform: showDayPicker ? "rotate(180deg)" : "rotate(0deg)" }} />
              </button>
              <AnimatePresence>
                {showDayPicker && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.12 }} className="absolute bottom-full mb-1.5 left-0 z-20" style={{ minWidth: 160 }}>
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

          {/* Maps */}
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium font-body transition-all hover:bg-white/10 active:scale-95" style={{ border: "1px solid var(--glass-border-2)", color: "var(--text-muted)" }}>
            <ExternalLink size={11} />
            Maps
          </a>

          {/* Save */}
          {isSidebar && (target as Extract<DetailTarget, { source: "sidebar" }>).onSave && (
            <button onClick={() => { (target as Extract<DetailTarget, { source: "sidebar" }>).onSave!(); onClose(); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium font-body transition-colors hover:bg-white/8 active:scale-95" style={{ border: "1px solid var(--glass-border-2)", color: "var(--text-muted)" }}>
              <Bookmark size={11} />
              Save
            </button>
          )}
          {isDay && isPoi && (
            <button onClick={() => { (target as Extract<DetailTarget, { source: "day" }>).onMoveToSaved(); onClose(); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium font-body transition-colors hover:bg-white/8 active:scale-95" style={{ border: "1px solid var(--glass-border-2)", color: "var(--text-muted)" }}>
              <Bookmark size={11} />
              Save
            </button>
          )}

          {/* Delete — pushed right, red-tinted */}
          {(isDay || (isSidebar && (target as Extract<DetailTarget, { source: "sidebar" }>).onRemove)) && (
            <button
              onClick={() => {
                if (isDay) (target as Extract<DetailTarget, { source: "day" }>).onRemove();
                else (target as Extract<DetailTarget, { source: "sidebar" }>).onRemove!();
                onClose();
              }}
              className="ml-auto flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:bg-red-500/15 active:scale-95"
              style={{ border: "1px solid rgba(239,68,68,0.25)", color: "rgba(239,68,68,0.65)" }}
              aria-label="Remove"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      )}
    </motion.div>
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
      className={`px-3 py-2 ${fullWidth ? "col-span-2" : ""}`}
      style={{ borderLeft: borderLeft ? "1px solid var(--glass-border-1)" : undefined }}
    >
      <p className="text-[8px] font-bold uppercase tracking-[1.5px] font-body mb-0.5 flex items-center gap-1" style={{ color: "var(--text-eyebrow)" }}>
        {icon}
        {label}
      </p>
      <p className="text-xs font-body leading-snug" style={{ color: "var(--text-primary)" }}>
        {children}
      </p>
    </div>
  );
}

function HoursRow({ day, time, isToday }: { day: string; time: string; isToday: boolean }) {
  const closed = !time || time.toLowerCase() === "closed";
  return (
    <div
      className="flex items-center gap-2 px-3"
      style={{
        height: 28,
        background: isToday ? "rgba(224,122,95,0.08)" : "transparent",
        borderTop: "1px solid var(--glass-border-1)",
        borderLeft: isToday ? "2px solid var(--accent)" : "2px solid transparent",
      }}
    >
      <span
        className="w-8 shrink-0 font-bold uppercase tracking-wide font-body"
        style={{ fontSize: 9, color: isToday ? "var(--accent)" : "var(--text-subtle)" }}
      >
        {SHORT_DAYS[day] ?? day.slice(0, 3)}
      </span>
      <span
        className="flex-1 text-right text-[10px] font-body"
        style={{ color: closed ? "var(--text-subtle)" : isToday ? "var(--text-primary)" : "var(--text-muted)" }}
      >
        {closed ? "Closed" : time}
      </span>
    </div>
  );
}
