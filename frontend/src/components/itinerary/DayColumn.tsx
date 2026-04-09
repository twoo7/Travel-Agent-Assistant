"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { DayPlan } from "@/types/trip";
import { DayItemCard } from "./DayItemCard";
import { DistanceConnector } from "./DistanceConnector";

interface Props {
  day: DayPlan;
  onRemoveItem: (dayNumber: number, itemIndex: number) => void;
}

export function DayColumn({ day, onRemoveItem }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${day.day_number}` });

  const itemIds = day.items.map((_, i) => `${day.day_number}-${i}`);

  return (
    <div className="bg-background rounded-xl border border-gray-100 overflow-hidden shadow-card">
      <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center justify-between">
        <div>
          <span className="font-semibold text-charcoal text-sm font-body">Day {day.day_number}</span>
          <span className="text-muted text-xs ml-2 font-body">{day.date}</span>
        </div>
        <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full font-body">
          {day.city}
        </span>
      </div>

      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`p-3 space-y-1 min-h-[80px] transition-colors duration-150 ${
            isOver ? "bg-primary/5" : ""
          }`}
        >
          {day.items.length === 0 && (
            <div className="text-center text-xs text-subtle py-4 border-2 border-dashed border-gray-200 rounded-lg font-body">
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
                />
              )}
            </div>
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
