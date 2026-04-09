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

export function FilterBar(props: Props) {
  if (props.variant === "flights") {
    const { filters, onChange } = props;
    return (
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-muted font-body">Max stops:</span>
          {[
            { label: "Any", value: null },
            { label: "Nonstop", value: 0 },
            { label: "1 stop", value: 1 },
          ].map((opt) => (
            <button
              key={opt.label}
              onClick={() => onChange({ ...filters, maxStops: opt.value })}
              className={`px-2 py-1 rounded-full transition-colors font-body ${
                filters.maxStops === opt.value
                  ? "bg-primary/10 text-primary font-medium"
                  : "bg-gray-100 text-charcoal/70 hover:bg-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted font-body">Max price:</span>
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
            className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-xs font-body focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
      </div>
    );
  }

  const { filters, onChange } = props;
  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="flex items-center gap-1.5">
        <span className="text-muted font-body">Min rating:</span>
        {[null, 3, 4, 5].map((val) => (
          <button
            key={val ?? "any"}
            onClick={() => onChange({ ...filters, minRating: val })}
            className={`px-2 py-1 rounded-full transition-colors font-body ${
              filters.minRating === val
                ? "bg-primary/10 text-primary font-medium"
                : "bg-gray-100 text-charcoal/70 hover:bg-gray-200"
            }`}
          >
            {val === null ? "Any" : `${val}★+`}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-muted font-body">Max price:</span>
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
          className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-xs font-body focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
      </div>
    </div>
  );
}
