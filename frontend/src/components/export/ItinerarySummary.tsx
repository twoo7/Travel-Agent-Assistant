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
  if (mode === "train") return <Train size={16} className="text-accent" />;
  if (mode === "ferry") return <Ship size={16} className="text-accent" />;
  if (mode === "car") return <Car size={16} className="text-accent" />;
  return <Plane size={16} className="text-accent" />;
}

function ItemIcon({ type }: { type: string }) {
  if (type === "airport") return <Plane size={13} className="text-accent" />;
  if (type === "hotel") return <Hotel size={13} className="text-primary" />;
  return <MapPin size={13} className="text-muted" />;
}

export function ItinerarySummary({ tripContext, itinerary }: Props) {
  return (
    <div className="space-y-8">
      {/* Trip header */}
      <div className="bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-7 text-white">
        <p className="text-xs font-body uppercase tracking-widest opacity-70 mb-2">Your Journey</p>
        <h2 className="font-display text-3xl font-bold leading-tight">
          {iataToCityName(tripContext.home_origin)} →{" "}
          {tripContext.legs.map((l) => iataToCityName(l.destination)).join(" → ")}
        </h2>
        <p className="mt-2 text-sm font-body opacity-75">
          {tripContext.adults} adult{tripContext.adults > 1 ? "s" : ""}
          {tripContext.children > 0 && ` · ${tripContext.children} child${tripContext.children > 1 ? "ren" : ""}`}
          {itinerary.length > 0 && ` · ${itinerary.length} day${itinerary.length > 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Transportation summary */}
      {tripContext.legs.some((l) => l.selected_flight) && (
        <div>
          <h3 className="text-base font-semibold text-charcoal mb-3 flex items-center gap-2 font-body">
            <Plane size={16} className="text-accent" />
            Transportation
          </h3>
          <div className="space-y-2">
            {tripContext.legs.map((leg) =>
              leg.selected_flight ? (
                <div
                  key={leg.leg_number}
                  className="bg-white border border-gray-100 shadow-card rounded-xl px-4 py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <TransportIcon mode={leg.transport_mode} />
                    <div>
                    <span className="font-medium text-charcoal font-body">
                      {iataToCityName(leg.origin)} → {iataToCityName(leg.destination)}
                    </span>
                    <span className="text-sm text-muted ml-2 font-body">{leg.departure_date}</span>
                    {leg.selected_flight.ai_recommended && (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs bg-accent text-white px-1.5 py-0.5 rounded-full font-body">
                        <Sparkles size={9} />
                        AI Pick
                      </span>
                    )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary font-display">
                      {formatPrice(leg.selected_flight.price, leg.selected_flight.currency)}
                    </p>
                    <p className="text-xs text-muted font-body">
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
          <h3 className="text-base font-semibold text-charcoal mb-3 flex items-center gap-2 font-body">
            <Hotel size={16} className="text-primary" />
            Hotels
          </h3>
          <div className="space-y-2">
            {tripContext.legs.flatMap((leg) =>
              leg.hotel_stays.map((stay) => (
                <div
                  key={stay.hotel.id}
                  className="bg-white border border-gray-100 shadow-card rounded-xl px-4 py-3 flex items-center justify-between"
                >
                  <div>
                    <span className="font-medium text-charcoal font-body">{stay.hotel.name}</span>
                    {stay.hotel.ai_recommended && (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs bg-accent text-white px-1.5 py-0.5 rounded-full font-body">
                        <Sparkles size={9} />
                        AI Pick
                      </span>
                    )}
                    <p className="text-xs text-muted mt-0.5 font-body">{stay.check_in} → {stay.check_out}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary font-display">
                      {formatPrice(stay.hotel.price_per_night * calcNights(stay.check_in, stay.check_out), stay.hotel.currency)}
                    </p>
                    <p className="text-xs text-muted font-body">
                      {formatPrice(stay.hotel.price_per_night, stay.hotel.currency)}/night · {calcNights(stay.check_in, stay.check_out)} night{calcNights(stay.check_in, stay.check_out) !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Day-by-day itinerary */}
      {itinerary.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-charcoal mb-4 flex items-center gap-2 font-body">
            <Calendar size={16} className="text-success" />
            Day-by-Day Itinerary
          </h3>
          <div className="space-y-4">
            {itinerary.map((day) => (
              <div key={day.day_number} className="bg-white border border-gray-100 shadow-card rounded-xl overflow-hidden">
                <div className="bg-background border-b border-gray-100 px-4 py-2.5 flex items-center justify-between">
                  <span className="font-semibold text-charcoal text-sm font-body">Day {day.day_number}</span>
                  <span className="text-xs text-muted font-body">{day.date} · {day.city}</span>
                </div>

                {day.narrative && (
                  <p className="px-4 py-3 text-sm text-muted italic border-b border-gray-50 font-body leading-relaxed">
                    {day.narrative}
                  </p>
                )}

                <div className="divide-y divide-gray-50">
                  {day.items.map((item, i) => (
                    <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                      <ItemIcon type={item.type} />
                      <div>
                        <p className="text-sm font-medium text-charcoal font-body">{item.name}</p>
                        {item.address && <p className="text-xs text-muted font-body">{item.address}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
