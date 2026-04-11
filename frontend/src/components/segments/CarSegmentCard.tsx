"use client";

import { useState, useEffect } from "react";
import { api } from "@/services/api";
import type { TripLeg } from "@/types/trip";
import { Car, Check, ExternalLink, Info, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

interface Props {
  leg: TripLeg;
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function CarSegmentCard({ leg }: Props) {
  const [driveInfo, setDriveInfo] = useState<{
    distance_km: number | null;
    duration_mins: number | null;
    maps_url: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .getDriveTime({
        origin: leg.origin,
        destination: leg.destination,
        departure_date: leg.departure_date,
      })
      .then((data) => {
        setDriveInfo({
          distance_km: data.distance_km,
          duration_mins: data.duration_mins,
          maps_url: data.maps_url,
        });
      })
      .catch(() => {
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [leg.origin, leg.destination, leg.departure_date]);

  const mapsUrl =
    driveInfo?.maps_url ??
    `https://www.google.com/maps/dir/${encodeURIComponent(leg.origin)}/${encodeURIComponent(leg.destination)}`;

  return (
    <div
      className="rounded-xl p-5 relative"
      style={{
        background: "var(--glass-2)",
        border: "1px solid var(--glass-border-2)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
        backdropFilter: "blur(12px)",
      }}
    >
      <span
        className="absolute top-4 right-4 inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full font-body"
        style={{ color: "var(--success)", background: "rgba(107,144,128,0.15)", border: "1px solid rgba(107,144,128,0.3)" }}
      >
        <Check size={10} />
        Confirmed
      </span>

      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(212,165,116,0.15)" }}
        >
          <Car size={18} style={{ color: "var(--warning)" }} />
        </div>
        <h3 className="text-lg font-semibold font-display" style={{ color: "var(--text-primary)" }}>Bus/Car</h3>
      </div>

      <p className="text-base font-medium mb-4 font-body" style={{ color: "var(--text-primary)" }}>
        {leg.origin} → {leg.destination}
      </p>

      {loading ? (
        <div className="mb-4 space-y-2">
          <Skeleton className="h-4 w-48" />
        </div>
      ) : error || !driveInfo || driveInfo.distance_km === null ? (
        <p className="text-sm mb-4 font-body" style={{ color: "var(--text-muted)" }}>Couldn&apos;t calculate drive time.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex items-center gap-1.5">
            <MapPin size={13} style={{ color: "var(--warning)" }} />
            <span className="text-sm font-body" style={{ color: "var(--text-primary)" }}>
              <span className="font-semibold">{driveInfo.distance_km.toLocaleString()} km</span>
            </span>
          </div>
          <div className="w-px h-4" style={{ background: "var(--glass-border-2)" }} />
          <span className="text-sm font-body" style={{ color: "var(--text-primary)" }}>
            Est. drive time:{" "}
            <span className="font-semibold">
              {driveInfo.duration_mins !== null ? formatDuration(driveInfo.duration_mins) : "—"}
            </span>
          </span>
        </div>
      )}

      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-2 mb-4 font-body transition-colors"
        style={{ color: "var(--warning)" }}
      >
        Open in Google Maps
        <ExternalLink size={12} />
      </a>

      <div
        className="flex items-start gap-2 rounded-lg px-3 py-2 mt-2"
        style={{ background: "rgba(212,165,116,0.08)", border: "1px solid rgba(212,165,116,0.15)" }}
      >
        <Info size={13} className="shrink-0 mt-0.5" style={{ color: "var(--warning)" }} />
        <p className="text-xs font-body" style={{ color: "var(--text-muted)" }}>
          Drive time is an estimate. Factor in breaks, border crossings, and traffic.
        </p>
      </div>
    </div>
  );
}
