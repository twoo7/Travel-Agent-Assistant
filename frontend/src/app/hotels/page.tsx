"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTripContext } from "@/context/TripContext";
import { api } from "@/services/api";
import { HotelSearchForm } from "@/components/hotels/HotelSearchForm";
import { HotelCard } from "@/components/hotels/HotelCard";
import type { HotelOffer } from "@/types/trip";

// Common airport → Amadeus city code mapping
const AIRPORT_TO_CITY: Record<string, string> = {
  CDG: "PAR", ORY: "PAR", BVA: "PAR",
  LHR: "LON", LGW: "LON", STN: "LON", LTN: "LON", LCY: "LON",
  JFK: "NYC", LGA: "NYC", EWR: "NYC",
  LAX: "LAX", SFO: "SFO", ORD: "CHI", MDW: "CHI",
  NRT: "TYO", HND: "TYO",
  HKG: "HKG", SIN: "SIN", BKK: "BKK", DXB: "DXB",
  FCO: "ROM", CIA: "ROM",
  MAD: "MAD", BCN: "BCN",
  AMS: "AMS", BRU: "BRU", FRA: "FRA", MUC: "MUC",
  SYD: "SYD", MEL: "MEL",
  GRU: "SAO", GIG: "RIO",
  YYZ: "YTO", YVR: "YVR",
};

function toCityCode(iata: string): string {
  return AIRPORT_TO_CITY[iata.toUpperCase()] ?? iata;
}

export default function HotelsPage() {
  const router = useRouter();
  const { state, dispatch } = useTripContext();
  const { tripContext } = state;

  const [results, setResults] = useState<Record<number, HotelOffer[]>>({});
  const [loading, setLoading] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<Record<number, string>>({});
  const [pendingStays, setPendingStays] = useState<
    Record<number, { offer: HotelOffer; check_in: string; check_out: string } | null>
  >({});

  async function handleSearch(
    legNumber: number,
    params: { city_code: string; check_in: string; check_out: string }
  ) {
    setLoading((prev) => ({ ...prev, [legNumber]: true }));
    setError((prev) => ({ ...prev, [legNumber]: "" }));
    setPendingStays((prev) => ({ ...prev, [legNumber]: null }));
    try {
      const offers = await api.searchHotels({
        trip_context: tripContext,
        leg_number: legNumber,
        city_code: params.city_code,
        check_in: params.check_in,
        check_out: params.check_out,
        adults: tripContext.adults,
      });
      setResults((prev) => ({ ...prev, [legNumber]: offers }));
      // Store check-in/out for when user selects a hotel
      if (offers.length > 0) {
        const recommended = offers.find((o) => o.ai_recommended) ?? offers[0];
        setPendingStays((prev) => ({
          ...prev,
          [legNumber]: { offer: recommended, check_in: params.check_in, check_out: params.check_out },
        }));
      }
    } catch (e) {
      setError((prev) => ({ ...prev, [legNumber]: String(e) }));
    } finally {
      setLoading((prev) => ({ ...prev, [legNumber]: false }));
    }
  }

  function handleSelectHotel(
    legNumber: number,
    offer: HotelOffer,
    check_in: string,
    check_out: string
  ) {
    setPendingStays((prev) => ({ ...prev, [legNumber]: { offer, check_in, check_out } }));
  }

  function handleConfirmStay(legNumber: number) {
    const pending = pendingStays[legNumber];
    if (!pending) return;
    dispatch({
      type: "ADD_HOTEL_STAY",
      payload: {
        leg_number: legNumber,
        stay: { hotel: pending.offer, check_in: pending.check_in, check_out: pending.check_out },
      },
    });
  }

  function handleRemoveStay(legNumber: number, hotelId: string) {
    dispatch({ type: "REMOVE_HOTEL_STAY", payload: { leg_number: legNumber, hotel_id: hotelId } });
  }

  const allLegsHaveHotels = tripContext.legs.every((l) => l.hotel_stays.length > 0);

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

      {tripContext.legs.map((leg) => (
        <div key={leg.leg_number} className="space-y-3">
          <h2 className="font-semibold text-gray-800">
            Leg {leg.leg_number}: {leg.origin} → {leg.destination}
          </h2>

          {/* Confirmed stays */}
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
            defaultCityCode={toCityCode(leg.destination)}
            onSearch={(params) => handleSearch(leg.leg_number, params)}
            loading={loading[leg.leg_number] ?? false}
          />

          {error[leg.leg_number] && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error[leg.leg_number]}
            </p>
          )}

          {results[leg.leg_number] && results[leg.leg_number].length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">No hotels found.</p>
          )}

          <div className="space-y-2">
            {(results[leg.leg_number] ?? []).map((offer) => (
              <HotelCard
                key={offer.id}
                offer={offer}
                selected={pendingStays[leg.leg_number]?.offer.id === offer.id}
                onSelect={(o) =>
                  handleSelectHotel(
                    leg.leg_number,
                    o,
                    pendingStays[leg.leg_number]?.check_in ?? "",
                    pendingStays[leg.leg_number]?.check_out ?? ""
                  )
                }
              />
            ))}
          </div>

          {pendingStays[leg.leg_number] && (
            <button
              onClick={() => handleConfirmStay(leg.leg_number)}
              className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
            >
              ✓ Confirm: {pendingStays[leg.leg_number]?.offer.name}
            </button>
          )}
        </div>
      ))}

      <div className="flex justify-between pt-2">
        <button onClick={() => router.push("/flights")} className="text-gray-500 hover:text-gray-700 text-sm">
          ← Back to Flights
        </button>
        <button
          onClick={() => router.push("/itinerary")}
          disabled={!allLegsHaveHotels}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2 rounded-lg transition-colors"
        >
          Build Itinerary →
        </button>
      </div>
    </div>
  );
}
