export type TransportMode = "flight" | "train" | "ferry" | "car";

export interface AirportRecord {
  iata: string;
  name: string;
  city: string;
  country: string;
  continent: string;
  lat: number;
  lng: number;
}

export interface FerryRoute {
  id: string;
  from_countries: string[];
  to_countries: string[];
  from_cities: string[];
  to_cities: string[];
  operators: string[];
  crossing_mins: number;
  notes: string;
}

export interface ModeAvailability {
  mode: TransportMode;
  available: boolean;
  recommended?: boolean;
  label: string;
  hint?: string;
}

export interface TransportAvailabilityResult {
  modes: ModeAvailability[];
  primaryHint?: string;
}

/**
 * Countries/territories that are island-only — no land border crossings possible.
 * A crossing between two of these (or from/to one of these) is water-only.
 */
const ISLAND_COUNTRIES = new Set([
  "GB", // Great Britain + N. Ireland
  "IE", // Ireland
  "IS", // Iceland
  "MT", // Malta
  "CY", // Cyprus
  "JP", // Japan
  "PH", // Philippines
  "ID", // Indonesia
  "SG", // Singapore
  "HK", // Hong Kong SAR
  "MO", // Macau SAR
  "TW", // Taiwan
  "NZ", // New Zealand
  "FJ", // Fiji
  "MV", // Maldives
  "MU", // Mauritius
  "MG", // Madagascar
  "LK", // Sri Lanka
  "MO", // Macau
]);

/**
 * Haversine formula — returns distance in kilometres between two lat/lng points.
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Returns true if a ferry route covers a crossing between the two given airports.
 * Matching is done by country pair (bidirectional) or by city name inclusion.
 */
function findFerryRoute(
  origin: AirportRecord,
  destination: AirportRecord,
  ferryRoutes: FerryRoute[]
): FerryRoute | undefined {
  return ferryRoutes.find((route) => {
    const forwardCountry =
      route.from_countries.includes(origin.country) &&
      route.to_countries.includes(destination.country);
    const reverseCountry =
      route.from_countries.includes(destination.country) &&
      route.to_countries.includes(origin.country);
    const countryMatch = forwardCountry || reverseCountry;

    const forwardCity =
      route.from_cities.some(
        (c) =>
          c.toLowerCase() === origin.city.toLowerCase()
      ) &&
      route.to_cities.some(
        (c) =>
          c.toLowerCase() === destination.city.toLowerCase()
      );
    const reverseCity =
      route.from_cities.some(
        (c) =>
          c.toLowerCase() === destination.city.toLowerCase()
      ) &&
      route.to_cities.some(
        (c) =>
          c.toLowerCase() === origin.city.toLowerCase()
      );
    const cityMatch = forwardCity || reverseCity;

    return countryMatch || cityMatch;
  });
}

/**
 * Returns true if travelling between these two airports would require crossing water
 * with no land route available (i.e. at least one endpoint is island-only).
 */
function isWaterOnlyCrossing(origin: AirportRecord, destination: AirportRecord): boolean {
  return ISLAND_COUNTRIES.has(origin.country) || ISLAND_COUNTRIES.has(destination.country);
}

/**
 * Computes which transport modes are realistically available for a given leg,
 * along with smart labels and hints to help the user choose.
 */
export function getTransportAvailability(
  originIata: string,
  destinationIata: string,
  airports: AirportRecord[],
  ferryRoutes: FerryRoute[]
): TransportAvailabilityResult {
  const origin = airports.find((a) => a.iata === originIata);
  const destination = airports.find((a) => a.iata === destinationIata);

  // If either airport is unknown, only flight is possible
  if (!origin || !destination) {
    return {
      modes: [
        {
          mode: "flight",
          available: true,
          recommended: true,
          label: "Flight",
          hint: "Airport data unavailable for one or both airports.",
        },
      ],
      primaryHint: "Only flight available for this route — no land or sea connection.",
    };
  }

  // Same airport — no transport needed
  if (originIata === destinationIata) {
    return { modes: [] };
  }

  const distanceKm = haversineKm(
    origin.lat,
    origin.lng,
    destination.lat,
    destination.lng
  );

  const sameContinent = origin.continent === destination.continent;
  const waterOnly = isWaterOnlyCrossing(origin, destination);
  const matchedFerry = findFerryRoute(origin, destination, ferryRoutes);

  // ── Flight ────────────────────────────────────────────────────────────────
  const flightMode: ModeAvailability = {
    mode: "flight",
    available: true,
    label: "Flight",
  };

  // ── Train ─────────────────────────────────────────────────────────────────
  const trainAvailable = sameContinent && distanceKm < 900;
  const trainRecommended = trainAvailable && distanceKm < 600;
  const trainHours = Math.round(distanceKm / 100);
  const trainMode: ModeAvailability = {
    mode: "train",
    available: trainAvailable,
    recommended: trainRecommended,
    label: trainAvailable
      ? `~${trainHours}h by rail`
      : "Train not available",
    hint: trainRecommended
      ? "Train recommended — faster door-to-door than flying for this distance."
      : undefined,
  };

  // ── Ferry ─────────────────────────────────────────────────────────────────
  // Available if: a known ferry route matches, OR both countries are islands
  // with a short crossing (same-country island hop)
  const ferryFromIslandHop =
    waterOnly &&
    origin.country === destination.country &&
    distanceKm < 500;

  const ferryAvailable = !!matchedFerry || ferryFromIslandHop;
  let ferryLabel = "Ferry";
  if (matchedFerry) {
    const operator = matchedFerry.operators[0];
    const hours = Math.floor(matchedFerry.crossing_mins / 60);
    const mins = matchedFerry.crossing_mins % 60;
    const durationStr =
      hours > 0
        ? mins > 0
          ? `~${hours}h ${mins}m`
          : `~${hours}h`
        : `~${mins}m`;
    ferryLabel = `${operator} · ${durationStr} crossing`;
  }
  const ferryMode: ModeAvailability = {
    mode: "ferry",
    available: ferryAvailable,
    label: ferryAvailable ? ferryLabel : "No ferry connection",
    hint:
      ferryAvailable && distanceKm < 200
        ? "Ferry is a great option here — enjoy the crossing!"
        : undefined,
  };

  // ── Car / Bus ─────────────────────────────────────────────────────────────
  const carAvailable =
    sameContinent && distanceKm < 600 && !waterOnly;
  const driveHours = Math.round(distanceKm / 80);
  const carMode: ModeAvailability = {
    mode: "car",
    available: carAvailable,
    label: carAvailable
      ? `~${driveHours}h drive`
      : "Drive not available",
  };

  // ── Primary hint ──────────────────────────────────────────────────────────
  let primaryHint: string | undefined;

  const anyAlternative =
    trainAvailable || ferryAvailable || carAvailable;

  if (!anyAlternative) {
    primaryHint =
      "Only flight available for this route — no land or sea connection.";
  } else if (trainRecommended) {
    primaryHint =
      "Train recommended — faster door-to-door than flying for this distance.";
  } else if (ferryAvailable && distanceKm < 200) {
    primaryHint = "Ferry is a great option here — enjoy the crossing!";
  }

  // Set flight as recommended only when no better alternative exists
  flightMode.recommended = !trainRecommended;

  const modes: ModeAvailability[] = [
    flightMode,
    trainMode,
    ferryMode,
    carMode,
  ];

  return { modes, primaryHint };
}
