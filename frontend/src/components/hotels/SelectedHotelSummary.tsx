"use client";

import { useState } from "react";
import { ExternalLink, ChevronDown, ChevronUp, X } from "lucide-react";
import type { HotelStay, HotelBooking } from "@/types/trip";
import { hotelBookingUrl } from "@/utils/bookingLinks";

interface Props {
  stay: HotelStay;
  onRemove: () => void;
  onSaveBooking: (booking: HotelBooking | null) => void;
}

function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000);
}

export function SelectedHotelSummary({ stay, onRemove, onSaveBooking }: Props) {
  const nights = nightsBetween(stay.check_in, stay.check_out);
  const total = stay.hotel.price_per_night * Math.max(nights, 1);

  const [bookingOpen, setBookingOpen] = useState(false);
  const [confirmRef, setConfirmRef] = useState(stay.booking?.confirmation_ref ?? "");
  const [overrideCheckIn, setOverrideCheckIn] = useState(stay.booking?.manual_override?.check_in ?? "");
  const [overrideCheckOut, setOverrideCheckOut] = useState(stay.booking?.manual_override?.check_out ?? "");

  function handleSave() {
    if (!confirmRef.trim()) {
      onSaveBooking(null);
      return;
    }
    const booking: HotelBooking = {
      confirmation_ref: confirmRef.trim(),
      booking_url: hotelBookingUrl(stay.hotel, stay),
      manual_override: {
        check_in: overrideCheckIn || undefined,
        check_out: overrideCheckOut || undefined,
      },
    };
    onSaveBooking(booking);
    setBookingOpen(false);
  }

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: "rgba(107,144,128,0.08)", border: "1px solid rgba(107,144,128,0.25)" }}
    >
      {/* Summary row */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold font-body" style={{ color: "var(--success)" }}>
            {stay.hotel.name}
          </p>
          <p className="text-xs font-body" style={{ color: "var(--text-muted)" }}>
            {stay.check_in} → {stay.check_out} · {nights} night{nights !== 1 ? "s" : ""}
          </p>
          <p className="text-xs font-body" style={{ color: "var(--text-muted)" }}>
            {stay.hotel.currency}{stay.hotel.price_per_night}/night
            {" · "}
            <span style={{ color: "var(--accent)" }}>
              {stay.hotel.currency}{total.toLocaleString()} total
            </span>
          </p>
          {stay.booking?.confirmation_ref && (
            <p className="text-xs font-body" style={{ color: "var(--text-muted)" }}>
              Confirmation: <span className="font-mono" style={{ color: "var(--text-primary)" }}>{stay.booking.confirmation_ref}</span>
            </p>
          )}
        </div>
        <button
          onClick={onRemove}
          className="shrink-0 text-xs px-2.5 py-1 rounded-lg font-body transition-colors"
          style={{ color: "var(--text-muted)", border: "1px solid var(--glass-border-2)" }}
        >
          Remove
        </button>
      </div>

      {/* Booking actions */}
      <div className="flex flex-wrap gap-2">
        <a
          href={hotelBookingUrl(stay.hotel, stay)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg font-body transition-opacity hover:opacity-80"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          <ExternalLink size={12} />
          Book on Booking.com
        </a>
        <button
          onClick={() => setBookingOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg font-body transition-colors"
          style={{ color: "var(--text-muted)", border: "1px solid var(--glass-border-2)" }}
        >
          {bookingOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {stay.booking?.confirmation_ref ? "Edit confirmation" : "Already booked?"}
        </button>
      </div>

      {/* Manual booking entry */}
      {bookingOpen && (
        <div className="space-y-2 pt-1">
          <div>
            <label className="block text-[10px] uppercase tracking-[2px] mb-1 font-body" style={{ color: "var(--text-eyebrow)" }}>
              Confirmation #
            </label>
            <input
              type="text"
              value={confirmRef}
              onChange={(e) => setConfirmRef(e.target.value)}
              placeholder="e.g. BK-4829301"
              className="w-full px-3 py-2 text-sm rounded-lg font-body focus:outline-none"
              style={{ border: "1px solid var(--glass-border-2)", background: "var(--glass-1)", color: "var(--text-primary)" }}
            />
          </div>
          <details className="group">
            <summary className="text-xs cursor-pointer font-body" style={{ color: "var(--text-muted)" }}>
              Override dates (optional)
            </summary>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                { label: "Check-in", value: overrideCheckIn, set: setOverrideCheckIn, type: "date" },
                { label: "Check-out", value: overrideCheckOut, set: setOverrideCheckOut, type: "date" },
              ].map(({ label, value, set, type }) => (
                <div key={label}>
                  <label className="block text-[10px] uppercase tracking-[2px] mb-1 font-body" style={{ color: "var(--text-eyebrow)" }}>
                    {label}
                  </label>
                  <input
                    type={type}
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded-lg font-body focus:outline-none"
                    style={{ border: "1px solid var(--glass-border-2)", background: "var(--glass-1)", color: "var(--text-primary)" }}
                  />
                </div>
              ))}
            </div>
          </details>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="text-xs font-medium px-3 py-1.5 rounded-lg font-body"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              Save
            </button>
            {stay.booking?.confirmation_ref && (
              <button
                onClick={() => { onSaveBooking(null); setConfirmRef(""); setBookingOpen(false); }}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-body"
                style={{ color: "var(--text-muted)", border: "1px solid var(--glass-border-2)" }}
              >
                <X size={11} /> Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
