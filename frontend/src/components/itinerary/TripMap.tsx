"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Map,
  AdvancedMarker,
  InfoWindow,
  Polyline,
  useMap,
} from "@vis.gl/react-google-maps";
import type { DayPlan, HopMode } from "@/types/trip";

interface Props {
  days: DayPlan[];
  currentLeg?: number;
  focusedDays?: number[];
  onFocusedDaysChange?: (days: number[]) => void;
  selectedLatLng?: { lat: number; lng: number; name?: string } | null;
}

const DAY_COLORS = [
  "#E07A5F", "#6B9080", "#D4A574", "#3A7CA5",
  "#C4684F", "#577A6C", "#B88A5E", "#2D5A73",
  "#8B4B3A", "#4A9B8E",
];

const ITEM_TYPE_COLOR: Record<string, string> = {
  hotel: "#1B3A4B",
  airport: "#E07A5F",
};

interface PolylineStyle {
  strokeColor: string;
  strokeWeight: number;
  strokeOpacity: number;
  icons?: google.maps.IconSequence[];
}

// Polyline stroke styles per transport mode
const POLYLINE_STYLE: Record<HopMode, PolylineStyle> = {
  walking: {
    strokeColor: "#6B9080",
    strokeWeight: 2,
    strokeOpacity: 0,
    icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 }, offset: "0", repeat: "10px" }],
  },
  driving: {
    strokeColor: "#E07A5F",
    strokeWeight: 3,
    strokeOpacity: 0.85,
  },
  transit: {
    strokeColor: "#D4A574",
    strokeWeight: 3,
    strokeOpacity: 0.7,
    icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 }, offset: "0", repeat: "12px" }],
  },
};

interface MarkerInfo { name: string; address: string; type: string; }
interface LatLng { lat: number; lng: number; }

function MapPanner({ target }: { target: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !target) return;
    map.panTo(target);
    map.setZoom(16);
  }, [map, target]);
  return null;
}

function BoundsFitter({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map || points.length === 0) return;
    if (points.length === 1) { map.setCenter(points[0]); map.setZoom(14); return; }
    const bounds = new google.maps.LatLngBounds();
    points.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 60);
  }, [map, points]);
  return null;
}

