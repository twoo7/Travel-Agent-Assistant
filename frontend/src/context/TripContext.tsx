"use client";

import { createContext, useContext, useReducer, useEffect, useRef, ReactNode } from "react";
import { api } from "@/services/api";
import type {
  TripContext as TripContextType,
  TripLeg,
  FlightOffer,
  HotelOffer,
  HotelStay,
  DayPlan,
  POI,
  ItineraryDay,
  TransportMode,
} from "@/types/trip";

interface TripState {
  tripContext: TripContextType;
  itinerary: ItineraryDay[];
  staleSteps: string[];
  activeTripId: string | null;
}

type TripAction =
  | { type: "INIT_TRIP"; payload: Pick<TripContextType, "home_origin" | "adults" | "children"> & { currency?: string } }
  | { type: "UPDATE_TRIP_META"; payload: Partial<Pick<TripContextType, "home_origin" | "adults" | "children" | "currency">> }
  | { type: "ADD_LEG"; payload: TripLeg }
  | { type: "UPDATE_LEG"; payload: TripLeg }
  | { type: "REMOVE_LEG"; payload: { leg_number: number } }
  | { type: "SET_FLIGHT"; payload: { leg_number: number; flight: FlightOffer } }
  | { type: "ADD_HOTEL_STAY"; payload: { leg_number: number; stay: HotelStay } }
  | { type: "REMOVE_HOTEL_STAY"; payload: { leg_number: number; hotel_id: string } }
  | { type: "SET_DAYS"; payload: DayPlan[] }
  | { type: "ADD_UNSCHEDULED_POI"; payload: POI }
  | { type: "REMOVE_UNSCHEDULED_POI"; payload: { poi_id: string } }
  | { type: "SAVE_POI"; payload: { poi_id: string } }
  | { type: "RESTORE_POI"; payload: { poi_id: string } }
  | { type: "SET_ITINERARY"; payload: ItineraryDay[] }
  | { type: "SET_TRANSPORT_MODE"; payload: { leg_number: number; mode: TransportMode } }
  | { type: "SET_FLIGHT_RESULTS"; payload: { leg_number: number; results: FlightOffer[] } }
  | { type: "SET_HOTEL_RESULTS"; payload: { leg_number: number; results: HotelOffer[] } }
  | { type: "MARK_STALE"; payload: { keys: string[] } }
  | { type: "CLEAR_STALE"; payload: { key: string } }
  | { type: "SET_STATE"; payload: TripState }
  | { type: "SET_ACTIVE_TRIP_ID"; payload: string | null }
  | { type: "RESET" };

const EMPTY_CONTEXT: TripContextType = {
  home_origin: "",
  adults: 2,
  children: 0,
  currency: "USD",
  legs: [],
  unscheduled_pois: [],
  saved_pois: [],
};

const INITIAL_STATE: TripState = {
  tripContext: EMPTY_CONTEXT,
  itinerary: [],
  staleSteps: [],
  activeTripId: null,
};

const LOCAL_KEY = "trip-context:draft";

function loadFromLocal(): TripState {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return INITIAL_STATE;
    const parsed = JSON.parse(raw) as TripState;
    // Minimal validation: must have a tripContext with legs array
    if (!parsed?.tripContext || !Array.isArray(parsed.tripContext.legs)) {
      return INITIAL_STATE;
    }
    return parsed;
  } catch {
    return INITIAL_STATE;
  }
}

function saveToLocal(state: TripState): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable — silently skip
  }
}

