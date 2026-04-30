"use client";

import type { HopMode } from "@/types/trip";
import { nextMode, haversineKm, recommendedMode } from "@/utils/distance";
import { Footprints, Car, Train } from "lucide-react";

interface Props {
  distanceKm?: number | null;
  travelTimeMins?: number | null;
  mode?: HopMode;
  onModeChange?: (mode: HopMode) => void;
  // Coordinates of adjacent items for haversine estimate when no real data
  fromLat?: number;
  fromLng?: number;
  toLat?: number;
  toLng?: number;
}

const MODE_ICON: Record<HopMode, React.ReactNode> = {
  walking: <Footprints size={11} />,
  driving: <Car size={11} />,
  transit: <Train size={11} />,
};

const MODE_LABEL: Record<HopMode, string> = {
  walking: "walk",
  driving: "drive",
  transit: "transit",
};

const MODE_COLOR: Record<HopMode, string> = {
  walking: "var(--success)",
  driving: "var(--accent)",
  transit: "var(--warning)",
};

function estimateMins(km: number, m: HopMode): number {
  const minPerKm: Record<HopMode, number> = { walking: 12, driving: 1.5, transit: 2.4 };
  return Math.round(km * minPerKm[m]);
}

export function DistanceConnector({
  distanceKm, travelTimeMins, mode,
  onModeChange,
  fromLat, fromLng, toLat, toLng,
}: Props) {
  const hasData = distanceKm != null || travelTimeMins != null;

  const canEstimate =
    !hasData &&
    fromLat != null && fromLng != null && toLat != null && toLng != null &&
    !(fromLat === 0 && fromLng === 0) && !(toLat === 0 && toLng === 0);

  let estimatedKm: number | undefined;
  let displayMode: HopMode;

  if (canEstimate) {
    estimatedKm = haversineKm(fromLat!, fromLng!, toLat!, toLng!);
    displayMode = mode ?? recommendedMode(estimatedKm);
  } else {
    displayMode = mode ?? "walking";
  }

  if (!hasData && !canEstimate) {
    return (
      <div className="flex items-center py-1 px-3">
        <div className="border-l-2 border-dashed h-4 ml-3" style={{ borderColor: "var(--glass-border-2)" }} />
      </div>
    );
  }

  const isEstimate = !hasData && canEstimate;
  const shownKm = hasData ? distanceKm : estimatedKm;
  const shownMins = hasData ? travelTimeMins : (estimatedKm != null ? estimateMins(estimatedKm, displayMode) : undefined);
  const prefix = isEstimate ? "~" : "";

  return (
    <div className="flex items-center gap-2 py-1 pl-4">
      <div className="border-l-2 border-dashed h-4" style={{ borderColor: "var(--glass-border-2)" }} />
      <button
        onClick={() => onModeChange?.(nextMode(displayMode))}
        disabled={!onModeChange}
        className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full transition-colors font-body"
        style={{
          color: MODE_COLOR[displayMode],
          background: `${MODE_COLOR[displayMode]}18`,
          border: `1px solid ${MODE_COLOR[displayMode]}40`,
          cursor: onModeChange ? "pointer" : "default",
          opacity: isEstimate ? 0.7 : 1,
        }}
        title={onModeChange ? "Click to change transport mode" : undefined}
      >
        {MODE_ICON[displayMode]}
        {shownMins != null && `${prefix}${shownMins} min`}
        {shownKm != null && ` · ${prefix}${shownKm.toFixed(1)} km`}
        {` ${MODE_LABEL[displayMode]}`}
      </button>
    </div>
  );
}
