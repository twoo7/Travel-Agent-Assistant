"use client";

import { useState, useEffect } from "react";
import AirportSearch from "@/components/AirportSearch";
import { toCityCode } from "@/utils/cityCodeMap";

interface Props {
  defaultIata: string;
  defaultCheckIn?: string;
  defaultCheckOut?: string;
  onSearch: (params: { city_code: string; check_in: string; check_out: string }) => void;
  loading: boolean;
}

export function HotelSearchForm({
  defaultIata,
  defaultCheckIn = "",
  defaultCheckOut = "",
  onSearch,
  loading,
}: Props) {
  const [iata, setIata] = useState(defaultIata);
  const [checkIn, setCheckIn] = useState(defaultCheckIn);
  const [checkOut, setCheckOut] = useState(defaultCheckOut);

  useEffect(() => { setIata(defaultIata); }, [defaultIata]);
  useEffect(() => { setCheckIn(defaultCheckIn); }, [defaultCheckIn]);
  useEffect(() => { setCheckOut(defaultCheckOut); }, [defaultCheckOut]);

  const checkInAuto = !!defaultCheckIn;
  const checkOutAuto = !!defaultCheckOut;

  function handleSubmit() {
    const city_code = toCityCode(iata) || iata;
    onSearch({ city_code, check_in: checkIn, check_out: checkOut });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
      <div className="flex-1 min-w-[200px]">
        <AirportSearch
          label="City or Airport"
          value={iata}
          onChange={setIata}
          placeholder="City or airport name"
          showCityCode
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Check-in
          {checkInAuto && (
            <span className="ml-1.5 text-xs font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
              ✓ Auto
            </span>
          )}
        </label>
        <input
          type="date"
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Check-out
          {checkOutAuto && (
            <span className="ml-1.5 text-xs font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
              ✓ Auto
            </span>
          )}
        </label>
        <input
          type="date"
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || !checkIn || !checkOut || !iata}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
      >
        {loading ? "Searching…" : "Search Hotels"}
      </button>
    </div>
  );
}
