import type {
  TripContext,
  FlightOffer,
  HotelOffer,
  POI,
  DayItem,
  RouteSegment,
  ExportRequest,
  TripMeta,
} from "@/types/trip";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok) {
    const raw = await res.text();
    console.error(`API ${path} failed: ${res.status} —`, raw);
    let message = "Something went wrong. Please try again.";
    try {
      const json = JSON.parse(raw) as { detail?: string };
      if (json.detail) {
        if (json.detail.toLowerCase().includes("temporarily unavailable")) {
          message = "Flight/hotel search is temporarily unavailable. Please try again shortly.";
        } else {
          message = json.detail;
        }
      }
    } catch {
      // body was not JSON — use default message
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function del(path: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
}

export const api = {
  health: (): Promise<{ status: string }> =>
    fetch(`${BASE}/health`, { credentials: "include" }).then((r) => r.json()),

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
      credentials: "include",
    });
    if (!res.ok) throw new Error(`PDF export failed: ${res.status}`);
    return res.blob();
  },

  exportJSON: async (request: ExportRequest): Promise<unknown> => {
    const res = await fetch(`${BASE}/export/plan?format=json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      credentials: "include",
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

  // Trip persistence
  createTrip: (): Promise<{ trip_id: string; is_draft: boolean }> =>
    post("/trips", {}),

  listTrips: (): Promise<TripMeta[]> =>
    get("/trips"),

  getTrip: (tripId: string): Promise<unknown> =>
    get(`/trips/${tripId}`),

  saveTrip: (tripId: string, state: unknown): Promise<void> =>
    put(`/trips/${tripId}`, { state }),

  renameTrip: (tripId: string, name: string): Promise<void> =>
    patch(`/trips/${tripId}`, { name, is_draft: false }),

  deleteTrip: (tripId: string): Promise<void> =>
    del(`/trips/${tripId}`),

  claimTrip: (tripId: string): Promise<void> =>
    post(`/trips/${tripId}/claim`, {}),
};
