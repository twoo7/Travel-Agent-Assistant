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
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      onClick={() => onOpen(trip.trip_id)}
      className="group rounded-2xl p-5 cursor-pointer transition-all duration-200 relative"
      style={{
        background: "var(--glass-2)",
        border: "1px solid var(--glass-border-2)",
        backdropFilter: "blur(12px)",
      }}
      whileHover={{ y: -2 }}
    >
      {/* Badges */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5">
        {isActive && (
          <span
            className="text-[10px] font-semibold uppercase tracking-[2px] px-2 py-0.5 rounded-full font-body"
            style={{ background: "rgba(107,144,128,0.2)", color: "var(--success)", border: "1px solid rgba(107,144,128,0.4)" }}
          >
            Active
          </span>
        )}
        {trip.is_draft && (
          <span
            className="text-[10px] font-semibold uppercase tracking-[2px] px-2 py-0.5 rounded-full font-body"
            style={{ background: "rgba(224,122,95,0.15)", color: "var(--accent)", border: "1px solid rgba(224,122,95,0.3)" }}
          >
            Draft
          </span>
        )}
      </div>

      <h2
        className="text-lg font-semibold font-body mb-2 pr-28 truncate"
        style={{ color: "var(--text-primary)" }}
      >
        {trip.name || "Unnamed Trip"}
      </h2>

      <div className="flex items-center gap-3 text-xs font-body" style={{ color: "var(--text-muted)" }}>
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
                    <CheckCircle2 size={14} style={{ color: "var(--success)" }} />
                  ) : isCurrentStep ? (
                    <Circle size={14} style={{ color: "var(--accent)" }} strokeWidth={2.5} />
                  ) : (
                    <Circle size={14} style={{ color: "var(--text-subtle)" }} strokeWidth={1.5} />
                  )}
                  <span
                    className="text-[9px] font-semibold uppercase tracking-wide font-body"
                    style={{ color: done ? "var(--success)" : isCurrentStep ? "var(--accent)" : "var(--text-subtle)" }}
                  >
                    {label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className="w-6 h-px mb-3 mx-0.5"
                    style={{ background: done ? "var(--success)" : "var(--glass-border-2)" }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4 pt-3" style={{ borderTop: "1px solid var(--glass-border-1)" }}>
        <button
          type="button"
          onClick={handleShare}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors font-body"
          style={{
            background: "var(--glass-1)",
            border: "1px solid var(--glass-border-1)",
            color: copying ? "var(--success)" : "var(--text-muted)",
          }}
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
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors font-body"
          style={{
            background: "var(--glass-1)",
            border: "1px solid var(--glass-border-1)",
            color: "var(--text-muted)",
          }}
          title="Delete trip"
        >
          <Trash2 size={12} />
          Delete
        </button>

        <div className="ml-auto flex items-center gap-1 text-xs font-medium font-body" style={{ color: "var(--accent)" }}>
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
          <p
            className="text-[10px] font-semibold uppercase tracking-[2.5px] mb-3 font-body"
            style={{ color: "var(--text-eyebrow)" }}
          >
            My Trips
          </p>
          <div className="flex items-end justify-between gap-4">
            <h1 className="font-display text-4xl leading-tight" style={{ color: "var(--text-primary)" }}>
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
          <div
            className="rounded-xl p-4 text-sm font-body"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}
          >
            {error}
          </div>
        )}

        {!error && trips === null && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))}
          </div>
        )}

        {!error && trips !== null && trips.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <MapPin size={40} className="mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
            <p className="text-lg font-semibold font-body mb-1" style={{ color: "var(--text-primary)" }}>
              No trips yet
            </p>
            <p className="text-sm font-body mb-6" style={{ color: "var(--text-muted)" }}>
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
