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
      className={`rounded-xl overflow-hidden bg-surface border ${
        recommended ? "border-l-2 border-teal/40" : "border-border"
      }`}
    >

      {/* Main row: text left, square image right */}
      <div
        className={`flex gap-2.5 p-2.5 ${hasExpandableContent || onOpenDetail ? "cursor-pointer" : ""}`}
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
              <span className="text-[13px] font-semibold leading-snug font-body group-hover:underline truncate text-ink">
                {name}
              </span>
              <ExternalLink size={10} className="opacity-0 group-hover:opacity-50 shrink-0 transition-opacity text-ink-muted" />
            </a>
          </div>

          {address && (
            <p className="text-[11px] font-body line-clamp-1 text-ink-subtle">{address}</p>
          )}

          {/* Rating + category + price row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {rating != null && (
              <span className="text-xs font-body font-medium text-amber">★ {rating.toFixed(1)}</span>
            )}
            {rating != null && priceLevel != null && (
              <span className="text-[11px] font-body text-ink-subtle">·</span>
            )}
            {priceLevel != null && (
              <span className="text-xs font-body text-ink-muted">{PRICE_LABELS[priceLevel]}</span>
            )}
            {category && (
              <span className="text-[10px] font-body capitalize px-1.5 py-0.5 rounded bg-surface2 text-ink-muted">{category}</span>
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
            {onRemove && !isSaved && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
                className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full transition-colors bg-black/50 text-white hover:bg-red/80"
                aria-label="Remove"
              >
                <X size={10} />
              </button>
            )}
          </div>
        ) : (onRemove && !isSaved) ? (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
            className="shrink-0 w-5 h-5 flex items-center justify-center rounded transition-colors hover:bg-red/10 hover:text-red text-ink-subtle self-start"
            aria-label="Remove"
          >
            <X size={11} />
          </button>
        ) : null}
      </div>

      {expanded && hasExpandableContent && (
        <div className="px-3 pb-2 pt-2 space-y-1 border-t border-border">
          {aiNote && (
            <p className="text-xs italic font-body text-teal">{aiNote}</p>
          )}
          {bestTime && (
            <p className="text-xs flex items-center gap-1 font-body text-ink-muted">
              <Clock size={10} />{bestTime}
            </p>
          )}
          {bookingRequired && (
            <p className="text-xs flex items-center gap-1 font-body text-amber">
              <Ticket size={10} />Booking required
            </p>
          )}
          {busyTimes && <BusyTimesBar busyTimes={busyTimes} />}
        </div>
      )}

      {/* Action bar */}
      <div className="px-2.5 pb-2.5">
      {isAdded ? (
        <div className="w-full text-xs font-medium py-1 rounded-lg flex items-center justify-center gap-1 font-body bg-teal-light text-teal cursor-default">
          <Check size={11} />Added to day
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
            className="flex-1 text-xs font-medium py-1 rounded-lg transition-colors flex items-center justify-center gap-1 font-body bg-teal text-surface hover:bg-teal-hover"
          >
            <Plus size={11} />Add
          </button>
          {(onSave || (isSaved && onRemove)) && (
            <button
              onClick={isSaved ? onRemove : onSave}
              className={`text-xs font-medium py-1.5 px-2 rounded-lg transition-colors flex items-center justify-center font-body ${
                isSaved
                  ? "bg-teal-light text-teal border border-teal/30"
                  : "bg-surface2 text-ink-subtle border border-border"
              }`}
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
