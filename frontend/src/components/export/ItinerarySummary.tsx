import type { TripContext, ItineraryDay, TransportMode } from "@/types/trip";
import { Plane, Train, Ship, Car, Hotel, MapPin, Sparkles, Calendar } from "lucide-react";
import { iataToCityName } from "@/utils/airportNames";
import { formatPrice } from "@/utils/formatPrice";
import { calcNights } from "@/utils/dateUtils";

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

export function ItinerarySummary({ tripContext, itinerary }: Props) {
  const totals = buildTotals(tripContext);
  const hasTotals = Object.keys(totals).length > 0;

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
            {tripContext.legs.map((leg) =>
              leg.selected_flight ? (
                <div
                  key={leg.leg_number}
                  className="rounded-xl px-4 py-3 flex items-center justify-between"
                  style={{
                    background: "var(--glass-1)",
                    border: "1px solid var(--glass-border-1)",
                    backdropFilter: "blur(8px)",
                  }}
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
                  <div className="text-right">
                    <p className="font-semibold font-display" style={{ color: "var(--accent)" }}>
                      {formatPrice(leg.selected_flight.price, leg.selected_flight.currency)}
                    </p>
                    <p className="text-xs font-body" style={{ color: "var(--text-muted)" }}>
                      {formatDuration(leg.selected_flight.total_duration)} ·{" "}
                      {leg.selected_flight.stops === 0 ? "Nonstop" : `${leg.selected_flight.stops} stop${leg.selected_flight.stops > 1 ? "s" : ""}`}
                    </p>
                  </div>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* Hotel summary */}
      {tripContext.legs.some((l) => l.hotel_stays.length > 0) && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[2.5px] mb-1 font-body" style={{ color: "var(--text-eyebrow)" }}>Accommodation</p>
          <h2 className="font-display text-xl mb-3" style={{ color: "var(--text-primary)" }}>Where You'll Stay</h2>
          <div className="space-y-2">
            {tripContext.legs.flatMap((leg) =>
              leg.hotel_stays.map((stay) => {
                const nights = calcNights(stay.check_in, stay.check_out);
                return (
                  <div
                    key={stay.hotel.id}
                    className="rounded-xl px-4 py-3 flex items-center justify-between"
                    style={{
                      background: "var(--glass-1)",
                      border: "1px solid var(--glass-border-1)",
                      backdropFilter: "blur(8px)",
                    }}
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
                    <div className="text-right">
                      <p className="font-semibold font-display" style={{ color: "var(--accent)" }}>
                        {formatPrice(stay.hotel.price_per_night * nights, stay.hotel.currency)}
                      </p>
                      <p className="text-xs font-body" style={{ color: "var(--text-muted)" }}>
                        {formatPrice(stay.hotel.price_per_night, stay.hotel.currency)}/night · {nights} night{nights !== 1 ? "s" : ""}
                      </p>
                    </div>
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
                  {day.items.map((item, i) => (
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
                  ))}
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
