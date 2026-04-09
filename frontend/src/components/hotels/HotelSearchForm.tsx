"use client";

import { useState, useEffect } from "react";
import AirportSearch from "@/components/AirportSearch";
import { toCityCode } from "@/utils/cityCodeMap";
import { Button } from "@/components/ui/Button";
import { Search, Check } from "lucide-react";

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
    <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-wrap gap-3 items-end shadow-card">
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
        <label className="block text-xs font-medium text-charcoal/60 mb-1 font-body flex items-center gap-1">
          Check-in
          {checkInAuto && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-success bg-success/10 border border-success/20 px-1.5 py-0.5 rounded-full font-body">
              <Check size={9} />
              Auto
            </span>
          )}
        </label>
        <input
          type="date"
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors font-body"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-charcoal/60 mb-1 font-body flex items-center gap-1">
          Check-out
          {checkOutAuto && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-success bg-success/10 border border-success/20 px-1.5 py-0.5 rounded-full font-body">
              <Check size={9} />
              Auto
            </span>
          )}
        </label>
        <input
          type="date"
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors font-body"
        />
      </div>

      <Button
        variant="primary"
        size="md"
        onClick={handleSubmit}
        disabled={loading || !checkIn || !checkOut || !iata}
        loading={loading}
        icon={<Search size={14} />}
      >
        {loading ? "Searching…" : "Search Hotels"}
      </Button>
    </div>
  );
}
