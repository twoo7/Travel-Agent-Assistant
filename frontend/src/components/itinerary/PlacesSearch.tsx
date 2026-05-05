"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import type { POI, POICategory, DayPlan } from "@/types/trip";
import { Search, X, MapPin } from "lucide-react";
import { LocationCard } from "./LocationCard";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

interface Props {
  onAddToDay: (poi: POI, dayNumber: number) => void;
  onSave: (poi: POI) => void;
  locationBias?: { lat: number; lng: number };
  days: DayPlan[];
  savedIds?: Set<string>;
  onRemoveSaved?: (id: string) => void;
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
  reviewCount?: number;
  priceLevel?: number;
  openingHours?: string;
  photoUrl?: string;
  photoUrls?: string[];
}

interface Prediction {
  placeId: string;
  mainText: string;
  secondaryText: string;
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
    photo_urls: detail.photoUrls,
    rating: detail.rating,
    review_count: detail.reviewCount,
    price_level: detail.priceLevel,
    opening_hours: detail.openingHours,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parsePriceLevel(level: number | undefined): number | undefined {
  if (level == null) return undefined;
  return level;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parsePlaceNew(place: any): PlaceDetail {
  const weekdays: string[] = place.regularOpeningHours?.weekdayDescriptions ?? [];
  const openingHours = weekdays.length > 0 ? weekdays.join("; ") : undefined;
  const lat = typeof place.location?.lat === "function" ? place.location.lat() : (place.location?.lat ?? 0);
  const lng = typeof place.location?.lng === "function" ? place.location.lng() : (place.location?.lng ?? 0);
  return {
    placeId: place.id ?? "",
    name: place.displayName ?? "",
    address: place.formattedAddress ?? "",
    lat,
    lng,
    category: inferCategory(place.types ?? []),
    rating: place.rating ?? undefined,
    reviewCount: place.userRatingCount ?? undefined,
    priceLevel: place.priceLevel != null ? Number(place.priceLevel) : undefined,
    openingHours,
    photoUrl: place.photos?.[0]?.getURI({ maxWidthPx: 800 }) ?? undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    photoUrls: place.photos ? (place.photos as any[]).slice(0, 5).map((ph: any) => ph.getURI({ maxWidthPx: 800 })) : undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parsePlaceResult(p: any): PlaceDetail {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const weekdays: string[] = p.opening_hours?.weekday_text ?? [];
  const openingHours = weekdays.length > 0 ? weekdays.join("; ") : undefined;

  return {
    placeId: p.place_id ?? "",
    name: p.name ?? "",
    address: p.formatted_address ?? p.vicinity ?? "",
    lat: p.geometry?.location?.lat() ?? 0,
    lng: p.geometry?.location?.lng() ?? 0,
    category: inferCategory(p.types ?? []),
    rating: p.rating ?? undefined,
    reviewCount: p.user_ratings_total ?? undefined,
    priceLevel: parsePriceLevel(p.price_level),
    openingHours,
    photoUrl: p.photos?.[0]?.getUrl({ maxWidth: 800 }) ?? undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    photoUrls: p.photos ? (p.photos as any[]).slice(0, 5).map((ph: any) => ph.getUrl({ maxWidth: 800 })) : undefined,
  };
}

export function PlacesSearch({ onAddToDay, onSave, locationBias, days, savedIds, onRemoveSaved }: Props) {
  const placesLib = useMapsLibrary("places");

  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const [primaryDetail, setPrimaryDetail] = useState<PlaceDetail | null>(null);
  const [relatedResults, setRelatedResults] = useState<PlaceDetail[]>([]);
  const [loadingPrimary, setLoadingPrimary] = useState(false);
  const [loadingRelated, setLoadingRelated] = useState(false);

  const sessionToken = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const autocomplete = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const suggestionsRef = useRef<Record<string, any>>({});
  const mapDiv = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!placesLib) return;
    sessionToken.current = new placesLib.AutocompleteSessionToken();
    autocomplete.current = new placesLib.AutocompleteService();
    if (mapDiv.current) {
      placesService.current = new placesLib.PlacesService(mapDiv.current);
    }
  }, [placesLib]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const fetchPredictions = useCallback(async (input: string) => {
    if (!placesLib || input.length < 2) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    // Try new AutocompleteSuggestion API (Places API New)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newApi = (placesLib as any).AutocompleteSuggestion;
    if (newApi) {
      try {
        if (!sessionToken.current) {
          sessionToken.current = new placesLib.AutocompleteSessionToken();
        }
        const { suggestions } = await newApi.fetchAutocompleteSuggestions({
          input,
          sessionToken: sessionToken.current,
          ...(locationBias ? { locationBias: { circle: { center: locationBias, radius: 50000 } } } : {}),
        });
        suggestionsRef.current = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parsed = (suggestions as any[]).slice(0, 6).map((s: any) => {
          const p = s.placePrediction;
          suggestionsRef.current[p.placeId] = s;
          return {
            placeId: p.placeId as string,
            mainText: (p.mainText?.text ?? p.text?.text ?? "") as string,
            secondaryText: (p.secondaryText?.text ?? "") as string,
          };
        });
        setPredictions(parsed);
        setShowDropdown(parsed.length > 0);
        return;
      } catch (err) {
        console.error("[PlacesSearch] AutocompleteSuggestion failed", err);
        // fall through to legacy
      }
    }

    // Legacy AutocompleteService fallback
    if (!autocomplete.current || !sessionToken.current) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }
    const request = {
      input,
      sessionToken: sessionToken.current,
      ...(locationBias ? { location: locationBias, radius: 50000 } : {}),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    autocomplete.current.getPlacePredictions(request as any, (preds: unknown, status: string) => {
      if (status !== "OK" || !preds) {
        console.error("[PlacesSearch] getPlacePredictions failed", { status, input });
        setPredictions([]);
        setShowDropdown(false);
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed = (preds as any[]).slice(0, 6).map((p) => ({
        placeId: p.place_id as string,
        mainText: (p.structured_formatting?.main_text ?? p.description) as string,
        secondaryText: (p.structured_formatting?.secondary_text ?? "") as string,
      }));
      setPredictions(parsed);
      setShowDropdown(parsed.length > 0);
    });
  }, [locationBias, placesLib]);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (!value.trim()) {
      setPredictions([]);
      setShowDropdown(false);
      setPrimaryDetail(null);
      setRelatedResults([]);
      return;
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => fetchPredictions(value), 200);
  }

  function handleSelectPrediction(prediction: Prediction) {
    setQuery(prediction.mainText);
    setShowDropdown(false);
    setPredictions([]);
    setPrimaryDetail(null);
    setRelatedResults([]);

    if (!placesLib) return;

    sessionToken.current = new placesLib.AutocompleteSessionToken();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storedSuggestion = suggestionsRef.current[prediction.placeId] as any;
    if (storedSuggestion?.placePrediction) {
      // New API path: use the cached PlacePrediction to fetch full details
      setLoadingPrimary(true);
      const place = storedSuggestion.placePrediction.toPlace();
      place.fetchFields({
        fields: ["id", "displayName", "formattedAddress", "location", "types", "rating", "userRatingCount", "priceLevel", "regularOpeningHours", "photos"],
      }).then(() => {
        setLoadingPrimary(false);
        setPrimaryDetail(parsePlaceNew(place));
      }).catch((err: unknown) => {
        console.error("[PlacesSearch] fetchFields failed", err);
        setLoadingPrimary(false);
      });
    } else if (placesService.current) {
      // Legacy getDetails fallback
      setLoadingPrimary(true);
      placesService.current.getDetails(
        { placeId: prediction.placeId, fields: ["place_id", "name", "formatted_address", "geometry", "types", "rating", "user_ratings_total", "price_level", "opening_hours", "photos"] },
        (place: unknown, status: string) => {
          setLoadingPrimary(false);
          if (status !== "OK" || !place) {
            console.error("[PlacesSearch] getDetails failed", { status });
            return;
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setPrimaryDetail(parsePlaceResult(place as any));
        }
      );
    }

    if (!placesService.current) return;

    setLoadingRelated(true);
    const searchQuery = `${prediction.mainText} ${prediction.secondaryText}`.trim();
    placesService.current.textSearch(
      {
        query: searchQuery,
        ...(locationBias ? { location: locationBias, radius: 5000 } : {}),
      },
      (results: unknown, status: string) => {
        setLoadingRelated(false);
        if (status !== "OK" || !results) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parsed = (results as any[])
          .slice(0, 5)
          .filter((r) => r.place_id !== prediction.placeId)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((r: any) => parsePlaceResult(r));
        setRelatedResults(parsed);
      }
    );
  }

  function handleClear() {
    setQuery("");
    setPredictions([]);
    setShowDropdown(false);
    setPrimaryDetail(null);
    setRelatedResults([]);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
  }

  const hasResults = primaryDetail != null || relatedResults.length > 0;
  const isLoading = loadingPrimary || loadingRelated;

  return (
    <div ref={containerRef}>
      <div ref={mapDiv} style={{ display: "none" }} />

      {/* Input with dropdown */}
      <div className="relative mb-3">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-subtle" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => { if (predictions.length > 0) setShowDropdown(true); }}
          onKeyDown={(e) => { if (e.key === "Escape") setShowDropdown(false); }}
          placeholder="Search any place…"
          className="w-full pl-8 pr-8 py-2 text-sm rounded-lg font-body outline-none bg-surface border border-border focus:border-teal focus:ring-2 focus:ring-teal/20 text-ink"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-subtle"
            aria-label="Clear search"
          >
            <X size={13} />
          </button>
        )}

        {/* Dropdown predictions */}
        {showDropdown && predictions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden shadow-lg z-30 bg-surface border border-border">
            {predictions.map((pred) => (
              <button
                key={pred.placeId}
                onClick={() => handleSelectPrediction(pred)}
                className="w-full flex items-start gap-2 px-3 py-2.5 text-left text-xs font-body transition-colors hover:bg-surface2 border-b border-border text-ink"
              >
                <MapPin size={11} className="shrink-0 mt-0.5 text-ink-subtle" />
                <div className="min-w-0">
                  <div className="font-medium truncate">{pred.mainText}</div>
                  {pred.secondaryText && (
                    <div className="truncate mt-0.5 text-ink-muted">{pred.secondaryText}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading state */}
      {!hasResults && isLoading && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-lg p-3 bg-surface border border-border">
              <Skeleton className="h-16 w-full rounded-lg mb-2" />
              <SkeletonText lines={2} />
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {hasResults && (
        <div className="space-y-2">
          {/* Primary result */}
          {loadingPrimary && !primaryDetail && (
            <div className="rounded-lg p-3 bg-surface border border-border">
              <Skeleton className="h-16 w-full rounded-lg mb-2" />
              <SkeletonText lines={2} />
            </div>
          )}
          {primaryDetail && (() => {
            const savedKey = `search-${primaryDetail.placeId}`;
            const isSaved = savedIds?.has(savedKey) ?? false;
            return (
              <LocationCard
                key={primaryDetail.placeId}
                id={primaryDetail.placeId}
                name={primaryDetail.name}
                address={primaryDetail.address}
                category={primaryDetail.category}
                rating={primaryDetail.rating}
                photoUrl={primaryDetail.photoUrl}
                placeId={primaryDetail.placeId}
                isSaved={isSaved}
                onAddToDay={(dayNumber) => onAddToDay(buildPOI(primaryDetail), dayNumber)}
                onSave={isSaved ? undefined : () => onSave(buildPOI(primaryDetail))}
                onRemove={isSaved ? () => onRemoveSaved?.(savedKey) : undefined}
                days={days}
              />
            );
          })()}

          {/* Related results */}
          {relatedResults.length > 0 && (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-[2px] mt-3 mb-1 font-body px-1 text-ink-subtle">
                Nearby places
              </p>
              {relatedResults.map((detail) => {
                const savedKey = `search-${detail.placeId}`;
                const isSaved = savedIds?.has(savedKey) ?? false;
                return (
                  <LocationCard
                    key={detail.placeId}
                    id={detail.placeId}
                    name={detail.name}
                    address={detail.address}
                    category={detail.category}
                    rating={detail.rating}
                    photoUrl={detail.photoUrl}
                    placeId={detail.placeId}
                    isSaved={isSaved}
                    onAddToDay={(dayNumber) => onAddToDay(buildPOI(detail), dayNumber)}
                    onSave={isSaved ? undefined : () => onSave(buildPOI(detail))}
                    onRemove={isSaved ? () => onRemoveSaved?.(savedKey) : undefined}
                    days={days}
                  />
                );
              })}
              {loadingRelated && (
                <div className="rounded-lg p-3 bg-surface border border-border">
                  <SkeletonText lines={2} />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