export function TripMap({ days, currentLeg, focusedDays = [], onFocusedDaysChange, selectedLatLng }: Props) {
  const [infoMarker, setInfoMarker] = useState<MarkerInfo | null>(null);
  const [infoPos, setInfoPos] = useState<LatLng | null>(null);

  const legDays = useMemo(
    () => currentLeg != null ? days.filter((d) => d.leg_number === currentLeg) : days,
    [days, currentLeg]
  );
  const visibleDays = useMemo(
    () => focusedDays.length > 0 ? legDays.filter((d) => focusedDays.includes(d.day_number)) : legDays,
    [legDays, focusedDays]
  );
  const allItems = useMemo(
    () => legDays.flatMap((d) => d.items).filter((i) => i.lat !== 0 || i.lng !== 0),
    [legDays]
  );
  const center = useMemo(
    () => allItems.length > 0 ? { lat: allItems[0].lat, lng: allItems[0].lng } : { lat: 48.8566, lng: 2.3522 },
    [allItems]
  );

  return (
    <div className="h-full flex flex-col gap-2 min-h-[400px]">
      <style>{`@keyframes ping{75%,100%{transform:scale(2);opacity:0}}`}</style>
      {/* Map header — focused day indicator + All days reset */}
      {focusedDays.length > 0 && (
        <div
          className="flex items-center justify-between px-3 py-1.5 rounded-xl"
          style={{ background: "var(--glass-2)", border: "1px solid var(--glass-border-2)" }}
        >
          <span className="text-xs font-medium font-body" style={{ color: "var(--text-primary)" }}>
            {focusedDays.length === 1
              ? `Day ${focusedDays[0]}`
              : `Days ${[...focusedDays].sort((a, b) => a - b).join(", ")}`}
          </span>
          <button
            onClick={() => onFocusedDaysChange?.([])}
            className="text-xs px-2 py-0.5 rounded-full transition-colors font-body"
            style={{ background: "var(--glass-1)", color: "var(--text-muted)", border: "1px solid var(--glass-border-1)" }}
          >
            All days
          </button>
        </div>
      )}

      <Map
        defaultCenter={center}
        defaultZoom={allItems.length === 0 ? 3 : 13}
        mapId="travel-agent-map"
        className="flex-1 rounded-xl min-h-[400px]"
        style={{ border: "1px solid var(--glass-border-1)", borderRadius: "12px", overflow: "hidden" }}
      >
          <BoundsFitter
            points={visibleDays.flatMap((d) => d.items).filter((i) => i.lat !== 0 || i.lng !== 0).map((i) => ({ lat: i.lat, lng: i.lng }))}
          />
          <MapPanner target={selectedLatLng ?? null} />

          {/* Markers */}
          {visibleDays.map((day) =>
            day.items.map((item, itemIndex) => {
              if (item.lat === 0 && item.lng === 0) return null;
              const color = ITEM_TYPE_COLOR[item.type] ?? DAY_COLORS[(day.day_number - 1) % DAY_COLORS.length];
              const label = item.type === "airport" ? "A" : item.type === "hotel" ? "H" : String(itemIndex + 1);
              return (
                <AdvancedMarker
                  key={`${day.day_number}-${itemIndex}`}
                  position={{ lat: item.lat, lng: item.lng }}
                  onClick={() => {
                    setInfoMarker({ name: item.name, address: item.address, type: item.type });
                    setInfoPos({ lat: item.lat, lng: item.lng });
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-[10px] font-bold font-body"
                    style={{ background: color }}
                  >
                    {label}
                  </div>
                </AdvancedMarker>
              );
            })
          )}

          {/* Selected location highlight ring */}
          {selectedLatLng && (
            <AdvancedMarker position={selectedLatLng} zIndex={999}>
              <div style={{ position: "relative", width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  border: "2.5px solid #E07A5F",
                  animation: "ping 1.4s cubic-bezier(0,0,0.2,1) infinite",
                  opacity: 0.6,
                }} />
                <div style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "#E07A5F",
                  border: "3px solid white",
                  boxShadow: "0 0 0 2px #E07A5F, 0 2px 8px rgba(224,122,95,0.6)",
                }} />
              </div>
            </AdvancedMarker>
          )}

          {/* Route polylines */}
          {visibleDays.map((day) =>
            day.items.map((item, i) => {
              if (i >= day.items.length - 1) return null;
              const next = day.items[i + 1];
              if (next.lat === 0 && next.lng === 0) return null;
              if (item.lat === 0 && item.lng === 0) return null;
              const mode: HopMode = (item.transport_mode as HopMode) ?? "walking";
              const style = POLYLINE_STYLE[mode] ?? POLYLINE_STYLE.walking;

              if (item.route_polyline_to_next) {
                return (
                  <Polyline
                    key={`poly-${day.day_number}-${i}`}
                    encodedPath={item.route_polyline_to_next}
                    {...style}
                  />
                );
              }

              // Straight-line fallback when API returned no polyline (common for transit)
              return (
                <Polyline
                  key={`poly-${day.day_number}-${i}`}
                  path={[{ lat: item.lat, lng: item.lng }, { lat: next.lat, lng: next.lng }]}
                  strokeColor={style.strokeColor}
                  strokeWeight={2}
                  strokeOpacity={0.45}
                  icons={[{ icon: { path: "M 0,-1 0,1", strokeOpacity: 0.7, scale: 2 }, offset: "0", repeat: "8px" }]}
                />
              );
            })
          )}

          {infoMarker && infoPos && (
            <InfoWindow position={infoPos} onCloseClick={() => { setInfoMarker(null); setInfoPos(null); }}>
              <div className="p-1">
                <p className="font-semibold text-sm font-body" style={{ color: "#1a1a2e" }}>{infoMarker.name}</p>
                <p className="text-xs font-body" style={{ color: "#444" }}>{infoMarker.address}</p>
              </div>
            </InfoWindow>
          )}
      </Map>
    </div>
  );
}
