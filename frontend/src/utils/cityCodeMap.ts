export const AIRPORT_TO_CITY: Record<string, string> = {
  CDG: "PAR", ORY: "PAR", BVA: "PAR",
  LHR: "LON", LGW: "LON", STN: "LON", LTN: "LON", LCY: "LON",
  JFK: "NYC", LGA: "NYC", EWR: "NYC",
  LAX: "LAX", SFO: "SFO", ORD: "CHI", MDW: "CHI",
  NRT: "TYO", HND: "TYO",
  KIX: "OSA", ITM: "OSA", UKB: "OSA",
  ICN: "SEL", GMP: "SEL",
  CJU: "CJU",
  PUS: "PUS",
  TPE: "TPE", TSA: "TPE",
  PEK: "BJS", PKX: "BJS",
  PVG: "SHA", SHA: "SHA",
  HKG: "HKG", SIN: "SIN", BKK: "BKK", DXB: "DXB",
  FCO: "ROM", CIA: "ROM",
  MAD: "MAD", BCN: "BCN",
  AMS: "AMS", BRU: "BRU", FRA: "FRA", MUC: "MUC",
  SYD: "SYD", MEL: "MEL",
  GRU: "SAO", GIG: "RIO",
  YYZ: "YTO", YVR: "YVR",
};

export const CITY_TO_AIRPORTS: Record<string, string[]> = {
  PAR: ["CDG", "ORY", "BVA"],
  LON: ["LHR", "LGW", "STN", "LTN", "LCY"],
  NYC: ["JFK", "LGA", "EWR"],
  CHI: ["ORD", "MDW"],
  TYO: ["NRT", "HND"],
  OSA: ["KIX", "ITM", "UKB"],
  SEL: ["ICN", "GMP"],
  TPE: ["TPE", "TSA"],
  BJS: ["PEK", "PKX"],
  SHA: ["PVG", "SHA"],
  ROM: ["FCO", "CIA"],
  YTO: ["YYZ"],
};

export function toCityCode(iata: string): string {
  return AIRPORT_TO_CITY[iata.toUpperCase()] ?? iata;
}

export function getCityAirports(iata: string): string[] {
  const city = AIRPORT_TO_CITY[iata.toUpperCase()];
  if (!city) return [iata];
  return CITY_TO_AIRPORTS[city] ?? [iata];
}
