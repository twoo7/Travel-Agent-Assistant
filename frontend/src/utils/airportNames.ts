import airports from "@/data/airports.json";

const NAME_INDEX: Record<string, string> = Object.fromEntries(
  airports.map((a) => [a.iata, a.city])
);

const COUNTRY_INDEX: Record<string, string> = Object.fromEntries(
  airports.map((a) => [a.iata, a.country])
);

const AIRPORT_NAME_INDEX: Record<string, string> = Object.fromEntries(
  airports.map((a) => [a.iata, a.name])
);

export function iataToCityName(iata: string): string {
  return NAME_INDEX[iata?.toUpperCase()] ?? iata;
}

export function getAirportCountry(iata: string): string {
  return COUNTRY_INDEX[iata?.toUpperCase()] ?? "";
}

export function getAirportName(iata: string): string {
  return AIRPORT_NAME_INDEX[iata?.toUpperCase()] ?? iata;
}
