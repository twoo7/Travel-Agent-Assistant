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
  days: DayPlan[];
}

export function LocationCard({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  id, name, address, category, rating, priceLevel, photoUrl, placeId,
  isAdded, recommended, aiNote, bestTime, bookingRequired, busyTimes,
  onAddToDay, onSave, onRemove, days,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div
      className={`px-3 py-3 rounded-lg ${isAdded ? "opacity-50" : ""}`}
      style={{
        background: "var(--glass-2)",
        border: "1px solid var(--glass-border-2)",
        ...(recommended ? { borderLeft: "2px solid var(--accent)" } : {}),
      }}
    >
      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt={name} className="w-full h-24 object-cover rounded-lg mb-2" />
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <a
            href={googleMapsUrl(name, placeId)}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1 max-w-full"
          >
            <span className="text-sm font-semibold truncate font-body group-hover:underline" style={{ color: "var(--text-primary)" }}>
              {name}
            </span>
            <ExternalLink size={10} className="opacity-0 group-hover:opacity-60 shrink-0 transition-opacity" style={{ color: "var(--text-muted)" }} />
          </a>
          {category && (
            <p className="text-xs font-body capitalize" style={{ color: "var(--text-muted)" }}>{category}</p>
          )}
          {address && (
            <p className="text-xs font-body mt-0.5 line-clamp-1" style={{ color: "var(--text-subtle)" }}>{address}</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-0.5 shrink-0">
          {rating != null && (
            <p className="text-xs font-body" style={{ color: "var(--warning)" }}>★ {rating.toFixed(1)}</p>
          )}
          {priceLevel != null && (
            <p className="text-xs font-body" style={{ color: "var(--text-muted)" }}>{PRICE_LABELS[priceLevel]}</p>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              className="w-5 h-5 flex items-center justify-center rounded transition-colors hover:bg-red-500/10 mt-0.5"
              style={{ color: "var(--text-subtle)" }}
              aria-label="Remove"
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {aiNote && (
        <p className="text-xs italic mt-1.5 font-body" style={{ color: "var(--accent)" }}>{aiNote}</p>
      )}
      {bestTime && (
        <p className="text-xs mt-0.5 flex items-center gap-1 font-body" style={{ color: "var(--text-muted)" }}>
          <Clock size={10} />{bestTime}
        </p>
      )}
      {bookingRequired && (
        <p className="text-xs mt-0.5 flex items-center gap-1 font-body" style={{ color: "var(--warning)" }}>
          <Ticket size={10} />Booking required
        </p>
      )}
      {busyTimes && <BusyTimesBar busyTimes={busyTimes} />}

      {isAdded ? (
        <div
          className="mt-2 w-full text-xs font-medium py-1.5 rounded-lg flex items-center justify-center gap-1 font-body"
          style={{ background: "var(--glass-1)", color: "var(--text-subtle)", cursor: "default" }}
        >
          <Check size={11} />Added
        </div>
      ) : pickerOpen ? (
        <div className="mt-2">
          <DayPicker
            days={days}
            onPick={(dayNumber) => { onAddToDay(dayNumber); setPickerOpen(false); }}
            onCancel={() => setPickerOpen(false)}
          />
        </div>
      ) : (
        <div className="mt-2 flex gap-1.5">
          <button
            onClick={() => setPickerOpen(true)}
            className="flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 font-body"
            style={{ background: "var(--accent)", color: "white" }}
          >
            <Plus size={11} />Add to day
          </button>
          {onSave && (
            <button
              onClick={onSave}
              className="text-xs font-medium py-1.5 px-2 rounded-lg transition-colors flex items-center justify-center font-body"
              style={{ background: "var(--glass-1)", color: "var(--text-subtle)", border: "1px solid var(--glass-border-1)" }}
              title="Save for later"
            >
              <Bookmark size={11} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
