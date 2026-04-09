import type {
  TripContext,
  FlightOffer,
  HotelOffer,
  POI,
  DayItem,
  RouteSegment,
  ExportRequest,
} from "@/types/trip";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} failed: ${res.status} — ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: (): Promise<{ status: string }> =>
    fetch(`${BASE}/health`).then((r) => r.json()),

  searchFlights: (params: {
    trip_context: TripContext;
    leg_number: number;
    origin: string;
    destination: string;
    departure_date: string;
    adults: number;
    max_results?: number;
    currency?: string;
  }): Promise<FlightOffer[]> => post("/flights/search", params),

  searchHotels: (params: {
    trip_context: TripContext;
    leg_number: number;
    city_code: string;
    check_in: string;
    check_out: string;
    adults: number;
    currency?: string;
  }): Promise<HotelOffer[]> => post("/hotels/search", params),

  suggestPOIs: (params: {
    trip_context: TripContext;
    leg_number: number;
    user_prompt?: string;
  }): Promise<POI[]> => post("/pois/suggest", params),

  getDistances: (params: {
    day_items: DayItem[];
  }): Promise<RouteSegment[]> => post("/pois/distances", params),

  // Backend /itinerary/generate accepts TripContext directly
  generateItinerary: (tripContext: TripContext): Promise<Record<string, string>> =>
    post("/itinerary/generate", tripContext),

  exportPDF: async (request: ExportRequest): Promise<Blob> => {
    const res = await fetch(`${BASE}/export/plan?format=pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!res.ok) throw new Error(`PDF export failed: ${res.status}`);
    return res.blob();
  },

  exportJSON: async (request: ExportRequest): Promise<unknown> => {
    const res = await fetch(`${BASE}/export/plan?format=json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!res.ok) throw new Error(`JSON export failed: ${res.status}`);
    return res.json();
  },

  getDriveTime: (params: {
    origin: string;
    destination: string;
    departure_date: string;
  }): Promise<{
    origin: string;
    destination: string;
    distance_km: number | null;
    duration_mins: number | null;
    maps_url: string;
  }> => post("/segments/drive-time", params),
};
