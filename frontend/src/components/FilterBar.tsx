"use client";

import type { CSSProperties } from "react";

interface FlightFilters {
  maxStops: number | null;
  maxPrice: number | null;
}

interface HotelFilters {
  minRating: number | null;
  maxPrice: number | null;
}

interface FlightFilterBarProps {
  variant: "flights";
  filters: FlightFilters;
  onChange: (filters: FlightFilters) => void;
}

interface HotelFilterBarProps {
  variant: "hotels";
  filters: HotelFilters;
  onChange: (filters: HotelFilters) => void;
}

type Props = FlightFilterBarProps | HotelFilterBarProps;

export type { FlightFilters, HotelFilters };

function chipStyle(active: boolean): CSSProperties {
  return active
    ? { background: "rgba(224,122,95,0.1)", color: "var(--accent)" }
    : { background: "var(--glass-1)", color: "var(--text-muted)" };
}

export function FilterBar(props: Props) {
  if (props.variant === "flights") {
    const { filters, onChange } = props;
    return (
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-body" style={{ color: "var(--text-muted)" }}>Max stops:</span>
          {[
            { label: "Any", value: null },
            { label: "Nonstop", value: 0 },
            { label: "1 stop", value: 1 },
          ].map((opt) => {
            const active = filters.maxStops === opt.value;
            return (
              <button
                key={opt.label}
                onClick={() => onChange({ ...filters, maxStops: opt.value })}
                className={`px-2 py-1 rounded-full transition-colors font-body${active ? " font-medium" : ""}`}
                style={chipStyle(active)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-body" style={{ color: "var(--text-muted)" }}>Max price:</span>
          <input
            type="number"
            placeholder="No limit"
            value={filters.maxPrice ?? ""}
            onChange={(e) =>
              onChange({
                ...filters,
                maxPrice: e.target.value ? Number(e.target.value) : null,
              })
            }
            className="w-24 rounded-lg px-2 py-1 text-xs font-body focus:outline-none"
          />
        </div>
      </div>
    );
  }

  const { filters, onChange } = props;
  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="flex items-center gap-1.5">
        <span className="font-body" style={{ color: "var(--text-muted)" }}>Min rating:</span>
        {[null, 3, 4, 5].map((val) => {
          const active = filters.minRating === val;
          return (
            <button
              key={val ?? "any"}
              onClick={() => onChange({ ...filters, minRating: val })}
              className={`px-2 py-1 rounded-full transition-colors font-body${active ? " font-medium" : ""}`}
              style={chipStyle(active)}
            >
              {val === null ? "Any" : `${val}★+`}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="font-body" style={{ color: "var(--text-muted)" }}>Max price:</span>
        <input
          type="number"
          placeholder="No limit"
          value={filters.maxPrice ?? ""}
          onChange={(e) =>
            onChange({
              ...filters,
              maxPrice: e.target.value ? Number(e.target.value) : null,
            })
          }
          className="w-24 rounded-lg px-2 py-1 text-xs font-body focus:outline-none"
        />
      </div>
    </div>
  );
}
