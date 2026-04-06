export const AIRPORT_TO_CITY: Record<string, string> = {
  CDG: "PAR", ORY: "PAR", BVA: "PAR",
  LHR: "LON", LGW: "LON", STN: "LON", LTN: "LON", LCY: "LON",
  JFK: "NYC", LGA: "NYC", EWR: "NYC",
  LAX: "LAX", SFO: "SFO", ORD: "CHI", MDW: "CHI",
  NRT: "TYO", HND: "TYO",
  HKG: "HKG", SIN: "SIN", BKK: "BKK", DXB: "DXB",
  FCO: "ROM", CIA: "ROM",
  MAD: "MAD", BCN: "BCN",
  AMS: "AMS", BRU: "BRU", FRA: "FRA", MUC: "MUC",
  SYD: "SYD", MEL: "MEL",
  GRU: "SAO", GIG: "RIO",
  YYZ: "YTO", YVR: "YVR",
};

export function toCityCode(iata: string): string {
  return AIRPORT_TO_CITY[iata.toUpperCase()] ?? iata;
}
