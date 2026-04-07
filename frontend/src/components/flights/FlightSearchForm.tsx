"use client";

import { useState } from "react";
import type { TripLeg } from "@/types/trip";

interface Props {
  leg: TripLeg;
  onSearch: (params: { origin: string; destination: string; departure_date: string }) => void;
  loading: boolean;
}

export function FlightSearchForm({ leg, onSearch, loading }: Props) {
  const [form, setForm] = useState({
    origin: leg.origin,
    destination: leg.destination,
    departure_date: leg.departure_date,
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
        <input
          name="origin"
          value={form.origin}
          onChange={handleChange}
          placeholder="JFK"
          maxLength={3}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase tracking-widest w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
        <input
          name="destination"
          value={form.destination}
          onChange={handleChange}
          placeholder="CDG"
          maxLength={3}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase tracking-widest w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
        <input
          type="date"
          name="departure_date"
          value={form.departure_date}
          onChange={handleChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <button
        onClick={() => onSearch(form)}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
      >
        {loading ? "Searching…" : "Search Flights"}
      </button>
    </div>
  );
}
