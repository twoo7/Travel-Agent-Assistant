"use client";

import { useState, useEffect, useRef, useCallback, useMemo, useId } from "react";
import airportsData from "@/data/airports.json";
import { AIRPORT_TO_CITY } from "@/utils/cityCodeMap";
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

interface AirportSearchProps {
  label: string;
  value: string;
  onChange: (iata: string) => void;
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

export default function AirportSearch({
  label,
  value,
  onChange,
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

  const results = useMemo(() => (open ? filterAirports(query) : []), [open, query]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const text = e.target.value;
      setQuery(text);
      setOpen(true);
      setActiveIndex(-1);
      if (!text) {
        onChange("");
      }
    },
    [onChange]
  );

  const handleFocus = useCallback(() => {
    setOpen(true);
    if (value) {
      setQuery("");
    }
  }, [value]);

  const handleSelect = useCallback(
    (airport: Airport) => {
      onChange(airport.iata);
      setQuery(displayName(airport));
      setOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    },
    [onChange]
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
        if (target) handleSelect(target);
      }
    },
    [results, value, handleSelect, activeIndex]
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
          style={{ background: "rgba(15,41,55,0.95)", border: "1px solid var(--glass-border-2)", backdropFilter: "blur(12px)" }}
        >
          {results.map((airport, idx) => (
            <li
              key={airport.iata}
              id={`${listboxId.current}-option-${idx}`}
              role="option"
              aria-selected={activeIndex === idx}
              className="px-3 py-2.5 cursor-pointer flex items-center justify-between last:border-0 transition-colors duration-100"
              style={{
                borderBottom: "1px solid var(--glass-border-1)",
                background: activeIndex === idx ? "rgba(224,122,95,0.15)" : "transparent",
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(airport);
              }}
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
          ))}
        </ul>
      )}

      {open && query.trim().length > 0 && results.length === 0 && (
        <div className="absolute z-50 w-full top-full mt-1 rounded-xl shadow-card-hover overflow-hidden" style={{ background: "rgba(15,41,55,0.95)", border: "1px solid var(--glass-border-2)", backdropFilter: "blur(12px)" }}>
          <div className="px-3 py-3 text-sm text-center font-body" style={{ color: "var(--text-muted)" }}>
            No airports found for &ldquo;{query}&rdquo;
          </div>
        </div>
      )}
    </div>
  );
}
