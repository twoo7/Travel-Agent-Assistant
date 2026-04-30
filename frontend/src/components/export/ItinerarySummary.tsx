"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { TripContext, ItineraryDay, TransportMode, TripLeg, HotelStay, DayItem } from "@/types/trip";
import { Plane, Train, Ship, Car, Hotel, MapPin, Sparkles, ChevronDown, ExternalLink } from "lucide-react";
import { iataToCityName, getAirportName } from "@/utils/airportNames";
import { formatPrice } from "@/utils/formatPrice";
import { calcNights } from "@/utils/dateUtils";
import { flightBookingUrl, hotelBookingUrl } from "@/utils/bookingLinks";

interface Props {
  tripContext: TripContext;
  itinerary: ItineraryDay[];
}

function formatDuration(iso: string) {
  return iso.replace("PT", "").replace("H", "h ").replace("M", "m").trim();
}

function TransportIcon({ mode }: { mode?: TransportMode }) {
  if (mode === "train") return <Train size={16} style={{ color: "var(--accent)" }} />;
  if (mode === "ferry") return <Ship size={16} style={{ color: "var(--accent)" }} />;
  if (mode === "car") return <Car size={16} style={{ color: "var(--accent)" }} />;
  return <Plane size={16} style={{ color: "var(--accent)" }} />;
}

function ItemIcon({ type }: { type: string }) {
  if (type === "airport") return <Plane size={13} style={{ color: "var(--accent)" }} />;
  if (type === "hotel") return <Hotel size={13} style={{ color: "var(--accent)" }} />;
  return <MapPin size={13} style={{ color: "var(--text-muted)" }} />;
}

function buildTotals(tripContext: TripContext): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const leg of tripContext.legs) {
    if (leg.selected_flight) {
      const cur = leg.selected_flight.currency;
      totals[cur] = (totals[cur] ?? 0) + leg.selected_flight.price;
    }
    for (const stay of leg.hotel_stays) {
      const cur = stay.hotel.currency;
      const nights = calcNights(stay.check_in, stay.check_out);
      totals[cur] = (totals[cur] ?? 0) + stay.hotel.price_per_night * nights;
    }
  }
  return totals;
}

function ExpandArea({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <>
      {/* Framer Motion for interactive — hidden in print */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden print:hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Always-visible in print */}
      <div className="hidden print:block">{children}</div>
    </>
  );
}

