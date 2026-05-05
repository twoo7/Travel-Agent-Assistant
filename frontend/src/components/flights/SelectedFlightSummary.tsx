"use client";

import { useState } from "react";
import { ExternalLink, ChevronDown, ChevronUp, X } from "lucide-react";
import type { TripLeg, FlightBooking } from "@/types/trip";
import { iataToCityName, getAirportName } from "@/utils/airportNames";
import { flightBookingUrl } from "@/utils/bookingLinks";
import { formatPrice } from "@/utils/formatPrice";

interface Props {
  leg: TripLeg;
  onChangeFlight: () => void;
  onSaveBooking: (booking: FlightBooking | null) => void;
}

function formatTime(dt: string) {
  try {
    return new Date(dt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return dt;
  }
}

export function SelectedFlightSummary({ leg, onChangeFlight, onSaveBooking }: Props) {
  const flight = leg.selected_flight!;
  const firstSeg = flight.segments[0];
  const lastSeg = flight.segments[flight.segments.length - 1];

  const [bookingOpen, setBookingOpen] = useState(false);
  const [confirmRef, setConfirmRef] = useState(leg.flight_booking?.confirmation_ref ?? "");
  const [overrideDep, setOverrideDep] = useState(leg.flight_booking?.manual_override?.departure_time ?? "");
  const [overrideArr, setOverrideArr] = useState(leg.flight_booking?.manual_override?.arrival_time ?? "");
  const [overrideCarrier, setOverrideCarrier] = useState(leg.flight_booking?.manual_override?.carrier ?? "");
  const [overrideFlight, setOverrideFlightNum] = useState(leg.flight_booking?.manual_override?.flight_number ?? "");

  function handleSave() {
    if (!confirmRef.trim()) {
      onSaveBooking(null);
      return;
    }
    const booking: FlightBooking = {
      confirmation_ref: confirmRef.trim(),
      booking_url: flightBookingUrl(leg),
      manual_override: {
        departure_time: overrideDep || undefined,
        arrival_time: overrideArr || undefined,
        carrier: overrideCarrier || undefined,
        flight_number: overrideFlight || undefined,
      },
    };
    onSaveBooking(booking);
    setBookingOpen(false);
  }

  return (
    <div className="rounded-xl p-4 space-y-3 bg-teal-light border border-teal/25">
      {/* Summary row */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold font-body text-teal">
            {firstSeg.carrier_code}{firstSeg.flight_number}
            {flight.segments.length > 1 && ` +${flight.segments.length - 1} stop`}
          </p>
          <p className="text-xs font-body text-ink">
            {firstSeg.departure_airport} ({iataToCityName(firstSeg.departure_airport)} · {getAirportName(firstSeg.departure_airport)})
            {" → "}
            {lastSeg.arrival_airport} ({iataToCityName(lastSeg.arrival_airport)} · {getAirportName(lastSeg.arrival_airport)})
          </p>
          <p className="text-xs font-body text-ink-muted">
            {formatTime(firstSeg.departure_time)} → {formatTime(lastSeg.arrival_time)}
            {" · "}
            <span className="text-teal">{formatPrice(flight.price, flight.currency)}</span>
          </p>
          {leg.flight_booking?.confirmation_ref && (
            <p className="text-xs font-body text-ink-muted">
              Confirmation: <span className="font-mono text-ink">{leg.flight_booking.confirmation_ref}</span>
            </p>
          )}
        </div>
        <button
          onClick={onChangeFlight}
          className="shrink-0 text-xs px-2.5 py-1 rounded-lg font-body transition-colors text-ink-muted border border-border hover:border-teal/40 hover:text-teal"
        >
          Change
        </button>
      </div>

      {/* Booking actions */}
      <div className="flex flex-wrap gap-2">
        <a
          href={flightBookingUrl(leg)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg font-body transition-opacity hover:opacity-80 bg-teal text-surface"
        >
          <ExternalLink size={12} />
          Book on Google Flights
        </a>
        <button
          onClick={() => setBookingOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg font-body transition-colors text-ink-muted border border-border hover:border-teal/40"
        >
          {bookingOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {leg.flight_booking?.confirmation_ref ? "Edit confirmation" : "Already booked?"}
        </button>
      </div>

      {/* Manual booking entry */}
      {bookingOpen && (
        <div className="space-y-2 pt-1">
          <div>
            <label className="block text-[10px] uppercase tracking-[2px] mb-1 font-body text-ink-subtle">
              Confirmation #
            </label>
            <input
              type="text"
              value={confirmRef}
              onChange={(e) => setConfirmRef(e.target.value)}
              placeholder="e.g. ABC123"
              className="w-full px-3 py-2 text-sm rounded-lg font-body focus:outline-none bg-surface border border-border focus:border-teal focus:ring-2 focus:ring-teal/20 text-ink"
            />
          </div>
          <details className="group">
            <summary className="text-xs cursor-pointer font-body text-ink-muted">
              Override times / carrier (optional)
            </summary>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                { label: "Departure time", value: overrideDep, set: setOverrideDep, placeholder: "e.g. 08:30" },
                { label: "Arrival time", value: overrideArr, set: setOverrideArr, placeholder: "e.g. 14:45" },
                { label: "Carrier", value: overrideCarrier, set: setOverrideCarrier, placeholder: "e.g. JL" },
                { label: "Flight #", value: overrideFlight, set: setOverrideFlightNum, placeholder: "e.g. 061" },
              ].map(({ label, value, set, placeholder }) => (
                <div key={label}>
                  <label className="block text-[10px] uppercase tracking-[2px] mb-1 font-body text-ink-subtle">
                    {label}
                  </label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-2 py-1.5 text-xs rounded-lg font-body focus:outline-none bg-surface border border-border focus:border-teal focus:ring-2 focus:ring-teal/20 text-ink"
                  />
                </div>
              ))}
            </div>
          </details>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="text-xs font-medium px-3 py-1.5 rounded-lg font-body bg-teal text-surface hover:bg-teal-hover transition-colors"
            >
              Save
            </button>
            {leg.flight_booking?.confirmation_ref && (
              <button
                onClick={() => { onSaveBooking(null); setConfirmRef(""); setBookingOpen(false); }}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-body text-ink-muted border border-border hover:border-red/40 hover:text-red transition-colors"
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
