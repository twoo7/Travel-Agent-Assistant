"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { DayPlan, HopMode } from "@/types/trip";
import { DayItemCard } from "./DayItemCard";
import { DistanceConnector } from "./DistanceConnector";
import { iataToCityName } from "@/utils/airportNames";

interface Props {
  day: DayPlan;
  onRemoveItem: (dayNumber: number, itemIndex: number) => void;
  onModeChange?: (dayNumber: number, itemIndex: number, mode: HopMode) => void;
  onOpenDetails?: (dayNumber: number, itemIndex: number) => void;
  isFocused?: boolean;
  onToggleDay?: (dayNumber: number) => void;
}

export function DayColumn({ day, onRemoveItem, onModeChange, onOpenDetails, isFocused, onToggleDay }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${day.day_number}` });

  const itemIds = day.items.map((_, i) => `${day.day_number}-${i}`);

  const columnClass = isFocused
    ? "rounded-xl overflow-hidden bg-surface border-2 border-teal ring-1 ring-teal/20"
    : isOver
    ? "rounded-xl overflow-hidden bg-surface border-2 border-teal/50"
    : "rounded-xl overflow-hidden bg-surface border border-border";

  return (
    <div className={columnClass}>
      <div
        className="px-4 py-2.5 flex items-center justify-between cursor-pointer select-none bg-surface2 border-b border-border"
        onClick={() => onToggleDay?.(day.day_number)}
      >
        <div>
          <span className="font-semibold text-sm font-body text-ink">Day {day.day_number}</span>
          <span className="text-xs ml-2 font-body text-ink-muted">{day.date}</span>
        </div>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full font-body text-teal bg-teal-light">
          {iataToCityName(day.city)}
        </span>
      </div>

      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className="p-3 space-y-1 min-h-[80px] transition-colors duration-150"
        >
          {day.items.length === 0 && (
            <div className="text-center text-xs py-4 rounded-lg font-body border-2 border-dashed border-border text-ink-subtle">
              Drop items here
            </div>
          )}
          {day.items.map((item, i) => (
            <div key={`${day.day_number}-${i}`}>
              <DayItemCard
                item={item}
                itemId={`${day.day_number}-${i}`}
                onRemove={item.type !== "airport" ? () => onRemoveItem(day.day_number, i) : undefined}
                onOpenDetails={onOpenDetails ? () => onOpenDetails(day.day_number, i) : undefined}
              />
              {i < day.items.length - 1 && (
                <DistanceConnector
                  distanceKm={item.distance_to_next_km}
                  travelTimeMins={item.travel_time_to_next_mins}
                  mode={item.transport_mode}
                  onModeChange={onModeChange ? (mode) => onModeChange(day.day_number, i, mode) : undefined}
                  fromLat={item.lat}
                  fromLng={item.lng}
                  toLat={day.items[i + 1]?.lat}
                  toLng={day.items[i + 1]?.lng}
                />
              )}
            </div>
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
