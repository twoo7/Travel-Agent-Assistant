"use client";

import { useState, useEffect, useRef, useCallback, useMemo, useId } from "react";
import airportsData from "@/data/airports.json";
import { AIRPORT_TO_CITY, CITY_TO_AIRPORTS, getCityAirports } from "@/utils/cityCodeMap";
import { COUNTRY_NAMES } from "@/utils/countryNames";

interface Airport {
  iata: string;
  name: string;
  city: string;
  country: string;
  continent: string;
  lat: number;
  lng: number;
}

const airports: Airport[] = airportsData as Airport[];

interface CityGroup {
  type: "city";
  cityCode: string;
  iatas: string[];
  cityName: string;
}

type SearchResult = { type: "airport"; airport: Airport } | CityGroup;

interface AirportSearchProps {
  label: string;
  value: string;
  onChange: (iata: string) => void;
  onAirportsChange?: (airports: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  showCityCode?: boolean;
  id?: string;
}

function findAirport(iata: string): Airport | undefined {
  return airports.find((a) => a.iata === iata);
}

function displayName(airport: Airport): string {
  return airport.city;
}

function filterAirports(query: string): Airport[] {
  if (!query.trim()) return [];

  const q = query.trim().toLowerCase();
  const isThreeChars = q.length === 3;

  const exactIata: Airport[] = [];
  const rest: Airport[] = [];

  for (const airport of airports) {
    const matchesIata = airport.iata.toLowerCase().includes(q);
    const matchesName = airport.name.toLowerCase().includes(q);
    const matchesCity = airport.city.toLowerCase().includes(q);
    const countryName = COUNTRY_NAMES[airport.country] ?? "";
    const matchesCountry = countryName.toLowerCase().includes(q);

    if (matchesIata || matchesName || matchesCity || matchesCountry) {
      if (isThreeChars && airport.iata.toLowerCase() === q) {
        exactIata.push(airport);
      } else {
        rest.push(airport);
      }
    }
  }

  return [...exactIata, ...rest].slice(0, 8);
}

function buildResults(query: string): SearchResult[] {
  const matched = filterAirports(query);

  // Group airports by city code to find multi-airport cities
  const cityMap = new Map<string, Airport[]>();
  for (const airport of matched) {
    const city = AIRPORT_TO_CITY[airport.iata];
    if (city && CITY_TO_AIRPORTS[city] && CITY_TO_AIRPORTS[city].length > 1) {
      if (!cityMap.has(city)) cityMap.set(city, []);
      cityMap.get(city)!.push(airport);
    }
  }

  const cityGroups: CityGroup[] = [];
  const seenCities = new Set<string>();
  for (const airport of matched) {
    const city = AIRPORT_TO_CITY[airport.iata];
    if (city && cityMap.has(city) && !seenCities.has(city)) {
      seenCities.add(city);
      const groupAirports = cityMap.get(city)!;
      cityGroups.push({
        type: "city",
        cityCode: city,
        iatas: CITY_TO_AIRPORTS[city],
        cityName: groupAirports[0].city,
      });
    }
  }

  const results: SearchResult[] = [
    ...cityGroups,
    ...matched.map((airport) => ({ type: "airport" as const, airport })),
  ];
  return results;
}

export default function AirportSearch({
  label,
  value,
  onChange,
  onAirportsChange,
  placeholder = "City or airport name",
  disabled = false,
  showCityCode = false,
  id,
}: AirportSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const listboxId = useRef(`airport-listbox-${id ?? generatedId}`);

  // Sync query when value changes externally
  useEffect(() => {
    if (value) {
      const airport = findAirport(value);
      setQuery(airport ? displayName(airport) : value);
    } else {
      setQuery("");
    }
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setActiveIndex(-1);
        if (value) {
          const airport = findAirport(value);
          setQuery(airport ? displayName(airport) : value);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  const results = useMemo(() => (open ? buildResults(query) : []), [open, query]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const text = e.target.value;
      setQuery(text);
      setOpen(true);
      setActiveIndex(-1);
      if (!text) {
        onChange("");
        onAirportsChange?.([]);
      }
    },
    [onChange, onAirportsChange]
  );

  const handleFocus = useCallback(() => { setOpen(true); }, []);

  const handleSelectAirport = useCallback(
    (airport: Airport) => {
      onChange(airport.iata);
      onAirportsChange?.(getCityAirports(airport.iata));
      setQuery(displayName(airport));
      setOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    },
    [onChange, onAirportsChange]
  );

  const handleSelectCityGroup = useCallback(
    (group: CityGroup) => {
      const primaryIata = group.iatas[0];
      const primaryAirport = findAirport(primaryIata);
      onChange(primaryIata);
      onAirportsChange?.(group.iatas);
      setQuery(primaryAirport ? displayName(primaryAirport) : group.cityName);
      setOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    },
    [onChange, onAirportsChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        setOpen(false);
        setActiveIndex(-1);
        if (value) {
          const airport = findAirport(value);
          setQuery(airport ? displayName(airport) : value);
        }
        inputRef.current?.blur();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const target = activeIndex >= 0 ? results[activeIndex] : results[0];
        if (!target) return;
        if (target.type === "city") handleSelectCityGroup(target);
        else handleSelectAirport(target.airport);
      }
    },
    [results, value, handleSelectAirport, handleSelectCityGroup, activeIndex]
  );

  const selectedAirport = value ? findAirport(value) : undefined;
  const activeOptionId =
    activeIndex >= 0 && results[activeIndex]
      ? `${listboxId.current}-option-${activeIndex}`
      : undefined;

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="block text-xs font-medium mb-1 font-body" style={{ color: "var(--text-muted)" }}>
        {label}
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={listboxId.current}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          className={[
            "w-full px-3 py-2.5 rounded-lg text-sm font-body",
            "focus:outline-none",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-colors duration-150 pr-16",
          ]
            .filter(Boolean)
            .join(" ")}
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          autoComplete="off"
        />

        {selectedAirport && !open && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <span className="text-xs font-bold px-1.5 py-0.5 rounded font-mono" style={{ color: "var(--accent)", background: "rgba(224,122,95,0.1)" }}>
              {selectedAirport.iata}
            </span>
          </div>
        )}
      </div>

      {open && results.length > 0 && (
        <ul
          id={listboxId.current}
          role="listbox"
          aria-label={`Airport options for ${label}`}
          className="absolute z-50 w-full top-full mt-1 rounded-xl shadow-card-hover overflow-hidden max-h-64 overflow-y-auto"
          style={{ background: "var(--dropdown-bg)", border: "1px solid var(--glass-border-2)", backdropFilter: "blur(12px)" }}
        >
          {results.map((result, idx) => {
            const isActive = activeIndex === idx;
            const bg = isActive ? "rgba(224,122,95,0.15)" : "transparent";
            const border = "1px solid var(--glass-border-1)";

            if (result.type === "city") {
              return (
                <li
                  key={`city-${result.cityCode}`}
                  id={`${listboxId.current}-option-${idx}`}
                  role="option"
                  aria-selected={isActive}
                  className="px-3 py-2.5 cursor-pointer flex items-center justify-between last:border-0 transition-colors duration-100"
                  style={{ borderBottom: border, background: bg }}
                  onMouseDown={(e) => { e.preventDefault(); handleSelectCityGroup(result); }}
                  onMouseEnter={() => setActiveIndex(idx)}
                >
                  <div className="flex flex-col min-w-0 mr-3">
                    <span className="text-sm font-medium truncate font-body" style={{ color: "var(--text-primary)" }}>
                      {result.cityName} — all airports
                    </span>
                    <span className="text-xs truncate font-body" style={{ color: "var(--text-muted)" }}>
                      Search across {result.iatas.join(", ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end max-w-[40%]">
                    {result.iatas.map((iata) => (
                      <span key={iata} className="text-xs font-bold px-1.5 py-0.5 rounded font-mono" style={{ color: "var(--success)", background: "rgba(107,144,128,0.12)" }}>
                        {iata}
                      </span>
                    ))}
                  </div>
                </li>
              );
            }

            const { airport } = result;
            return (
              <li
                key={airport.iata}
                id={`${listboxId.current}-option-${idx}`}
                role="option"
                aria-selected={isActive}
                className="px-3 py-2.5 cursor-pointer flex items-center justify-between last:border-0 transition-colors duration-100"
                style={{ borderBottom: border, background: bg }}
                onMouseDown={(e) => { e.preventDefault(); handleSelectAirport(airport); }}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                <div className="flex flex-col min-w-0 mr-3">
                  <span className="text-sm font-medium truncate font-body" style={{ color: "var(--text-primary)" }}>
                    {airport.name}
                  </span>
                  <span className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                    {airport.city}, {COUNTRY_NAMES[airport.country] ?? airport.country}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {showCityCode && AIRPORT_TO_CITY[airport.iata] && (
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded font-mono" style={{ color: "var(--success)", background: "rgba(107,144,128,0.1)" }}>
                      {AIRPORT_TO_CITY[airport.iata]}
                    </span>
                  )}
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded font-mono" style={{ color: "var(--accent)", background: "rgba(224,122,95,0.1)" }}>
                    {airport.iata}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {open && query.trim().length > 0 && results.length === 0 && (
        <div className="absolute z-50 w-full top-full mt-1 rounded-xl shadow-card-hover overflow-hidden" style={{ background: "var(--dropdown-bg)", border: "1px solid var(--glass-border-2)", backdropFilter: "blur(12px)" }}>
          <div className="px-3 py-3 text-sm text-center font-body" style={{ color: "var(--text-muted)" }}>
            No airports found for &ldquo;{query}&rdquo;
          </div>
        </div>
      )}
    </div>
  );
}
