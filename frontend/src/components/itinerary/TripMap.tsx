"use client";

import { useState } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
} from "@vis.gl/react-google-maps";
import type { DayPlan } from "@/types/trip";
import { MapPin } from "lucide-react";

interface Props {
  days: DayPlan[];
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

export function TripMap({ days }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [infoMarker, setInfoMarker] = useState<MarkerInfo | null>(null);
  const [infoPos, setInfoPos] = useState<{ lat: number; lng: number } | null>(null);

  const visibleDays = activeDay === null ? days : days.filter((d) => d.day_number === activeDay);

  const allItems = days.flatMap((d) => d.items).filter((i) => i.lat !== 0 || i.lng !== 0);
  const center =
    allItems.length > 0
      ? { lat: allItems[0].lat, lng: allItems[0].lng }
      : { lat: 48.8566, lng: 2.3522 };

  if (!apiKey || apiKey === "your_google_maps_api_key_here") {
    return (
      <div className="flex-1 rounded-xl bg-background border border-gray-100 shadow-card flex items-center justify-center min-h-[400px]">
        <div className="text-center text-muted">
          <MapPin size={32} className="mx-auto mb-2 text-subtle" />
          <p className="text-sm font-body">Map unavailable</p>
          <p className="text-xs mt-1 font-body text-subtle">Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-2 min-h-[400px]">
      {/* Day filter tabs */}
      <div className="flex gap-1 flex-wrap">
        <button
          onClick={() => setActiveDay(null)}
          className={`text-xs px-2.5 py-1 rounded-full transition-colors font-body font-medium ${
            activeDay === null
              ? "bg-charcoal text-white"
              : "bg-gray-100 text-charcoal/70 hover:bg-gray-200"
          }`}
        >
          All
        </button>
        {days.map((d) => (
          <button
            key={d.day_number}
            onClick={() => setActiveDay(d.day_number === activeDay ? null : d.day_number)}
            className="text-xs px-2.5 py-1 rounded-full transition-all font-body font-medium"
            style={{
              background: activeDay === d.day_number
                ? DAY_COLORS[(d.day_number - 1) % DAY_COLORS.length]
                : "#F3F4F6",
              color: activeDay === d.day_number ? "white" : "#3D3D3D",
            }}
          >
            Day {d.day_number}
          </button>
        ))}
      </div>

      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={center}
          defaultZoom={13}
          mapId="travel-agent-map"
          className="flex-1 rounded-xl border border-gray-100 shadow-card min-h-[400px]"
        >
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
                <p className="font-semibold text-sm text-charcoal font-body">{infoMarker.name}</p>
                <p className="text-xs text-muted font-body">{infoMarker.address}</p>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>
    </div>
  );
}
