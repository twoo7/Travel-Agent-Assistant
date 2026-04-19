"use client";

import { useState, useEffect } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  Polyline,
  useMap,
} from "@vis.gl/react-google-maps";
import type { DayPlan, HopMode } from "@/types/trip";
import { MapPin } from "lucide-react";

interface Props {
  days: DayPlan[];
  currentLeg?: number;
  focusedDay?: number | null;
  onFocusedDayChange?: (day: number | null) => void;
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
    strokeWeight: 2,
    strokeOpacity: 0,
    icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 2 }, offset: "0", repeat: "6px" }],
  },
};

interface MarkerInfo { name: string; address: string; type: string; }
interface LatLng { lat: number; lng: number; }

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

export function TripMap({ days, currentLeg, focusedDay, onFocusedDayChange }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const [infoMarker, setInfoMarker] = useState<MarkerInfo | null>(null);
  const [infoPos, setInfoPos] = useState<LatLng | null>(null);

  const legDays = currentLeg != null ? days.filter((d) => d.leg_number === currentLeg) : days;
  const visibleDays = focusedDay != null ? legDays.filter((d) => d.day_number === focusedDay) : legDays;

  const allItems = legDays.flatMap((d) => d.items).filter((i) => i.lat !== 0 || i.lng !== 0);
  const center = allItems.length > 0 ? { lat: allItems[0].lat, lng: allItems[0].lng } : { lat: 48.8566, lng: 2.3522 };

  if (!apiKey || apiKey === "your_google_maps_api_key_here") {
    return (
      <div
        className="flex-1 rounded-xl flex items-center justify-center min-h-[400px]"
        style={{ background: "var(--glass-1)", border: "1px solid var(--glass-border-1)" }}
      >
        <div className="text-center">
          <MapPin size={32} className="mx-auto mb-2" style={{ color: "var(--text-subtle)" }} />
          <p className="text-sm font-body" style={{ color: "var(--text-muted)" }}>Map unavailable</p>
          <p className="text-xs mt-1 font-body" style={{ color: "var(--text-subtle)" }}>Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-2 min-h-[400px]">
      {/* Map header — focused day indicator + All days reset */}
      {focusedDay != null && (
        <div
          className="flex items-center justify-between px-3 py-1.5 rounded-xl"
          style={{ background: "var(--glass-2)", border: "1px solid var(--glass-border-2)" }}
        >
          <span className="text-xs font-medium font-body" style={{ color: "var(--text-primary)" }}>
            Day {focusedDay}
          </span>
          <button
            onClick={() => onFocusedDayChange?.(null)}
            className="text-xs px-2 py-0.5 rounded-full transition-colors font-body"
            style={{ background: "var(--glass-1)", color: "var(--text-muted)", border: "1px solid var(--glass-border-1)" }}
          >
            All days
          </button>
        </div>
      )}

      <APIProvider apiKey={apiKey}>
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

          {/* Route polylines */}
          {visibleDays.map((day) =>
            day.items.map((item, i) => {
              if (!item.route_polyline_to_next) return null;
              const mode: HopMode = (item.transport_mode as HopMode) ?? "walking";
              const style = POLYLINE_STYLE[mode] ?? POLYLINE_STYLE.walking;
              return (
                <Polyline
                  key={`poly-${day.day_number}-${i}`}
                  encodedPath={item.route_polyline_to_next}
                  {...style}
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
      </APIProvider>
    </div>
  );
}
