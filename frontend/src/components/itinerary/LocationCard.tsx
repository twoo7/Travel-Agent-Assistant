"use client";

import { useState } from "react";
import type { DayPlan } from "@/types/trip";
import { DayPicker } from "./DayPicker";
import { BusyTimesBar } from "./BusyTimesBar";
import { Plus, Bookmark, Check, Clock, Ticket, ExternalLink, X } from "lucide-react";

const PRICE_LABELS: Record<number, string> = { 0: "Free", 1: "$", 2: "$$", 3: "$$$", 4: "$$$$" };

function googleMapsUrl(name: string, placeId?: string) {
  const base = "https://www.google.com/maps/search/?api=1";
  const q = `&query=${encodeURIComponent(name)}`;
  const pid = placeId ? `&query_place_id=${placeId}` : "";
  return `${base}${q}${pid}`;
}

interface Props {
  id: string;
  name: string;
  address?: string;
  category?: string;
  rating?: number;
  priceLevel?: number;
  photoUrl?: string;
  placeId?: string;
  isAdded?: boolean;
  isSaved?: boolean;
  recommended?: boolean;
  // AI-specific optional fields
  aiNote?: string;
  bestTime?: string;
  bookingRequired?: boolean;
  busyTimes?: Record<string, number[]>;
  // Actions
  onAddToDay: (dayNumber: number) => void;
  onSave?: () => void;
  onRemove?: () => void;
  onOpenDetail?: () => void;
  days: DayPlan[];
}

export function LocationCard({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  id, name, address, category, rating, priceLevel, photoUrl, placeId,
  isAdded, isSaved, recommended, aiNote, bestTime, bookingRequired, busyTimes,
  onAddToDay, onSave, onRemove, onOpenDetail, days,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const hasExpandableContent = !!(aiNote || bestTime || bookingRequired || busyTimes);

  return (
    <div
      className={`rounded-xl overflow-hidden ${isAdded ? "opacity-50" : ""}`}
      style={{
        background: "var(--glass-2)",
        border: "1px solid var(--glass-border-2)",
        ...(recommended ? { borderLeft: "2px solid var(--accent)" } : {}),
      }}
    >
      {/* Saved indicator strip */}
      {isSaved && !isAdded && (
        <div
          className="flex items-center gap-1 px-3 py-1 text-[9px] font-bold uppercase tracking-[1.5px] font-body"
          style={{ background: "rgba(107,144,128,0.12)", borderBottom: "1px solid rgba(107,144,128,0.2)", color: "var(--success)" }}
        >
          <Bookmark size={9} fill="currentColor" />
          Saved
        </div>
      )}
      {/* Main row: text left, square image right */}
      <div
        className={`flex gap-2.5 p-3 ${hasExpandableContent || onOpenDetail ? "cursor-pointer" : ""}`}
        onClick={hasExpandableContent ? () => setExpanded((v) => !v) : onOpenDetail}
      >
        {/* Text block */}
        <div className="flex-1 min-w-0 flex flex-col justify-between gap-1">
          <div>
            <a
              href={googleMapsUrl(name, placeId)}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1 max-w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-sm font-semibold leading-snug font-body group-hover:underline line-clamp-2" style={{ color: "var(--text-primary)" }}>
                {name}
              </span>
              <ExternalLink size={10} className="opacity-0 group-hover:opacity-50 shrink-0 transition-opacity" style={{ color: "var(--text-muted)" }} />
            </a>
            {category && (
              <p className="text-[11px] font-body capitalize mt-0.5" style={{ color: "var(--text-muted)" }}>{category}</p>
            )}
          </div>

          {address && (
            <p className="text-[11px] font-body line-clamp-1" style={{ color: "var(--text-subtle)" }}>{address}</p>
          )}

          {/* Rating + price row */}
          <div className="flex items-center gap-2">
            {rating != null && (
              <span className="text-xs font-body font-medium" style={{ color: "var(--warning)" }}>★ {rating.toFixed(1)}</span>
            )}
            {priceLevel != null && (
              <span className="text-xs font-body" style={{ color: "var(--text-muted)" }}>{PRICE_LABELS[priceLevel]}</span>
            )}
          </div>
        </div>

        {/* Square image thumbnail */}
        {photoUrl ? (
          <div className="shrink-0 relative" style={{ width: 80, height: 80 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt={name}
              className="w-full h-full object-cover rounded-lg"
            />
            {onRemove && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
                className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full transition-colors hover:bg-red-500/80"
                style={{ background: "rgba(0,0,0,0.5)", color: "#fff" }}
                aria-label="Remove"
              >
                <X size={10} />
              </button>
            )}
          </div>
        ) : onRemove ? (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
            className="shrink-0 w-5 h-5 flex items-center justify-center rounded transition-colors hover:bg-red-500/10 self-start"
            style={{ color: "var(--text-subtle)" }}
            aria-label="Remove"
          >
            <X size={11} />
          </button>
        ) : null}
      </div>

      {expanded && hasExpandableContent && (
        <div className="px-3 pb-2 space-y-1" style={{ borderTop: "1px solid var(--glass-border-1)", paddingTop: 8 }}>
          {aiNote && (
            <p className="text-xs italic font-body" style={{ color: "var(--accent)" }}>{aiNote}</p>
          )}
          {bestTime && (
            <p className="text-xs flex items-center gap-1 font-body" style={{ color: "var(--text-muted)" }}>
              <Clock size={10} />{bestTime}
            </p>
          )}
          {bookingRequired && (
            <p className="text-xs flex items-center gap-1 font-body" style={{ color: "var(--warning)" }}>
              <Ticket size={10} />Booking required
            </p>
          )}
          {busyTimes && <BusyTimesBar busyTimes={busyTimes} />}
        </div>
      )}

      {/* Action bar */}
      <div className="px-3 pb-3">
      {isAdded ? (
        <div
          className="w-full text-xs font-medium py-1.5 rounded-lg flex items-center justify-center gap-1 font-body"
          style={{ background: "var(--glass-1)", color: "var(--text-subtle)", cursor: "default" }}
        >
          <Check size={11} />Added
        </div>
      ) : pickerOpen ? (
        <DayPicker
          days={days}
          onPick={(dayNumber) => { onAddToDay(dayNumber); setPickerOpen(false); }}
          onCancel={() => setPickerOpen(false)}
        />
      ) : (
        <div className="flex gap-1.5">
          <button
            onClick={() => setPickerOpen(true)}
            className="flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 font-body"
            style={{ background: "var(--accent)", color: "white" }}
          >
            <Plus size={11} />Add to day
          </button>
          {(onSave || (isSaved && onRemove)) && (
            <button
              onClick={isSaved ? onRemove : onSave}
              className="text-xs font-medium py-1.5 px-2 rounded-lg transition-colors flex items-center justify-center font-body"
              style={
                isSaved
                  ? { background: "rgba(107,144,128,0.15)", color: "var(--success)", border: "1px solid rgba(107,144,128,0.35)" }
                  : { background: "var(--glass-1)", color: "var(--text-subtle)", border: "1px solid var(--glass-border-1)" }
              }
              title={isSaved ? "Remove from saved" : "Save for later"}
            >
              <Bookmark size={11} fill={isSaved ? "currentColor" : "none"} />
            </button>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