function FlightExpandContent({ leg }: { leg: TripLeg }) {
  const flight = leg.selected_flight!;
  return (
    <div className="px-4 pb-4 pt-2 space-y-3" style={{ borderTop: "1px solid var(--glass-border-1)" }}>
      <div className="space-y-1.5">
        {flight.segments.map((seg, i) => (
          <div key={i} className="flex items-start gap-3 text-sm font-body">
            <Plane size={13} className="mt-0.5 shrink-0" style={{ color: "var(--accent)" }} />
            <div>
              <span style={{ color: "var(--text-primary)" }}>
                {seg.departure_airport} → {seg.arrival_airport}
              </span>
              <span className="ml-2 text-xs" style={{ color: "var(--text-muted)" }}>
                {seg.carrier_code}{seg.flight_number} · {seg.departure_time.slice(11, 16)} – {seg.arrival_time.slice(11, 16)} · {formatDuration(seg.duration)}
              </span>
              <div className="text-xs" style={{ color: "var(--text-subtle, var(--text-muted))" }}>
                {iataToCityName(seg.departure_airport)} · {getAirportName(seg.departure_airport)}
                {" → "}
                {iataToCityName(seg.arrival_airport)} · {getAirportName(seg.arrival_airport)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {flight.ai_reason_bullets && flight.ai_reason_bullets.length > 0 && (
        <ul className="space-y-0.5">
          {flight.ai_reason_bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs font-body" style={{ color: "var(--text-muted)" }}>
              <Sparkles size={10} className="mt-0.5 shrink-0" style={{ color: "var(--accent)" }} />
              {b}
            </li>
          ))}
        </ul>
      )}

      {leg.flight_booking?.confirmation_ref && (
        <p className="text-xs font-body" style={{ color: "var(--text-muted)" }}>
          Confirmation:{" "}
          <span className="font-mono" style={{ color: "var(--text-primary)" }}>
            {leg.flight_booking.confirmation_ref}
          </span>
        </p>
      )}

      <a
        href={flightBookingUrl(leg)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg font-body print:hidden"
        style={{ background: "var(--accent)", color: "#fff" }}
      >
        <ExternalLink size={11} />
        Search on Google Flights
      </a>
    </div>
  );
}

function HotelExpandContent({ stay }: { stay: HotelStay }) {
  const nights = calcNights(stay.check_in, stay.check_out);
  return (
    <div className="px-4 pb-4 pt-2 space-y-3" style={{ borderTop: "1px solid var(--glass-border-1)" }}>
      {stay.hotel.address && (
        <p className="text-xs font-body" style={{ color: "var(--text-muted)" }}>
          <MapPin size={11} className="inline mr-1" style={{ color: "var(--accent)" }} />
          {stay.hotel.address}
        </p>
      )}

      <p className="text-xs font-body" style={{ color: "var(--text-muted)" }}>
        {stay.check_in} → {stay.check_out} · {nights} night{nights !== 1 ? "s" : ""} ·{" "}
        {formatPrice(stay.hotel.price_per_night, stay.hotel.currency)}/night
      </p>

      {stay.hotel.ai_reason_bullets && stay.hotel.ai_reason_bullets.length > 0 && (
        <ul className="space-y-0.5">
          {stay.hotel.ai_reason_bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs font-body" style={{ color: "var(--text-muted)" }}>
              <Sparkles size={10} className="mt-0.5 shrink-0" style={{ color: "var(--accent)" }} />
              {b}
            </li>
          ))}
        </ul>
      )}

      {stay.booking?.confirmation_ref && (
        <p className="text-xs font-body" style={{ color: "var(--text-muted)" }}>
          Confirmation:{" "}
          <span className="font-mono" style={{ color: "var(--text-primary)" }}>
            {stay.booking.confirmation_ref}
          </span>
        </p>
      )}

      <a
        href={hotelBookingUrl(stay.hotel, stay)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg font-body print:hidden"
        style={{ background: "var(--accent)", color: "#fff" }}
      >
        <ExternalLink size={11} />
        Search on Booking.com
      </a>
    </div>
  );
}

function POIExpandContent({ item }: { item: DayItem }) {
  return (
    <div className="px-4 pb-3 pt-1 space-y-2" style={{ borderTop: "1px solid var(--glass-border-1)" }}>
      {item.address && (
        <p className="text-xs font-body" style={{ color: "var(--text-muted)" }}>
          <MapPin size={11} className="inline mr-1" style={{ color: "var(--accent)" }} />
          {item.address}
        </p>
      )}
      {item.duration_mins && (
        <p className="text-xs font-body" style={{ color: "var(--text-muted)" }}>
          ~{item.duration_mins} min visit
        </p>
      )}
      {item.notes && (
        <p className="text-xs font-body italic" style={{ color: "var(--text-muted)" }}>{item.notes}</p>
      )}
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name + " " + item.address)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg font-body print:hidden"
        style={{ color: "var(--accent)", border: "1px solid var(--accent)" }}
      >
        <ExternalLink size={10} />
        Open in Google Maps
      </a>
    </div>
  );
}

export function ItinerarySummary({ tripContext, itinerary }: Props) {
  const [openRows, setOpenRows] = useState<Set<string>>(new Set());
  const totals = buildTotals(tripContext);
  const hasTotals = Object.keys(totals).length > 0;

  function toggle(key: string) {
    setOpenRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  return (
    <div className="space-y-8">
      {/* Trip header */}
      <div
        className="rounded-2xl p-7"
        style={{
          background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-dark, #c05a42) 100%)",
          boxShadow: "0 4px 32px var(--accent-glow)",
        }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[2.5px] mb-2 font-body" style={{ color: "rgba(255,255,255,0.65)" }}>
          Your Journey
        </p>
        <h2 className="font-display text-3xl font-bold leading-tight" style={{ color: "#fff" }}>
          {iataToCityName(tripContext.home_origin)} →{" "}
          {tripContext.legs.map((l) => iataToCityName(l.destination)).join(" → ")}
        </h2>
        <p className="mt-2 text-sm font-body" style={{ color: "rgba(255,255,255,0.75)" }}>
          {tripContext.adults} adult{tripContext.adults > 1 ? "s" : ""}
          {tripContext.children > 0 && ` · ${tripContext.children} child${tripContext.children > 1 ? "ren" : ""}`}
          {itinerary.length > 0 && ` · ${itinerary.length} day${itinerary.length > 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Transportation summary */}
      {tripContext.legs.some((l) => l.selected_flight) && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[2.5px] mb-1 font-body" style={{ color: "var(--text-eyebrow)" }}>Transport</p>
          <h2 className="font-display text-xl mb-3" style={{ color: "var(--text-primary)" }}>Getting There</h2>
          <div className="space-y-2">
            {tripContext.legs.map((leg, i) =>
              leg.selected_flight ? (() => {
                const key = `leg-${i}-flight`;
                const open = openRows.has(key);
                return (
                  <div
                    key={leg.leg_number}
                    className="rounded-xl overflow-hidden"
                    style={{
                      background: "var(--glass-1)",
                      border: "1px solid var(--glass-border-1)",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <button
                      onClick={() => toggle(key)}
                      className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <TransportIcon mode={leg.transport_mode} />
                        <div>
                          <span className="font-medium font-body" style={{ color: "var(--text-primary)" }}>
                            {iataToCityName(leg.origin)} → {iataToCityName(leg.destination)}
                          </span>
                          <span className="text-sm ml-2 font-body" style={{ color: "var(--text-muted)" }}>{leg.departure_date}</span>
                          {leg.selected_flight.ai_recommended && (
                            <span
                              className="ml-2 inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-body text-white"
                              style={{ background: "var(--accent)" }}
                            >
                              <Sparkles size={9} />
                              AI Pick
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-semibold font-display" style={{ color: "var(--accent)" }}>
                            {formatPrice(leg.selected_flight.price, leg.selected_flight.currency)}
                          </p>
                          <p className="text-xs font-body" style={{ color: "var(--text-muted)" }}>
                            {formatDuration(leg.selected_flight.total_duration)} ·{" "}
                            {leg.selected_flight.stops === 0 ? "Nonstop" : `${leg.selected_flight.stops} stop${leg.selected_flight.stops > 1 ? "s" : ""}`}
                          </p>
                        </div>
                        <ChevronDown
                          size={16}
                          className="shrink-0 transition-transform print:hidden"
                          style={{
                            color: "var(--text-muted)",
                            transform: open ? "rotate(180deg)" : "rotate(0deg)",
                          }}
                        />
                      </div>
                    </button>
                    <ExpandArea open={open}>
                      <FlightExpandContent leg={leg} />
                    </ExpandArea>
                  </div>
                );
              })() : null
            )}
          </div>
        </div>
      )}

      {/* Hotel summary */}
      {tripContext.legs.some((l) => l.hotel_stays.length > 0) && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[2.5px] mb-1 font-body" style={{ color: "var(--text-eyebrow)" }}>Accommodation</p>
          <h2 className="font-display text-xl mb-3" style={{ color: "var(--text-primary)" }}>Where You&apos;ll Stay</h2>
          <div className="space-y-2">
            {tripContext.legs.flatMap((leg, li) =>
              leg.hotel_stays.map((stay, si) => {
                const nights = calcNights(stay.check_in, stay.check_out);
                const key = `stay-${li}-${si}`;
                const open = openRows.has(key);
                return (
                  <div
                    key={stay.hotel.id}
                    className="rounded-xl overflow-hidden"
                    style={{
                      background: "var(--glass-1)",
                      border: "1px solid var(--glass-border-1)",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <button
                      onClick={() => toggle(key)}
                      className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer"
                    >
                      <div>
                        <span className="font-medium font-body" style={{ color: "var(--text-primary)" }}>{stay.hotel.name}</span>
                        {stay.hotel.ai_recommended && (
                          <span
                            className="ml-2 inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-body text-white"
                            style={{ background: "var(--accent)" }}
                          >
                            <Sparkles size={9} />
                            AI Pick
                          </span>
                        )}
                        <p className="text-xs mt-0.5 font-body" style={{ color: "var(--text-muted)" }}>{stay.check_in} → {stay.check_out}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-semibold font-display" style={{ color: "var(--accent)" }}>
                            {formatPrice(stay.hotel.price_per_night * nights, stay.hotel.currency)}
                          </p>
                          <p className="text-xs font-body" style={{ color: "var(--text-muted)" }}>
                            {formatPrice(stay.hotel.price_per_night, stay.hotel.currency)}/night · {nights} night{nights !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <ChevronDown
                          size={16}
                          className="shrink-0 transition-transform print:hidden"
                          style={{
                            color: "var(--text-muted)",
                            transform: open ? "rotate(180deg)" : "rotate(0deg)",
                          }}
                        />
                      </div>
                    </button>
                    <ExpandArea open={open}>
                      <HotelExpandContent stay={stay} />
                    </ExpandArea>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Day-by-day itinerary */}
      {itinerary.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[2.5px] mb-1 font-body" style={{ color: "var(--text-eyebrow)" }}>Itinerary</p>
          <h2 className="font-display text-xl mb-3" style={{ color: "var(--text-primary)" }}>Day by Day</h2>
          <div className="space-y-4">
            {itinerary.map((day) => (
              <div
                key={day.day_number}
                className="rounded-xl overflow-hidden"
                style={{
                  background: "var(--glass-2)",
                  border: "1px solid var(--glass-border-2)",
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
                }}
              >
                <div
                  className="px-4 py-2.5 flex items-center justify-between"
                  style={{
                    background: "var(--glass-1)",
                    borderBottom: "1px solid var(--glass-border-1)",
                  }}
                >
                  <span className="font-semibold text-sm font-body" style={{ color: "var(--text-primary)" }}>Day {day.day_number}</span>
                  <span className="text-xs font-body" style={{ color: "var(--text-muted)" }}>{day.date} · {day.city}</span>
                </div>

                {day.narrative && (
                  <p
                    className="px-4 py-3 text-sm italic font-body leading-relaxed"
                    style={{
                      color: "var(--text-muted)",
                      borderBottom: "1px solid var(--glass-border-1)",
                    }}
                  >
                    {day.narrative}
                  </p>
                )}

                <div>
                  {day.items.map((item, i) => {
                    const isPOI = item.type === "poi";
                    const key = `day-${day.day_number}-poi-${i}`;
                    const open = openRows.has(key);

                    if (!isPOI) {
                      return (
                        <div
                          key={item.id ?? i}
                          className="px-4 py-2.5 flex items-center gap-3"
                          style={i > 0 ? { borderTop: "1px solid var(--glass-border-1)" } : {}}
                        >
                          <ItemIcon type={item.type} />
                          <div>
                            <p className="text-sm font-medium font-body" style={{ color: "var(--text-primary)" }}>{item.name}</p>
                            {item.address && <p className="text-xs font-body" style={{ color: "var(--text-muted)" }}>{item.address}</p>}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={item.id ?? i}
                        style={i > 0 ? { borderTop: "1px solid var(--glass-border-1)" } : {}}
                      >
                        <button
                          onClick={() => toggle(key)}
                          className="w-full px-4 py-2.5 flex items-center gap-3 text-left cursor-pointer"
                        >
                          <ItemIcon type={item.type} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium font-body" style={{ color: "var(--text-primary)" }}>{item.name}</p>
                            {item.address && <p className="text-xs font-body truncate" style={{ color: "var(--text-muted)" }}>{item.address}</p>}
                          </div>
                          <ChevronDown
                            size={14}
                            className="shrink-0 transition-transform print:hidden"
                            style={{
                              color: "var(--text-muted)",
                              transform: open ? "rotate(180deg)" : "rotate(0deg)",
                            }}
                          />
                        </button>
                        <ExpandArea open={open}>
                          <POIExpandContent item={item} />
                        </ExpandArea>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grand total */}
      {hasTotals && (
        <div
          className="rounded-2xl p-6"
          style={{
            background: "var(--glass-2)",
            border: "1px solid var(--glass-border-2)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
          }}
        >
          <h3 className="text-base font-semibold mb-3 font-body" style={{ color: "var(--text-primary)" }}>Estimated Total</h3>
          <div className="space-y-1">
            {Object.entries(totals).map(([currency, amount]) => (
              <div key={currency} className="flex items-center justify-between">
                <span className="text-sm font-body" style={{ color: "var(--text-muted)" }}>{currency}</span>
                <span className="text-2xl font-bold font-display" style={{ color: "var(--accent)", textShadow: "0 0 20px var(--accent-glow)" }}>
                  {formatPrice(amount, currency)}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs mt-3 font-body" style={{ color: "var(--text-subtle)" }}>
            Flights + accommodation · excludes activities and meals
          </p>
        </div>
      )}
    </div>
  );
}
