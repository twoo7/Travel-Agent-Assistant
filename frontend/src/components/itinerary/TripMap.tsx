"use client";

import { useState, useEffect } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from "@vis.gl/react-google-maps";
import type { DayPlan } from "@/types/trip";
import { MapPin } from "lucide-react";

interface Props {
  days: DayPlan[];
  currentLeg?: number;
  focusedDay?: number | null;
  onFocusedDayChange?: (day: number | null) => void;
}

// Design-token-aligned day colors (cycle through primary, accent, success, warning shades)
const DAY_COLORS = [
  "#1B3A4B", // primary
  "#E07A5F", // accent
  "#6B9080", // success
  "#D4A574", // warning
  "#2D5A73", // primary-dark approx
  "#C4684F", // accent-dark approx
  "#577A6C", // success-dark approx
  "#B88A5E", // warning-dark approx
  "#3A7CA5", // teal
  "#8B4B3A", // terracotta
];

const ITEM_TYPE_COLOR: Record<string, string> = {
  hotel: "#1B3A4B",   // primary
  airport: "#E07A5F", // accent
};

interface MarkerInfo {
  name: string;
  address: string;
  type: string;
}

interface LatLng { lat: number; lng: number; }

function BoundsFitter({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map || points.length === 0) return;
    if (points.length === 1) {
      map.setCenter(points[0]);
      map.setZoom(14);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    points.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 60);
  }, [map, points]);
  return null;
}

export function TripMap({ days, currentLeg }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [infoMarker, setInfoMarker] = useState<MarkerInfo | null>(null);
  const [infoPos, setInfoPos] = useState<{ lat: number; lng: number } | null>(null);

  const legDays = currentLeg != null ? days.filter((d) => d.leg_number === currentLeg) : days;
  const visibleDays = activeDay === null ? legDays : legDays.filter((d) => d.day_number === activeDay);

  const allItems = legDays.flatMap((d) => d.items).filter((i) => i.lat !== 0 || i.lng !== 0);
  const center =
    allItems.length > 0
      ? { lat: allItems[0].lat, lng: allItems[0].lng }
      : { lat: 48.8566, lng: 2.3522 };

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
      {/* Day filter tabs */}
      <div className="flex gap-1 flex-wrap p-1.5 rounded-xl" style={{ background: "var(--glass-2)", backdropFilter: "blur(12px)", border: "1px solid var(--glass-border-2)" }}>
        <button
          onClick={() => setActiveDay(null)}
          className="text-xs px-2.5 py-1 rounded-full transition-colors font-body font-medium"
          style={activeDay === null
            ? { background: "var(--accent)", color: "white" }
            : { background: "var(--glass-2)", color: "var(--text-muted)", border: "1px solid var(--glass-border-2)" }
          }
        >
          All
        </button>
        {legDays.map((d) => (
          <button
            key={d.day_number}
            onClick={() => setActiveDay(d.day_number === activeDay ? null : d.day_number)}
            className="text-xs px-2.5 py-1 rounded-full transition-all font-body font-medium"
            style={{
              background: activeDay === d.day_number ? DAY_COLORS[(d.day_number - 1) % DAY_COLORS.length] : "var(--glass-2)",
              color: activeDay === d.day_number ? "white" : "var(--text-muted)",
              border: activeDay === d.day_number ? "none" : "1px solid var(--glass-border-2)",
            }}
          >
            Day {d.day_number}
          </button>
        ))}
      </div>

      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={center}
          defaultZoom={allItems.length === 0 ? 3 : 13}
          mapId="travel-agent-map"
          className="flex-1 rounded-xl min-h-[400px]"
          style={{ border: "1px solid var(--glass-border-1)", borderRadius: "12px", overflow: "hidden" }}
        >
          <BoundsFitter points={visibleDays.flatMap((d) => d.items).filter((i) => i.lat !== 0 || i.lng !== 0).map((i) => ({ lat: i.lat, lng: i.lng }))} />
          {visibleDays.map((day) =>
            day.items.map((item, itemIndex) => {
              if (item.lat === 0 && item.lng === 0) return null;
              const color =
                ITEM_TYPE_COLOR[item.type] ??
                DAY_COLORS[(day.day_number - 1) % DAY_COLORS.length];
              const label =
                item.type === "airport"
                  ? "A"
                  : item.type === "hotel"
                  ? "H"
                  : String(itemIndex + 1);
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

          {infoMarker && infoPos && (
            <InfoWindow
              position={infoPos}
              onCloseClick={() => { setInfoMarker(null); setInfoPos(null); }}
            >
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
