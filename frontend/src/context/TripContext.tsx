"use client";

import { createContext, useContext, useReducer, ReactNode } from "react";
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
}

type TripAction =
  | { type: "INIT_TRIP"; payload: Pick<TripContextType, "home_origin" | "adults" | "children" | "currency"> }
  | { type: "UPDATE_TRIP_META"; payload: Pick<TripContextType, "home_origin" | "adults" | "children" | "currency"> }
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
};

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
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
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
