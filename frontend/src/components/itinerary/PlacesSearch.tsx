"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import type { POI, POICategory, DayPlan } from "@/types/trip";
import { Search, X } from "lucide-react";
import { LocationCard } from "./LocationCard";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

interface Props {
  onAddToDay: (poi: POI, dayNumber: number) => void;
  onSave: (poi: POI) => void;
  locationBias?: { lat: number; lng: number };
  days: DayPlan[];
}

function inferCategory(types: string[]): POICategory {
  if (types.some((t) => ["restaurant", "food", "cafe", "bakery", "bar", "meal_takeaway"].includes(t))) return "restaurant";
  if (types.some((t) => ["tourist_attraction", "museum", "art_gallery", "amusement_park", "zoo", "aquarium", "theme_park"].includes(t))) return "attraction";
  if (types.some((t) => ["park", "natural_feature", "campground", "stadium", "church", "place_of_worship"].includes(t))) return "sightseeing";
  return "activity";
}

interface PlaceDetail {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: POICategory;
  rating?: number;
  photoUrl?: string;
}

export function PlacesSearch({ onAddToDay, onSave, locationBias, days }: Props) {
  const placesLib = useMapsLibrary("places");
  const [query, setQuery] = useState("");
  const [suggestionIds, setSuggestionIds] = useState<string[]>([]);
  const [cardDetails, setCardDetails] = useState<Record<string, PlaceDetail>>({});
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);

  const sessionToken = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const autocomplete = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const mapDiv = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!placesLib) return;
    sessionToken.current = new placesLib.AutocompleteSessionToken();
    autocomplete.current = new placesLib.AutocompleteService();
    if (mapDiv.current) {
      placesService.current = new placesLib.PlacesService(mapDiv.current);
    }
  }, [placesLib]);

  const fetchDetails = useCallback((placeId: string) => {
    if (!placesService.current) return;
    placesService.current.getDetails(
      { placeId, fields: ["place_id", "name", "formatted_address", "geometry", "types", "rating", "photos"] },
      (place: unknown, status: string) => {
        setLoadingIds((prev) => { const next = new Set(prev); next.delete(placeId); return next; });
        if (status !== "OK" || !place) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = place as any;
        setCardDetails((prev) => ({
          ...prev,
          [placeId]: {
            placeId: p.place_id ?? placeId,
            name: p.name ?? "",
            address: p.formatted_address ?? "",
            lat: p.geometry?.location?.lat() ?? 0,
            lng: p.geometry?.location?.lng() ?? 0,
            category: inferCategory(p.types ?? []),
            rating: p.rating ?? undefined,
            photoUrl: p.photos?.[0]?.getUrl({ maxWidth: 480 }) ?? undefined,
          },
        }));
      }
    );
  }, []);

  const doSearch = useCallback((input: string) => {
    if (!autocomplete.current || !sessionToken.current || input.length < 2) {
      setSuggestionIds([]);
      setCardDetails({});
      setLoadingIds(new Set());
      return;
    }
    setSearching(true);
    const request = {
      input,
      sessionToken: sessionToken.current,
      ...(locationBias ? { location: locationBias, radius: 50000 } : {}),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    autocomplete.current.getPlacePredictions(request as any, (preds: unknown, status: string) => {
      setSearching(false);
      if (status !== "OK" || !preds) {
        setSuggestionIds([]);
        return;
      }
      const ids = (preds as Array<{ place_id: string }>).slice(0, 5).map((p) => p.place_id);
      setSuggestionIds(ids);
      setCardDetails({});
      setLoadingIds(new Set(ids));
      if (placesLib) sessionToken.current = new placesLib.AutocompleteSessionToken();
      ids.forEach((id) => fetchDetails(id));
    });
  }, [locationBias, fetchDetails, placesLib]);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => doSearch(value), 300);
  }

  function handleClear() {
    setQuery("");
    setSuggestionIds([]);
    setCardDetails({});
    setLoadingIds(new Set());
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
  }

  function buildPOI(detail: PlaceDetail): POI {
    return {
      id: `search-${detail.placeId}`,
      name: detail.name,
      category: detail.category,
      address: detail.address,
      lat: detail.lat,
      lng: detail.lng,
      booking_required: false,
      claude_note: "",
      theme_tags: [],
      ai_recommended: false,
      photo_url: detail.photoUrl,
      rating: detail.rating,
    };
  }

  const showSkeletons = searching || (suggestionIds.length > 0 && loadingIds.size === suggestionIds.length);

  return (
    <div>
      <div ref={mapDiv} style={{ display: "none" }} />

      <div className="relative mb-3">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-subtle)" }} />
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search any place…"
          className="w-full pl-8 pr-8 py-2 text-sm rounded-lg font-body outline-none"
          style={{
            background: "var(--glass-2)",
            border: "1px solid var(--glass-border-2)",
            color: "var(--text-primary)",
          }}
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-subtle)" }}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {showSkeletons && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-lg p-3" style={{ background: "var(--glass-2)", border: "1px solid var(--glass-border-2)" }}>
              <Skeleton className="h-16 w-full rounded-lg mb-2" />
              <SkeletonText lines={2} />
            </div>
          ))}
        </div>
      )}

      {!showSkeletons && suggestionIds.length > 0 && (
        <div className="space-y-2">
          {suggestionIds.map((placeId) => {
            const detail = cardDetails[placeId];
            if (!detail) {
              return (
                <div key={placeId} className="rounded-lg p-3" style={{ background: "var(--glass-2)", border: "1px solid var(--glass-border-2)" }}>
                  <SkeletonText lines={2} />
                </div>
              );
            }
            return (
              <LocationCard
                key={placeId}
                id={placeId}
                name={detail.name}
                address={detail.address}
                category={detail.category}
                rating={detail.rating}
                photoUrl={detail.photoUrl}
                placeId={detail.placeId}
                onAddToDay={(dayNumber) => onAddToDay(buildPOI(detail), dayNumber)}
                onSave={() => onSave(buildPOI(detail))}
                days={days}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
