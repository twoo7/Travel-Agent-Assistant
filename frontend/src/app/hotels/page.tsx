"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTripContext } from "@/context/TripContext";
import { api } from "@/services/api";
import { HotelSearchForm } from "@/components/hotels/HotelSearchForm";
import { HotelCard } from "@/components/hotels/HotelCard";
import { SortBar, SortOption } from "@/components/SortBar";
import { FilterBar, HotelFilters } from "@/components/FilterBar";
import { toCityCode } from "@/utils/cityCodeMap";
import type { HotelOffer, AccommodationType } from "@/types/trip";

const HOTEL_SORT_OPTIONS: SortOption[] = [
  { key: "ai", label: "AI Pick" },
  { key: "price_asc", label: "Price ↑" },
  { key: "price_desc", label: "Price ↓" },
  { key: "rating", label: "Rating ↓" },
];

export default function HotelsPage() {
  const router = useRouter();
  const { state, dispatch } = useTripContext();
  const { tripContext } = state;

  const [results, setResults] = useState<Record<number, HotelOffer[]>>({});
  const [loading, setLoading] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<Record<number, string>>({});
  const [pendingOffers, setPendingOffers] = useState<Record<number, HotelOffer | null>>({});
  const [pendingDates, setPendingDates] = useState<
    Record<number, { check_in: string; check_out: string }>
  >({});
  const autoFiredRef = useRef<Set<number>>(new Set());

  const [sortKey, setSortKey] = useState("ai");
  const [hotelFilters, setHotelFilters] = useState<HotelFilters>({ minRating: null, maxPrice: null });

  const displayResults = useMemo(() => {
    const display: Record<number, HotelOffer[]> = {};
    for (const [key, offers] of Object.entries(results)) {
      let filtered = [...offers];
      if (hotelFilters.minRating !== null) filtered = filtered.filter((o) => (o.rating ?? 0) >= hotelFilters.minRating!);
      if (hotelFilters.maxPrice !== null) filtered = filtered.filter((o) => o.price_per_night <= hotelFilters.maxPrice!);
      filtered.sort((a, b) => {
        if (sortKey === "ai") return a.ai_recommended === b.ai_recommended ? 0 : a.ai_recommended ? -1 : 1;
        if (sortKey === "price_asc") return a.price_per_night - b.price_per_night;
        if (sortKey === "price_desc") return b.price_per_night - a.price_per_night;
        if (sortKey === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
        return 0;
      });
      display[Number(key)] = filtered;
    }
    return display;
  }, [results, sortKey, hotelFilters]);

  function getDatesForLeg(legIndex: number): { check_in: string; check_out: string } {
    const leg = tripContext.legs[legIndex];
    const nextLeg = tripContext.legs[legIndex + 1];
    const check_in = leg.departure_date ?? "";
    const check_out = nextLeg?.departure_date ?? "";
    return { check_in, check_out };
  }

  async function handleSearch(
    legNumber: number,
    params: { city_code: string; check_in: string; check_out: string }
  ) {
    setLoading((prev) => ({ ...prev, [legNumber]: true }));
    setError((prev) => ({ ...prev, [legNumber]: "" }));
    try {
      const offers = await api.searchHotels({
        trip_context: tripContext,
        leg_number: legNumber,
        city_code: params.city_code,
        check_in: params.check_in,
        check_out: params.check_out,
        adults: tripContext.adults,
        currency: tripContext.currency,
      });
      setResults((prev) => ({ ...prev, [legNumber]: offers }));
      dispatch({ type: "SET_HOTEL_RESULTS", payload: { leg_number: legNumber, results: offers } });
      setPendingDates((prev) => ({
        ...prev,
        [legNumber]: { check_in: params.check_in, check_out: params.check_out },
      }));
    } catch (e) {
      setError((prev) => ({ ...prev, [legNumber]: String(e) }));
    } finally {
      setLoading((prev) => ({ ...prev, [legNumber]: false }));
    }
  }

  // Auto-fire on mount for legs where city + both dates are resolvable
  useEffect(() => {
    tripContext.legs.forEach((leg, legIndex) => {
      if (autoFiredRef.current.has(leg.leg_number)) return;
      const { check_in, check_out } = getDatesForLeg(legIndex);
      if (!leg.destination || !check_in || !check_out) return;
      const city_code = toCityCode(leg.destination);

      // Check if results are already cached in context
      if (leg.hotel_results && leg.hotel_results.length > 0) {
        setResults((prev) => ({ ...prev, [leg.leg_number]: leg.hotel_results! }));
        setPendingDates((prev) => ({
          ...prev,
          [leg.leg_number]: { check_in, check_out },
        }));
        autoFiredRef.current.add(leg.leg_number);
        return;
      }

      autoFiredRef.current.add(leg.leg_number);
      handleSearch(leg.leg_number, { city_code, check_in, check_out });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelectHotel(legNumber: number, offer: HotelOffer) {
    setPendingOffers((prev) => ({ ...prev, [legNumber]: offer }));
  }

  function handleConfirmStay(legNumber: number) {
    const offer = pendingOffers[legNumber];
    const dates = pendingDates[legNumber];
    if (!offer || !dates) return;
    dispatch({
      type: "ADD_HOTEL_STAY",
      payload: {
        leg_number: legNumber,
        stay: {
          hotel: offer,
          check_in: dates.check_in,
          check_out: dates.check_out,
          accommodation_type: "hotel" as AccommodationType,
        },
      },
    });
    dispatch({ type: "CLEAR_STALE", payload: { key: `hotels-${legNumber}` } });
  }

  function handleRemoveStay(legNumber: number, hotelId: string) {
    dispatch({ type: "REMOVE_HOTEL_STAY", payload: { leg_number: legNumber, hotel_id: hotelId } });
  }

  const confirmedLegs = tripContext.legs.filter((l) => l.hotel_stays.length > 0).length;
  const totalLegs = tripContext.legs.length;
  const allLegsHaveHotels = totalLegs > 0 && confirmedLegs === totalLegs;

  const validationIssues = tripContext.legs
    .filter((l) => l.hotel_stays.length === 0)
    .map((l) => `Leg ${l.leg_number} (${l.origin} → ${l.destination}): search and confirm a hotel`);

  if (tripContext.legs.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="text-gray-500">No trip set up yet.</p>
        <button onClick={() => router.push("/")} className="mt-4 text-blue-600 hover:underline">
          ← Go back to Trip Setup
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hotel Stays</h1>
        <p className="text-gray-500 mt-1">Find a hotel for each destination in your trip.</p>
      </div>

      {tripContext.legs.map((leg, legIndex) => {
        const { check_in, check_out } = getDatesForLeg(legIndex);

        return (
          <div key={leg.leg_number} className="space-y-3">
            <h2 className="font-semibold text-gray-800">
              Leg {leg.leg_number}: {leg.origin} → {leg.destination}
            </h2>

            {leg.transport_mode === "ferry" && (
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-5 space-y-1">
                <p className="font-semibold text-sky-800">⛴ Overnight Ferry Leg</p>
                <p className="text-sm text-sky-700">
                  Your overnight ferry from {leg.origin} to {leg.destination} includes cabin
                  accommodation. No hotel needed for this leg&apos;s departure night — you&apos;ll
                  sleep on board.
                </p>
              </div>
            )}

            {leg.transport_mode === "train" && (
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-5 space-y-1">
                <p className="font-semibold text-sky-800">🚂 Sleeper Train Leg</p>
                <p className="text-sm text-sky-700">
                  Your overnight sleeper train from {leg.origin} to {leg.destination} includes
                  berth accommodation. No hotel needed for this leg&apos;s departure night.
                </p>
              </div>
            )}

            {leg.hotel_stays.map((stay) => (
              <div
                key={stay.hotel.id}
                className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3"
              >
                <div>
                  <span className="text-green-700 font-medium text-sm">✓ {stay.hotel.name}</span>
                  <span className="text-gray-500 text-xs ml-2">
                    {stay.check_in} → {stay.check_out}
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveStay(leg.leg_number, stay.hotel.id)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}

            <HotelSearchForm
              defaultIata={leg.destination}
              defaultCheckIn={check_in}
              defaultCheckOut={check_out}
              onSearch={(params) => handleSearch(leg.leg_number, params)}
              loading={loading[leg.leg_number] ?? false}
            />

            {loading[leg.leg_number] && (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                <span className="animate-spin inline-block">⟳</span>
                <span>Searching hotels…</span>
              </div>
            )}

            {error[leg.leg_number] && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {error[leg.leg_number]}
              </p>
            )}

            {displayResults[leg.leg_number] && displayResults[leg.leg_number].length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                <SortBar options={HOTEL_SORT_OPTIONS} value={sortKey} onChange={setSortKey} />
                <FilterBar variant="hotels" filters={hotelFilters} onChange={setHotelFilters} />
              </div>
            )}

            {displayResults[leg.leg_number] && displayResults[leg.leg_number].length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No hotels found.</p>
            )}

            <div className="space-y-2">
              {(displayResults[leg.leg_number] ?? []).map((offer) => (
                <HotelCard
                  key={offer.id}
                  offer={offer}
                  selected={pendingOffers[leg.leg_number]?.id === offer.id}
                  confirmed={leg.hotel_stays.some((s) => s.hotel.id === offer.id)}
                  onSelect={(o) => handleSelectHotel(leg.leg_number, o)}
                  checkIn={pendingDates[leg.leg_number]?.check_in ?? getDatesForLeg(legIndex).check_in}
                  checkOut={pendingDates[leg.leg_number]?.check_out ?? getDatesForLeg(legIndex).check_out}
                />
              ))}
            </div>

            {pendingOffers[leg.leg_number] &&
              !leg.hotel_stays.some((s) => s.hotel.id === pendingOffers[leg.leg_number]?.id) && (
                <button
                  onClick={() => handleConfirmStay(leg.leg_number)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                >
                  ✓ Confirm: {pendingOffers[leg.leg_number]?.name}
                </button>
              )}
          </div>
        );
      })}

      {/* Validation panel + progress bar */}
      <div className="space-y-3 pt-2">
        {!allLegsHaveHotels && validationIssues.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
            <p className="text-sm font-semibold text-amber-800">⚠ Before you continue:</p>
            <ul className="space-y-1">
              {validationIssues.map((issue, i) => (
                <li key={i} className="text-sm text-amber-700">• {issue}</li>
              ))}
            </ul>
          </div>
        )}

        {allLegsHaveHotels && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <p className="text-sm font-medium text-green-700">
              ✓ All hotels confirmed — ready to continue
            </p>
          </div>
        )}

        <div className="space-y-1">
          <div className="text-xs text-gray-500">{confirmedLegs} of {totalLegs} legs with hotel</div>
          <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                allLegsHaveHotels ? "bg-green-500" : "bg-blue-400"
              }`}
              style={{ width: totalLegs > 0 ? `${(confirmedLegs / totalLegs) * 100}%` : "0%" }}
            />
          </div>
        </div>

        <div className="flex justify-between">
          <button onClick={() => router.push("/segments")} className="text-gray-500 hover:text-gray-700 text-sm">
            ← Back to Segments
          </button>
          <button
            onClick={() => router.push("/itinerary")}
            disabled={!allLegsHaveHotels}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2 rounded-lg transition-colors"
          >
            Build Itinerary →
          </button>
        </div>
      </div>
    </div>
  );
}
