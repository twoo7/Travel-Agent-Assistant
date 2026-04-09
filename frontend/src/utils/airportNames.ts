import airports from "@/data/airports.json";

const NAME_INDEX: Record<string, string> = Object.fromEntries(
  airports.map((a) => [a.iata, a.city])
);

export function iataToCityName(iata: string): string {
  return NAME_INDEX[iata?.toUpperCase()] ?? iata;
}
