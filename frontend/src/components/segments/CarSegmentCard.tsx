"use client";

import { useState, useEffect } from "react";
import { api } from "@/services/api";
import type { TripLeg } from "@/types/trip";

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
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 relative">
      <span className="absolute top-4 right-4 text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
        ✓ Confirmed
      </span>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">🚗</span>
        <h3 className="text-lg font-semibold text-amber-900">Bus/Car</h3>
      </div>

      <p className="text-base font-medium text-gray-800 mb-4">
        {leg.origin} → {leg.destination}
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <div className="w-4 h-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
          <span>Calculating drive time…</span>
        </div>
      ) : error || !driveInfo || driveInfo.distance_km === null ? (
        <p className="text-sm text-gray-500 mb-4">Couldn&apos;t calculate drive time.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <span className="text-sm text-gray-700">
            <span className="font-semibold">{driveInfo.distance_km.toLocaleString()} km</span>
          </span>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-700">
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
        className="inline-flex items-center gap-1 text-sm text-amber-700 font-medium hover:text-amber-900 underline underline-offset-2 mb-4"
      >
        Open in Google Maps ↗
      </a>

      <p className="text-xs text-gray-500 bg-amber-100 rounded-lg px-3 py-2">
        ℹ️ Drive time is an estimate. Factor in breaks, border crossings, and traffic.
      </p>
    </div>
  );
}
