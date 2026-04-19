"use client";

import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { api } from "@/services/api";
import { useTripContext } from "@/context/TripContext";

/**
 * Trip loader page — /t/[id]
 *
 * 1. Fetch full trip state from GET /trips/{id}
 * 2. Dispatch SET_STATE to replace context
 * 3. Dispatch SET_ACTIVE_TRIP_ID with URL id
 * 4. Fire POST /trips/{id}/claim (safe to retry — idempotent for existing owners)
 * 5. Redirect to funnel at the furthest completed step
 */

function inferFunnelStep(state: Record<string, unknown>): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = (state as any).tripContext;
    if (!ctx?.legs?.length) return "/";
    const legs = ctx.legs as Array<Record<string, unknown>>;

    const hasAnyDays = legs.some(
      (l) => Array.isArray(l.days) && (l.days as unknown[]).length > 0
    );
    if (hasAnyDays) return "/itinerary";

    const hasAnyHotel = legs.some(
      (l) => Array.isArray(l.hotel_stays) && (l.hotel_stays as unknown[]).length > 0
    );
    if (hasAnyHotel) return "/hotels";

    const hasAnyFlight = legs.some((l) => l.selected_flight != null);
    if (hasAnyFlight) return "/segments";

    return "/segments";
  } catch {
    return "/";
  }
}

export default function TripLoaderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, dispatch } = useTripContext();
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    const alreadyOwned = state.activeTripId === id;

    api
      .getTrip(id)
      .then((raw) => {
        // API returns TripDetail: { trip_id, name, is_draft, ..., state: TripState }
        // SET_STATE expects the inner TripState, not the wrapper TripDetail
        const tripDetail = raw as { name?: string | null; state?: Record<string, unknown> | null };
        const tripState = tripDetail.state ?? {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dispatch({ type: "SET_STATE", payload: tripState as any });
        dispatch({ type: "SET_ACTIVE_TRIP_ID", payload: id });
        if (tripDetail.name) dispatch({ type: "SET_TRIP_NAME", payload: tripDetail.name });

        if (!alreadyOwned) {
          // Claim in background — don't block navigation on failure
          api.claimTrip(id).catch(() => {});
        }

        const target = inferFunnelStep(tripState);
        router.replace(target);
      })
      .catch((err: Error) => {
        console.error("Failed to load trip:", err);
        router.replace("/trips");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="flex flex-col items-center gap-4"
      >
        <Loader2
          size={36}
          className="animate-spin"
          style={{ color: "var(--accent)" }}
        />
        <p className="text-sm font-body" style={{ color: "var(--text-muted)" }}>
          Loading your trip…
        </p>
      </motion.div>
    </div>
  );
}
