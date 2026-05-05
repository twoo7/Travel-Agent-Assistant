"use client";

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

function chipClass(active: boolean): string {
  return active
    ? "font-medium bg-teal-light text-teal"
    : "bg-surface2 text-ink-muted";
}

export function FilterBar(props: Props) {
  if (props.variant === "flights") {
    const { filters, onChange } = props;
    return (
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-body text-ink-muted">Max stops:</span>
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
                className={`px-2 py-1 rounded-full transition-colors font-body ${chipClass(active)}`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-body text-ink-muted">Max price:</span>
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
            className="w-24 rounded-lg px-2 py-1 text-xs font-body focus:outline-none bg-surface border border-border focus:border-teal focus:ring-2 focus:ring-teal/20 text-ink"
          />
        </div>
      </div>
    );
  }

  const { filters, onChange } = props;
  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="flex items-center gap-1.5">
        <span className="font-body text-ink-muted">Min rating:</span>
        {[null, 3, 4, 5].map((val) => {
          const active = filters.minRating === val;
          return (
            <button
              key={val ?? "any"}
              onClick={() => onChange({ ...filters, minRating: val })}
              className={`px-2 py-1 rounded-full transition-colors font-body ${chipClass(active)}`}
            >
              {val === null ? "Any" : `${val}★+`}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="font-body text-ink-muted">Max price:</span>
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
          className="w-24 rounded-lg px-2 py-1 text-xs font-body focus:outline-none bg-surface border border-border focus:border-teal focus:ring-2 focus:ring-teal/20 text-ink"
        />
      </div>
    </div>
  );
}