function reducer(state: TripState, action: TripAction): TripState {
  const ctx = state.tripContext;

  switch (action.type) {
    case "INIT_TRIP":
      return {
        ...state,
        tripContext: { ...EMPTY_CONTEXT, ...action.payload },
        staleSteps: [],
      };

    case "UPDATE_TRIP_META":
      return {
        ...state,
        tripContext: { ...ctx, ...action.payload },
      };

    case "ADD_LEG":
      return {
        ...state,
        tripContext: { ...ctx, legs: [...ctx.legs, action.payload] },
      };

    case "UPDATE_LEG":
      return {
        ...state,
        tripContext: {
          ...ctx,
          legs: ctx.legs.map((l) =>
            l.leg_number === action.payload.leg_number ? action.payload : l
          ),
        },
      };

    case "REMOVE_LEG":
      return {
        ...state,
        tripContext: {
          ...ctx,
          legs: ctx.legs.filter((l) => l.leg_number !== action.payload.leg_number),
        },
      };

    case "SET_FLIGHT":
      return {
        ...state,
        tripContext: {
          ...ctx,
          legs: ctx.legs.map((l) =>
            l.leg_number === action.payload.leg_number
              ? { ...l, selected_flight: action.payload.flight }
              : l
          ),
        },
      };

    case "ADD_HOTEL_STAY":
      return {
        ...state,
        tripContext: {
          ...ctx,
          legs: ctx.legs.map((l) =>
            l.leg_number === action.payload.leg_number
              ? {
                  ...l,
                  hotel_stays: [
                    ...l.hotel_stays.filter(
                      (s) => s.hotel.id !== action.payload.stay.hotel.id
                    ),
                    action.payload.stay,
                  ],
                }
              : l
          ),
        },
      };

    case "REMOVE_HOTEL_STAY":
      return {
        ...state,
        tripContext: {
          ...ctx,
          legs: ctx.legs.map((l) =>
            l.leg_number === action.payload.leg_number
              ? {
                  ...l,
                  hotel_stays: l.hotel_stays.filter(
                    (s) => s.hotel.id !== action.payload.hotel_id
                  ),
                }
              : l
          ),
        },
      };

    case "SET_DAYS": {
      const byLeg: Record<number, DayPlan[]> = {};
      for (const day of action.payload) {
        if (!byLeg[day.leg_number]) byLeg[day.leg_number] = [];
        byLeg[day.leg_number].push(day);
      }
      return {
        ...state,
        tripContext: {
          ...ctx,
          legs: ctx.legs.map((l) => ({
            ...l,
            days: byLeg[l.leg_number] ?? l.days,
          })),
        },
      };
    }

    case "ADD_UNSCHEDULED_POI":
      if (ctx.unscheduled_pois.some((p) => p.id === action.payload.id)) return state;
      return {
        ...state,
        tripContext: {
          ...ctx,
          unscheduled_pois: [...ctx.unscheduled_pois, action.payload],
        },
      };

    case "REMOVE_UNSCHEDULED_POI":
      return {
        ...state,
        tripContext: {
          ...ctx,
          unscheduled_pois: ctx.unscheduled_pois.filter(
            (p) => p.id !== action.payload.poi_id
          ),
        },
      };

    case "SAVE_POI": {
      const poi = ctx.unscheduled_pois.find((p) => p.id === action.payload.poi_id);
      if (!poi) return state;
      return {
        ...state,
        tripContext: {
          ...ctx,
          unscheduled_pois: ctx.unscheduled_pois.filter(
            (p) => p.id !== action.payload.poi_id
          ),
          saved_pois: [...ctx.saved_pois, poi],
        },
      };
    }

    case "RESTORE_POI": {
      const poi = ctx.saved_pois.find((p) => p.id === action.payload.poi_id);
      if (!poi) return state;
      return {
        ...state,
        tripContext: {
          ...ctx,
          saved_pois: ctx.saved_pois.filter((p) => p.id !== action.payload.poi_id),
          unscheduled_pois: [...ctx.unscheduled_pois, poi],
        },
      };
    }

    case "SET_ITINERARY":
      return { ...state, itinerary: action.payload };

    case "SET_TRANSPORT_MODE":
      return {
        ...state,
        tripContext: {
          ...ctx,
          legs: ctx.legs.map((l) =>
            l.leg_number === action.payload.leg_number
              ? { ...l, transport_mode: action.payload.mode }
              : l
          ),
        },
      };

    case "SET_FLIGHT_RESULTS":
      return {
        ...state,
        tripContext: {
          ...ctx,
          legs: ctx.legs.map((l) =>
            l.leg_number === action.payload.leg_number
              ? { ...l, flight_results: action.payload.results }
              : l
          ),
        },
      };

    case "SET_HOTEL_RESULTS":
      return {
        ...state,
        tripContext: {
          ...ctx,
          legs: ctx.legs.map((l) =>
            l.leg_number === action.payload.leg_number
              ? { ...l, hotel_results: action.payload.results }
              : l
          ),
        },
      };

    case "MARK_STALE": {
      const existing = new Set(state.staleSteps);
      const staleLegNumbers = new Set<number>();
      for (const k of action.payload.keys) {
        existing.add(k);
        const match = k.match(/^(?:segments|hotels)-(\d+)$/);
        if (match) staleLegNumbers.add(Number(match[1]));
      }
      return {
        ...state,
        staleSteps: Array.from(existing),
        tripContext: {
          ...ctx,
          legs: ctx.legs.map((l) =>
            staleLegNumbers.has(l.leg_number)
              ? { ...l, flight_results: undefined, hotel_results: undefined }
              : l
          ),
        },
      };
    }

    case "CLEAR_STALE":
      return {
        ...state,
        staleSteps: state.staleSteps.filter((k) => k !== action.payload.key),
      };

    case "SET_STATE":
      return {
        ...INITIAL_STATE,
        ...action.payload,
        staleSteps: action.payload.staleSteps ?? [],
        itinerary: action.payload.itinerary ?? [],
        tripContext: {
          ...EMPTY_CONTEXT,
          ...(action.payload.tripContext ?? {}),
          unscheduled_pois: action.payload.tripContext?.unscheduled_pois ?? [],
          saved_pois: action.payload.tripContext?.saved_pois ?? [],
        },
      };

    case "SET_ACTIVE_TRIP_ID":
      return { ...state, activeTripId: action.payload };

    case "RESET":
      return INITIAL_STATE;

    default:
      return state;
  }
}

const TripContextCtx = createContext<{
  state: TripState;
  dispatch: React.Dispatch<TripAction>;
} | null>(null);

export function TripContextProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE, () => {
    // Load persisted state on first render (client-only: localStorage is not available on server)
    if (typeof window === "undefined") return INITIAL_STATE;
    return loadFromLocal();
  });

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCreatingTrip = useRef(false);

  useEffect(() => {
    // Always keep localStorage in sync as offline fallback
    saveToLocal(state);

    if (state.activeTripId) {
      // Debounced PUT to backend — 1s after last change
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        api.saveTrip(state.activeTripId!, state).catch((err) => {
          console.error("Autosave failed:", err);
        });
      }, 1000);
    } else if (!isCreatingTrip.current && state.tripContext.home_origin) {
      // First meaningful mutation — mint a draft trip
      isCreatingTrip.current = true;
      api.createTrip().then(({ trip_id }) => {
        dispatch({ type: "SET_ACTIVE_TRIP_ID", payload: trip_id });
      }).catch((err) => {
        console.error("Failed to create trip:", err);
      }).finally(() => {
        isCreatingTrip.current = false;
      });
    }
  }, [state]);

  return (
    <TripContextCtx.Provider value={{ state, dispatch }}>
      {children}
    </TripContextCtx.Provider>
  );
}

export function useTripContext() {
  const ctx = useContext(TripContextCtx);
  if (!ctx) throw new Error("useTripContext must be used within TripContextProvider");
  return ctx;
}
