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
    <div className="bg-warning/5 border border-warning/20 rounded-xl p-5 relative">
      <span className="absolute top-4 right-4 inline-flex items-center gap-1 text-xs font-semibold text-warning-dark bg-warning/10 border border-warning/20 px-2 py-0.5 rounded-full font-body">
        <Check size={10} />
        Confirmed
      </span>

      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center">
          <Car size={18} className="text-warning-dark" />
        </div>
        <h3 className="text-lg font-semibold text-primary font-display">Bus/Car</h3>
      </div>

      <p className="text-base font-medium text-charcoal mb-4 font-body">
        {leg.origin} → {leg.destination}
      </p>

      {loading ? (
        <div className="mb-4 space-y-2">
          <Skeleton className="h-4 w-48" />
        </div>
      ) : error || !driveInfo || driveInfo.distance_km === null ? (
        <p className="text-sm text-muted mb-4 font-body">Couldn&apos;t calculate drive time.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex items-center gap-1.5">
            <MapPin size={13} className="text-warning-dark" />
            <span className="text-sm text-charcoal font-body">
              <span className="font-semibold">{driveInfo.distance_km.toLocaleString()} km</span>
            </span>
          </div>
          <div className="w-px h-4 bg-gray-200" />
          <span className="text-sm text-charcoal font-body">
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
        className="inline-flex items-center gap-1.5 text-sm text-warning-dark font-medium hover:text-warning underline underline-offset-2 mb-4 font-body transition-colors"
      >
        Open in Google Maps
        <ExternalLink size={12} />
      </a>

      <div className="flex items-start gap-2 bg-warning/5 rounded-lg px-3 py-2 mt-2">
        <Info size={13} className="text-warning-dark shrink-0 mt-0.5" />
        <p className="text-xs text-charcoal/60 font-body">
          Drive time is an estimate. Factor in breaks, border crossings, and traffic.
        </p>
      </div>
    </div>
  );
}
