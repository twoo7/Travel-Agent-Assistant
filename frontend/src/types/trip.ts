// Mirror of all backend Pydantic models

export type DayItemType = "poi" | "hotel" | "airport";

export type TransportMode = "flight" | "train" | "ferry" | "car";

export type POICategory = "activity" | "restaurant" | "sightseeing" | "attraction";

export type HopMode = "walking" | "driving" | "transit";

export type AccommodationType = "hotel" | "ferry_cabin" | "sleeper_train";

export interface DayItem {
  id?: string;
  type: DayItemType;
  name: string;
  address: string;
  lat: number;
  lng: number;
  duration_mins?: number;
  notes?: string;
  distance_to_next_km?: number;
  travel_time_to_next_mins?: number;
  route_polyline_to_next?: string;
  transport_mode?: HopMode;
  spans_days?: number;
}

export interface DayPlan {
  day_number: number;
  date: string;
  leg_number: number;
  city: string;
  items: DayItem[];
}

export interface HotelOffer {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  price_per_night: number;
  currency: string;
  rating?: number;
  ai_recommended: boolean;
  ai_reason?: string;
  ai_reason_bullets?: string[];
}

export interface HotelStay {
  hotel: HotelOffer;
  check_in: string;
  check_out: string;
  accommodation_type?: AccommodationType;
}

export interface FlightSegment {
  departure_airport: string;
  arrival_airport: string;
  departure_time: string;
  arrival_time: string;
  duration: string;
  carrier_code: string;
  flight_number: string;
}

export interface FlightOffer {
  id: string;
  price: number;
  currency: string;
  segments: FlightSegment[];
  total_duration: string;
  stops: number;
  ai_recommended: boolean;
  ai_reason?: string;
  ai_reason_bullets?: string[];
}

export interface TripLeg {
  leg_number: number;
  origin: string;
  destination: string;
  departure_date: string;
  transport_mode?: TransportMode;
  origin_airports?: string[];
  destination_airports?: string[];
  selected_flight?: FlightOffer;
  hotel_stays: HotelStay[];
  days: DayPlan[];
  flight_results?: FlightOffer[];
  hotel_results?: HotelOffer[];
}

export interface POI {
  id: string;
  name: string;
  category: POICategory;
  address: string;
  lat: number;
  lng: number;
  opening_hours?: string;
  booking_required: boolean;
  indoor_outdoor?: "indoor" | "outdoor" | "both";
  busy_times?: Record<string, number[]>;
  typical_visit_duration_mins?: number;
  price_level?: number;
  rating?: number;
  review_count?: number;
  photo_url?: string;
  nearest_transit?: string;
  claude_note: string;
  claude_best_time?: string;
  claude_booking_tip?: string;
  ai_recommended?: boolean;
  ai_reason?: string;
  theme_tags: string[];
  neighborhood?: string;
}

export interface SavedHotel {
  id: string;
  item: DayItem;
  day_number: number;
  leg_number: number;
  original_day_index: number;
}

export interface TripContext {
  home_origin: string;
  adults: number;
  children: number;
  currency?: string;
  legs: TripLeg[];
  unscheduled_pois: POI[];
  saved_pois: POI[];
  saved_hotels: SavedHotel[];
}

export interface ItineraryDay {
  day_number: number;
  date: string;
  city: string;
  narrative: string;
  items: DayItem[];
}

export interface TransportSegment {
  leg_number: number;
  mode: TransportMode;
  origin: string;
  destination: string;
  departure_date: string;
  operator?: string;
  duration_mins?: number;
  booking_link?: string;
  booking_ref?: string;
  notes?: string;
}

export interface ExportRequest {
  trip_context: TripContext;
  itinerary: ItineraryDay[];
  transport_segments?: TransportSegment[];
}

export interface RouteSegment {
  distance_km: number | null;
  travel_time_mins: number | null;
  encoded_polyline: string | null;
  mode: HopMode;
}

export interface TripMeta {
  trip_id: string;
  name: string | null;
  is_draft: boolean;
  created_at: string;
  updated_at: string;
}
