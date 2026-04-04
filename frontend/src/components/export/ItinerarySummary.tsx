import type { TripContext, ItineraryDay } from "@/types/trip";

interface Props {
  tripContext: TripContext;
  itinerary: ItineraryDay[];
}

function formatDuration(iso: string) {
  return iso.replace("PT", "").replace("H", "h ").replace("M", "m").trim();
}

export function ItinerarySummary({ tripContext, itinerary }: Props) {
  return (
    <div className="space-y-8">
      {/* Trip header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white">
        <h2 className="text-2xl font-bold">
          {tripContext.home_origin} →{" "}
          {tripContext.legs.map((l) => l.destination).join(" → ")}
        </h2>
        <p className="mt-1 opacity-80">
          {tripContext.adults} adult{tripContext.adults > 1 ? "s" : ""}
          {tripContext.children > 0 && ` · ${tripContext.children} child${tripContext.children > 1 ? "ren" : ""}`}
          {" · "}
          {itinerary.length} day{itinerary.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* Flight summary */}
      {tripContext.legs.some((l) => l.selected_flight) && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">✈️ Flights</h3>
          <div className="space-y-2">
            {tripContext.legs.map((leg) =>
              leg.selected_flight ? (
                <div
                  key={leg.leg_number}
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between"
                >
                  <div>
                    <span className="font-medium text-gray-900">
                      {leg.origin} → {leg.destination}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">{leg.departure_date}</span>
                    {leg.selected_flight.ai_recommended && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                        ✨ AI Pick
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {leg.selected_flight.currency} {leg.selected_flight.price.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">
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
          <h3 className="text-lg font-bold text-gray-900 mb-3">🏨 Hotels</h3>
          <div className="space-y-2">
            {tripContext.legs.flatMap((leg) =>
              leg.hotel_stays.map((stay) => (
                <div
                  key={stay.hotel.id}
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between"
                >
                  <div>
                    <span className="font-medium text-gray-900">{stay.hotel.name}</span>
                    {stay.hotel.ai_recommended && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                        ✨ AI Pick
                      </span>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">{stay.check_in} → {stay.check_out}</p>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {stay.hotel.currency} {stay.hotel.price_per_night.toLocaleString()}<span className="text-xs text-gray-400">/night</span>
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Day-by-day itinerary */}
      {itinerary.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">🗓 Day-by-Day Itinerary</h3>
          <div className="space-y-5">
            {itinerary.map((day) => (
              <div key={day.day_number} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-100 px-4 py-2 flex items-center justify-between">
                  <span className="font-semibold text-gray-900">Day {day.day_number}</span>
                  <span className="text-xs text-gray-500">{day.date} · {day.city}</span>
                </div>

                {day.narrative && (
                  <p className="px-4 py-3 text-sm text-gray-600 italic border-b border-gray-50">
                    {day.narrative}
                  </p>
                )}

                <div className="divide-y divide-gray-50">
                  {day.items.map((item, i) => (
                    <div key={i} className="px-4 py-2 flex items-center gap-3">
                      <span className="text-sm">
                        {item.type === "airport" ? "✈️" : item.type === "hotel" ? "🏨" : "📍"}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.name}</p>
                        {item.address && <p className="text-xs text-gray-400">{item.address}</p>}
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
