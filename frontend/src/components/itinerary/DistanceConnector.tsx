"use client";

import type { HopMode } from "@/types/trip";
import { nextMode } from "@/utils/distance";
import { Footprints, Car, Train } from "lucide-react";

interface Props {
  distanceKm?: number | null;
  travelTimeMins?: number | null;
  mode?: HopMode;
  onModeChange?: (mode: HopMode) => void;
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

export function DistanceConnector({ distanceKm, travelTimeMins, mode, onModeChange }: Props) {
  const resolvedMode: HopMode = mode ?? "walking";
  const hasData = distanceKm != null || travelTimeMins != null;

  if (!hasData) {
    return (
      <div className="flex items-center py-1 px-3">
        <div className="border-l-2 border-dashed h-4 ml-3" style={{ borderColor: "var(--glass-border-2)" }} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-1 pl-4">
      <div className="border-l-2 border-dashed h-4" style={{ borderColor: "var(--glass-border-2)" }} />
      <button
        onClick={() => onModeChange?.(nextMode(resolvedMode))}
        disabled={!onModeChange}
        className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full transition-colors font-body"
        style={{
          color: MODE_COLOR[resolvedMode],
          background: `${MODE_COLOR[resolvedMode]}18`,
          border: `1px solid ${MODE_COLOR[resolvedMode]}40`,
          cursor: onModeChange ? "pointer" : "default",
        }}
        title={onModeChange ? "Click to change transport mode" : undefined}
      >
        {MODE_ICON[resolvedMode]}
        {travelTimeMins != null && `${travelTimeMins} min`}
        {distanceKm != null && ` · ${distanceKm.toFixed(1)} km`}
        {` ${MODE_LABEL[resolvedMode]}`}
      </button>
    </div>
  );
}
