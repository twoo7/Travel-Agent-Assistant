"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { DayPlan, HopMode } from "@/types/trip";
import { DayItemCard } from "./DayItemCard";
import { DistanceConnector } from "./DistanceConnector";

interface Props {
  day: DayPlan;
  onRemoveItem: (dayNumber: number, itemIndex: number) => void;
  onModeChange?: (dayNumber: number, itemIndex: number, mode: HopMode) => void;
  isFocused?: boolean;
  onFocus?: (day: number | null) => void;
}

export function DayColumn({ day, onRemoveItem, onModeChange, isFocused, onFocus }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${day.day_number}` });

  const itemIds = day.items.map((_, i) => `${day.day_number}-${i}`);

  const focusedBorder = isFocused ? "rgba(224,122,95,0.6)" : isOver ? "rgba(224,122,95,0.5)" : "var(--glass-border-1)";

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "var(--glass-1)", border: `1px solid ${focusedBorder}`, boxShadow: isFocused ? "0 0 0 1px rgba(224,122,95,0.2)" : undefined }}
    >
      <div
        className="px-4 py-2.5 flex items-center justify-between cursor-pointer select-none"
        style={{ background: "var(--glass-2)", borderBottom: "1px solid var(--glass-border-1)" }}
        onClick={() => onFocus?.(isFocused ? null : day.day_number)}
      >
        <div>
          <span className="font-semibold text-sm font-body" style={{ color: "var(--text-primary)" }}>Day {day.day_number}</span>
          <span className="text-xs ml-2 font-body" style={{ color: "var(--text-muted)" }}>{day.date}</span>
        </div>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full font-body"
          style={{ color: "var(--accent)", background: "rgba(224,122,95,0.15)" }}
        >
          {day.city}
        </span>
      </div>

      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className="p-3 space-y-1 min-h-[80px] transition-colors duration-150"
          style={{}}
        >
          {day.items.length === 0 && (
            <div
              className="text-center text-xs py-4 rounded-lg font-body"
              style={{ border: "2px dashed rgba(255,255,255,0.12)", color: "var(--text-subtle)" }}
            >
              Drop items here
            </div>
          )}
          {day.items.map((item, i) => (
            <div key={`${day.day_number}-${i}`}>
              <DayItemCard
                item={item}
                itemId={`${day.day_number}-${i}`}
                onRemove={item.type !== "airport" ? () => onRemoveItem(day.day_number, i) : undefined}
              />
              {i < day.items.length - 1 && (
                <DistanceConnector
                  distanceKm={item.distance_to_next_km}
                  travelTimeMins={item.travel_time_to_next_mins}
                  mode={item.transport_mode}
                  onModeChange={onModeChange ? (mode) => onModeChange(day.day_number, i, mode) : undefined}
                />
              )}
            </div>
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
