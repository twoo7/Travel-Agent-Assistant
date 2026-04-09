"use client";

import { useState } from "react";
import type { TripLeg } from "@/types/trip";
import { Button } from "@/components/ui/Button";
import { Search } from "lucide-react";

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
    <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-wrap gap-3 items-end shadow-card">
      <div>
        <label className="block text-xs font-medium text-charcoal/60 mb-1 font-body">From</label>
        <input
          name="origin"
          value={form.origin}
          onChange={handleChange}
          placeholder="JFK"
          maxLength={3}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm uppercase tracking-widest w-20 font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-charcoal/60 mb-1 font-body">To</label>
        <input
          name="destination"
          value={form.destination}
          onChange={handleChange}
          placeholder="CDG"
          maxLength={3}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm uppercase tracking-widest w-20 font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-charcoal/60 mb-1 font-body">Date</label>
        <input
          type="date"
          name="departure_date"
          value={form.departure_date}
          onChange={handleChange}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors font-body"
        />
      </div>
      <Button
        variant="primary"
        size="md"
        onClick={() => onSearch(form)}
        loading={loading}
        icon={<Search size={14} />}
      >
        {loading ? "Searching…" : "Search Flights"}
      </Button>
    </div>
  );
}
