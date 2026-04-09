"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
}

function findAirport(iata: string): Airport | undefined {
  return airports.find((a) => a.iata === iata);
}

function displayName(airport: Airport): string {
  return `${airport.name} (${airport.city})`;
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
}: AirportSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
        // If user clicked away without selecting, restore display name
        if (value) {
          const airport = findAirport(value);
          setQuery(airport ? displayName(airport) : value);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  const results = open ? filterAirports(query) : [];

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const text = e.target.value;
      setQuery(text);
      setOpen(true);
      if (!text) {
        onChange("");
      }
    },
    [onChange]
  );

  const handleFocus = useCallback(() => {
    setOpen(true);
    // Clear query to raw text when focusing so user can type fresh
    if (value) {
      setQuery("");
    }
  }, [value]);

  const handleSelect = useCallback(
    (airport: Airport) => {
      onChange(airport.iata);
      setQuery(displayName(airport));
      setOpen(false);
      inputRef.current?.blur();
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        setOpen(false);
        if (value) {
          const airport = findAirport(value);
          setQuery(airport ? displayName(airport) : value);
        }
        inputRef.current?.blur();
      } else if (e.key === "Enter" && results.length > 0) {
        e.preventDefault();
        handleSelect(results[0]);
      }
    },
    [results, value, handleSelect]
  );

  const selectedAirport = value ? findAirport(value) : undefined;

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed pr-16"
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
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono">
              {selectedAirport.iata}
            </span>
          </div>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {results.map((airport) => (
            <li
              key={airport.iata}
              className="px-3 py-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between border-b border-gray-50 last:border-0"
              onMouseDown={(e) => {
                // Prevent input blur before click registers
                e.preventDefault();
                handleSelect(airport);
              }}
            >
              <div className="flex flex-col min-w-0 mr-3">
                <span className="text-sm font-medium text-gray-900 truncate">
                  {airport.name}
                </span>
                <span className="text-xs text-gray-500 truncate">
                  {airport.city}, {COUNTRY_NAMES[airport.country] ?? airport.country}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {showCityCode && AIRPORT_TO_CITY[airport.iata] && (
                  <span className="text-xs font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded font-mono">
                    {AIRPORT_TO_CITY[airport.iata]}
                  </span>
                )}
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono">
                  {airport.iata}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && query.trim().length > 0 && results.length === 0 && (
        <div className="absolute z-50 w-full top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div className="px-3 py-3 text-sm text-gray-400 text-center">
            No airports found for &ldquo;{query}&rdquo;
          </div>
        </div>
      )}
    </div>
  );
}
