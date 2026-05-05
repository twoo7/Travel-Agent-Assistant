"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Share2, Trash2, MapPin, Calendar, ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { api } from "@/services/api";
import { useTripContext } from "@/context/TripContext";
import type { TripMeta, TripContext as TripContextType } from "@/types/trip";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

interface TripProgress {
  setup: boolean;
  segments: boolean;
  hotels: boolean;
  itinerary: boolean;
}

function computeProgress(ctx: TripContextType): TripProgress {
  const hasLegs = ctx.legs.length > 0;
  const hasSegments = ctx.legs.some((l) => !!l.selected_flight);
  const hasHotels = ctx.legs.some((l) => l.hotel_stays.length > 0);
  const hasItinerary = ctx.legs.some((l) => l.days.some((d) => d.items.some((i) => i.type === "poi")));
  return { setup: hasLegs, segments: hasSegments, hotels: hasHotels, itinerary: hasItinerary };
}

const STEPS = [
  { key: "setup", label: "Setup" },
  { key: "segments", label: "Flights" },
  { key: "hotels", label: "Hotels" },
  { key: "itinerary", label: "Itinerary" },
] as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function TripCard({
  trip,
  onDelete,
  onOpen,
  progress,
  isActive,
}: {
  trip: TripMeta;
  onDelete: (id: string) => void;
  onOpen: (id: string) => void;
  progress?: TripProgress;
  isActive?: boolean;
}) {
  const [copying, setCopying] = useState(false);
  const shareUrl = `${window.location.origin}/t/${trip.trip_id}`;

  const handleShare = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopying(true);
        setTimeout(() => setCopying(false), 1500);
      } catch {
        // Clipboard unavailable — fall back to prompt
        window.prompt("Copy this link:", shareUrl);
      }
    },
    [shareUrl]
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ type: "spring", stiffness: 240, damping: 26 }}
      onClick={() => onOpen(trip.trip_id)}
      className="group bg-surface border border-border rounded-xl p-5 cursor-pointer shadow-sm hover:shadow-md transition-all duration-200 relative"
      whileHover={{ y: -2 }}
    >
      {/* Badges */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5">
        {isActive && (
          <span className="text-[10px] font-semibold uppercase tracking-[2px] px-2 py-0.5 rounded-full font-body bg-teal-light text-teal border border-teal/20">
            Active
          </span>
        )}
        {trip.is_draft && (
          <span className="text-[10px] font-semibold uppercase tracking-[2px] px-2 py-0.5 rounded-full font-body bg-amber/10 text-amber border border-amber/20">
            Draft
          </span>
        )}
      </div>

      <h2 className="font-display text-lg font-medium text-ink mb-2 pr-28 truncate">
        {trip.name || "Unnamed Trip"}
      </h2>

      <div className="flex items-center gap-3 text-xs font-body text-ink-muted">
        <span className="flex items-center gap-1">
          <Calendar size={12} />
          Updated {formatDate(trip.updated_at)}
        </span>
      </div>

      {/* Progress steps — only shown for the active trip */}
      {progress && (
        <div className="flex items-center gap-0 mt-3">
          {STEPS.map(({ key, label }, idx) => {
            const done = progress[key];
            const isCurrentStep = !done && (idx === 0 || progress[STEPS[idx - 1].key]);
            return (
              <div key={key} className="flex items-center">
                <div className="flex flex-col items-center gap-0.5">
                  {done ? (
                    <CheckCircle2 size={14} className="text-teal" />
                  ) : isCurrentStep ? (
                    <Circle size={14} className="text-amber" strokeWidth={2.5} />
                  ) : (
                    <Circle size={14} className="text-ink-subtle" strokeWidth={1.5} />
                  )}
                  <span className={[
                    "text-[9px] font-semibold uppercase tracking-wide font-body",
                    done ? "text-teal" : isCurrentStep ? "text-amber" : "text-ink-subtle",
                  ].join(" ")}>
                    {label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={["w-6 h-px mb-3 mx-0.5", done ? "bg-teal" : "bg-border"].join(" ")} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
        <button
          type="button"
          onClick={handleShare}
          className={[
            "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border bg-surface2 transition-colors font-body",
            copying ? "text-teal" : "text-ink-muted hover:text-ink",
          ].join(" ")}
          title="Copy share link"
        >
          <Share2 size={12} />
          {copying ? "Copied!" : "Share"}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(trip.trip_id);
          }}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border bg-surface2 text-ink-muted hover:text-red hover:border-red/30 transition-colors font-body"
          title="Delete trip"
        >
          <Trash2 size={12} />
          Delete
        </button>

        <div className="ml-auto flex items-center gap-1 text-xs font-medium font-body text-teal">
          Open
          <ArrowRight size={12} />
        </div>
      </div>
    </motion.div>
  );
}

export default function TripsPage() {
  const router = useRouter();
  const { state, dispatch } = useTripContext();
  const [trips, setTrips] = useState<TripMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api
      .listTrips()
      .then(setTrips)
      .catch((err: Error) => setError(err.message));
  }, []);

  const handleNewTrip = useCallback(async () => {
    setCreating(true);
    try {
      const { trip_id } = await api.createTrip();
      dispatch({ type: "RESET" });
      dispatch({ type: "SET_ACTIVE_TRIP_ID", payload: trip_id });
      router.push("/");
    } catch (err) {
      console.error("Failed to create trip:", err);
      setCreating(false);
    }
  }, [dispatch, router]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await api.deleteTrip(id);
      setTrips((prev) => prev?.filter((t) => t.trip_id !== id) ?? prev);
    } catch (err) {
      console.error("Failed to delete trip:", err);
    }
  }, []);

  const handleOpen = useCallback(
    (id: string) => {
      router.push(`/t/${id}`);
    },
    [router]
  );

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 md:px-0 min-h-screen">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[10px] font-semibold uppercase tracking-[2px] mb-2 font-body text-teal">
            My Trips
          </p>
          <div className="flex items-end justify-between gap-4">
            <h1 className="font-display text-[34px] font-medium leading-tight text-ink">
              Your journeys
            </h1>
            <Button
              variant="primary"
              size="md"
              icon={<Plus size={14} />}
              onClick={handleNewTrip}
              disabled={creating}
            >
              {creating ? "Creating…" : "New Trip"}
            </Button>
          </div>
        </div>

        {/* Content */}
        {error && (
          <div className="rounded-xl p-4 text-sm font-body text-red bg-red/8 border border-red/20">
            {error}
          </div>
        )}

        {!error && trips === null && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        )}

        {!error && trips !== null && trips.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <MapPin size={40} className="mx-auto mb-4 text-ink-muted" />
            <p className="font-display text-lg font-medium mb-1 text-ink">
              No trips yet
            </p>
            <p className="text-sm font-body mb-6 text-ink-muted">
              Start planning your first adventure.
            </p>
            <Button variant="primary" size="md" icon={<Plus size={14} />} onClick={handleNewTrip} disabled={creating}>
              {creating ? "Creating…" : "New Trip"}
            </Button>
          </motion.div>
        )}

        {!error && trips !== null && trips.length > 0 && (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {trips.map((trip) => {
                const isActive = trip.trip_id === state.activeTripId;
                return (
                  <TripCard
                    key={trip.trip_id}
                    trip={trip}
                    onDelete={handleDelete}
                    onOpen={handleOpen}
                    isActive={isActive}
                    progress={isActive ? computeProgress(state.tripContext) : undefined}
                  />
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>
  );
}
