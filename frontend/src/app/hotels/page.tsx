"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTripContext } from "@/context/TripContext";
import { api } from "@/services/api";
import { HotelSearchForm } from "@/components/hotels/HotelSearchForm";
import { HotelCard } from "@/components/hotels/HotelCard";
import { AnimatedList, AnimatedListItem } from "@/components/ui/AnimatedList";
import { SortBar, SortOption } from "@/components/SortBar";
import { FilterBar, HotelFilters } from "@/components/FilterBar";
import { Button } from "@/components/ui/Button";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { toCityCode } from "@/utils/cityCodeMap";
import type { HotelOffer, AccommodationType } from "@/types/trip";
import {
  Check, AlertTriangle, ArrowRight, ArrowLeft, Ship, Train, X, Hotel,
} from "lucide-react";
import { iataToCityName } from "@/utils/airportNames";

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

  const isReturnLeg = (l: { destination: string }) => l.destination === tripContext.home_origin;
  const requiredLegs = tripContext.legs.filter((l) => !isReturnLeg(l));
  const confirmedLegs = requiredLegs.filter((l) => l.hotel_stays.length > 0).length;
  const totalLegs = requiredLegs.length;
  const allLegsHaveHotels = totalLegs > 0 && confirmedLegs === totalLegs;
  const progressPct = totalLegs > 0 ? (confirmedLegs / totalLegs) * 100 : 0;

  const validationIssues = requiredLegs
    .filter((l) => l.hotel_stays.length === 0)
    .map((l) => `Leg ${l.leg_number} (${iataToCityName(l.origin)} → ${iataToCityName(l.destination)}): search and confirm a hotel`);

  if (tripContext.legs.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="font-body" style={{ color: "var(--text-muted)" }}>No trip set up yet.</p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 font-body text-sm underline underline-offset-2"
          style={{ color: "var(--accent)" }}
        >
          ← Go back to Trip Setup
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[2.5px] mb-1 font-body" style={{ color: "var(--text-eyebrow)" }}>Step 3 of 5</p>
          <h1 className="font-display text-4xl mb-2" style={{ color: "var(--text-primary)" }}>Choose Your Hotels</h1>
          <p className="font-body" style={{ color: "var(--text-muted)" }}>Find a hotel for each destination in your trip.</p>
        </div>

        {/* Leg sections */}
        {tripContext.legs.map((leg, legIndex) => {
          const { check_in, check_out } = getDatesForLeg(legIndex);

          const returnLeg = isReturnLeg(leg);

          return (
            <div key={leg.leg_number} className="space-y-3">
              <h2 className="font-semibold font-body flex items-center gap-2 flex-wrap" style={{ color: "var(--text-primary)" }}>
                <Hotel size={15} style={{ color: "var(--accent)" }} />
                Leg {leg.leg_number}:{" "}
                <span className="font-mono text-sm">{iataToCityName(leg.origin)} → {iataToCityName(leg.destination)}</span>
                {returnLeg && (
                  <span
                    className="text-xs font-body font-normal px-2 py-0.5 rounded-full"
                    style={{ color: "var(--text-muted)", background: "var(--glass-1)", border: "1px solid var(--glass-border-1)" }}
                  >
                    Return home — no hotel needed
                  </span>
                )}
              </h2>

              {returnLeg && (
                <p className="text-sm font-body italic" style={{ color: "var(--text-muted)" }}>
                  This leg returns you to {iataToCityName(tripContext.home_origin)}. No hotel booking required.
                </p>
              )}

              {/* Overnight ferry notice */}
              {leg.transport_mode === "ferry" && (
                <div
                  className="flex items-start gap-3 rounded-xl p-4"
                  style={{ background: "var(--glass-2)", border: "1px solid var(--glass-border-2)" }}
                >
                  <Ship size={16} className="shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
                  <div>
                    <p className="font-semibold text-sm font-body" style={{ color: "var(--text-primary)" }}>Overnight Ferry Leg</p>
                    <p className="text-sm font-body mt-0.5" style={{ color: "var(--text-muted)" }}>
                      Your overnight ferry from {leg.origin} to {leg.destination} includes cabin
                      accommodation. No hotel needed for this leg&apos;s departure night — you&apos;ll
                      sleep on board.
                    </p>
                  </div>
                </div>
              )}

              {/* Sleeper train advisory — non-suppressing */}
              {leg.transport_mode === "train" && (
                <div
                  className="flex items-start gap-2 rounded-xl px-3 py-2"
                  style={{ background: "var(--glass-1)", border: "1px solid var(--glass-border-1)" }}
                >
                  <Train size={13} className="shrink-0 mt-0.5" style={{ color: "var(--text-muted)" }} />
                  <p className="text-xs font-body" style={{ color: "var(--text-subtle)" }}>
                    Note: If this is an overnight sleeper train, berth accommodation may be included —
                    you may not need a hotel for this leg.
                  </p>
                </div>
              )}

              {/* Confirmed stays */}
              {leg.hotel_stays.map((stay) => (
                <div
                  key={stay.hotel.id}
                  className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{ background: "rgba(107,144,128,0.08)", border: "1px solid rgba(107,144,128,0.25)" }}
                >
                  <div className="flex items-center gap-2">
                    <Check size={14} style={{ color: "var(--success)" }} />
                    <span className="font-medium text-sm font-body" style={{ color: "var(--success)" }}>{stay.hotel.name}</span>
                    <span className="text-xs font-body" style={{ color: "var(--text-muted)" }}>
                      {stay.check_in} → {stay.check_out}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveStay(leg.leg_number, stay.hotel.id)}
                    className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
                    style={{ color: "var(--text-muted)" }}
                    aria-label="Remove hotel stay"
                  >
                    <X size={13} />
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
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
                </div>
              )}

              {error[leg.leg_number] && (
                <div
                  className="flex items-start gap-2 text-sm rounded-xl px-4 py-3 font-body"
                  style={{ color: "var(--warning)", background: "rgba(224,173,95,0.08)", border: "1px solid rgba(224,173,95,0.25)" }}
                >
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                  <span>{error[leg.leg_number]}</span>
                  <button
                    onClick={() => handleSearch(leg.leg_number, {
                      city_code: toCityCode(leg.destination),
                      check_in: pendingDates[leg.leg_number]?.check_in ?? check_in ?? "",
                      check_out: pendingDates[leg.leg_number]?.check_out ?? check_out ?? "",
                    })}
                    className="ml-auto shrink-0 text-xs font-medium underline hover:no-underline"
                  >
                    Retry
                  </button>
                </div>
              )}

              {displayResults[leg.leg_number] && displayResults[leg.leg_number].length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  <SortBar options={HOTEL_SORT_OPTIONS} value={sortKey} onChange={setSortKey} />
                  <FilterBar variant="hotels" filters={hotelFilters} onChange={setHotelFilters} />
                </div>
              )}

              {displayResults[leg.leg_number] && displayResults[leg.leg_number].length === 0 && (
                <p className="text-sm text-center py-6 font-body" style={{ color: "var(--text-muted)" }}>No hotels found.</p>
              )}

              <AnimatedList>
                {(displayResults[leg.leg_number] ?? []).map((offer) => (
                  <AnimatedListItem key={offer.id}>
                    <HotelCard
                      offer={offer}
                      selected={pendingOffers[leg.leg_number]?.id === offer.id}
                      confirmed={leg.hotel_stays.some((s) => s.hotel.id === offer.id)}
                      onSelect={(o) => handleSelectHotel(leg.leg_number, o)}
                      checkIn={pendingDates[leg.leg_number]?.check_in ?? check_in}
                      checkOut={pendingDates[leg.leg_number]?.check_out ?? check_out}
                    />
                  </AnimatedListItem>
                ))}
              </AnimatedList>

              {pendingOffers[leg.leg_number] &&
                !leg.hotel_stays.some((s) => s.hotel.id === pendingOffers[leg.leg_number]?.id) && (
                  <Button
                    variant="success"
                    size="md"
                    fullWidth
                    onClick={() => handleConfirmStay(leg.leg_number)}
                    icon={<Check size={14} />}
                  >
                    Confirm: {pendingOffers[leg.leg_number]?.name}
                  </Button>
                )}
            </div>
          );
        })}

        {/* Validation + progress */}
        <div className="space-y-3 pt-2">
          {!allLegsHaveHotels && validationIssues.length > 0 && (
            <div
              className="flex items-start gap-3 rounded-xl p-4"
              style={{ background: "rgba(224,173,95,0.08)", border: "1px solid rgba(224,173,95,0.25)" }}
            >
              <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: "var(--warning)" }} />
              <div>
                <p className="text-sm font-semibold font-body mb-1" style={{ color: "var(--warning)" }}>Before you continue:</p>
                <ul className="space-y-0.5">
                  {validationIssues.map((issue, i) => (
                    <li key={i} className="text-sm font-body" style={{ color: "var(--warning)" }}>• {issue}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {allLegsHaveHotels && (
            <div
              className="flex items-center gap-2 rounded-xl px-4 py-3"
              style={{ background: "rgba(107,144,128,0.08)", border: "1px solid rgba(107,144,128,0.25)" }}
            >
              <Check size={15} style={{ color: "var(--success)" }} />
              <p className="text-sm font-medium font-body" style={{ color: "var(--success)" }}>
                All hotels confirmed — ready to continue
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-body" style={{ color: "var(--text-muted)" }}>{confirmedLegs} of {totalLegs} legs with hotel</span>
              <span className="text-xs font-semibold font-body" style={{ color: "var(--accent)" }}>{Math.round(progressPct)}%</span>
            </div>
            <div
              className="h-1.5 w-full rounded-full overflow-hidden"
              style={{ background: "var(--glass-1)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%`, background: allLegsHaveHotels ? "var(--success)" : "var(--accent)" }}
              />
            </div>
          </div>

          <div className="flex justify-between pt-1">
            <Button variant="ghost" size="md" onClick={() => router.push("/segments")} icon={<ArrowLeft size={14} />}>
              Back to Segments
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => router.push("/itinerary")}
              disabled={!allLegsHaveHotels}
              icon={<ArrowRight size={14} />}
            >
              Build Itinerary
            </Button>
          </div>
        </div>
      </div>
  );
}
