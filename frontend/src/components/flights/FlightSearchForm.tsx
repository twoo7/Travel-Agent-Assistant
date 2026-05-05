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

function AirportChips({
  label,
  airports,
  selected,
  onSelect,
}: {
  label: string;
  airports: string[];
  selected: string;
  onSelect: (iata: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1 font-body text-ink-muted">{label}</label>
      <div className="flex gap-1.5 flex-wrap">
        {airports.map((iata) => {
          const isSelected = selected === iata;
          return (
            <button
              key={iata}
              type="button"
              onClick={() => onSelect(iata)}
              className={[
                "px-2.5 py-1.5 rounded-lg text-xs font-bold font-mono transition-all",
                isSelected
                  ? "bg-teal-light border-2 border-teal text-teal"
                  : "bg-surface2 border border-border text-ink-muted hover:border-teal/40",
              ].join(" ")}
            >
              {iata}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FlightSearchForm({ leg, onSearch, loading }: Props) {
  const [form, setForm] = useState({
    origin: leg.origin,
    destination: leg.destination,
    departure_date: leg.departure_date,
  });

  const hasOriginOptions = (leg.origin_airports?.length ?? 0) > 1;
  const hasDestOptions = (leg.destination_airports?.length ?? 0) > 1;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  return (
    <div className="rounded-xl p-4 flex flex-wrap gap-3 items-end bg-surface border border-border shadow-sm">
      {hasOriginOptions ? (
        <AirportChips
          label="From"
          airports={leg.origin_airports!}
          selected={form.origin}
          onSelect={(iata) => setForm((prev) => ({ ...prev, origin: iata }))}
        />
      ) : (
        <div>
          <label className="block text-xs font-medium mb-1 font-body text-ink-muted">From</label>
          <input
            type="text"
            name="origin"
            value={form.origin}
            onChange={handleChange}
            placeholder="JFK"
            maxLength={3}
            className="rounded-lg px-3 py-2 text-sm uppercase tracking-widest w-20 font-mono focus:outline-none transition-colors"
          />
        </div>
      )}

      {hasDestOptions ? (
        <AirportChips
          label="To"
          airports={leg.destination_airports!}
          selected={form.destination}
          onSelect={(iata) => setForm((prev) => ({ ...prev, destination: iata }))}
        />
      ) : (
        <div>
          <label className="block text-xs font-medium mb-1 font-body text-ink-muted">To</label>
          <input
            type="text"
            name="destination"
            value={form.destination}
            onChange={handleChange}
            placeholder="CDG"
            maxLength={3}
            className="rounded-lg px-3 py-2 text-sm uppercase tracking-widest w-20 font-mono focus:outline-none transition-colors"
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-medium mb-1 font-body text-ink-muted">Date</label>
        <input
          type="date"
          name="departure_date"
          value={form.departure_date}
          onChange={handleChange}
          className="rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors font-body"
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
