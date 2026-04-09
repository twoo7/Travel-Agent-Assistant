"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { DayPlan, POI } from "@/types/trip";
import { DayColumn } from "./DayColumn";

interface Props {
  days: DayPlan[];
  onDaysChange: (days: DayPlan[]) => void;
  unscheduledPois?: POI[];
}

export function DayPlanner({ days, onDaysChange }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Parse itemId format: "<dayNumber>-<itemIndex>"
    const [activeDayStr, activeIdxStr] = String(active.id).split("-");
    const [overDayStr, overIdxStr] = String(over.id).split("-");

    const activeDayNum = parseInt(activeDayStr);
    const overDayNum = parseInt(overDayStr);

    if (activeDayNum === overDayNum) {
      // Reorder within same day
      const dayIndex = days.findIndex((d) => d.day_number === activeDayNum);
      if (dayIndex === -1) return;
      const day = days[dayIndex];
      const from = parseInt(activeIdxStr);
      const to = parseInt(overIdxStr);
      const newItems = arrayMove(day.items, from, to);
      const newDays = days.map((d) =>
        d.day_number === activeDayNum ? { ...d, items: newItems } : d
      );
      onDaysChange(newDays);
    } else {
      // Move item between days
      const activeDayIndex = days.findIndex((d) => d.day_number === activeDayNum);
      const overDayIndex = days.findIndex((d) => d.day_number === overDayNum);
      if (activeDayIndex === -1 || overDayIndex === -1) return;

      const activeItemIndex = parseInt(activeIdxStr);
      const item = days[activeDayIndex].items[activeItemIndex];
      if (!item) return;

      const newDays = days.map((d, i) => {
        if (i === activeDayIndex) {
          return { ...d, items: d.items.filter((_, idx) => idx !== activeItemIndex) };
        }
        if (i === overDayIndex) {
          const insertAt = parseInt(overIdxStr);
          const newItems = [...d.items];
          newItems.splice(isNaN(insertAt) ? newItems.length : insertAt, 0, item);
          return { ...d, items: newItems };
        }
        return d;
      });
      onDaysChange(newDays);
    }
  }

  function handleRemoveItem(dayNumber: number, itemIndex: number) {
    const newDays = days.map((d) => {
      if (d.day_number !== dayNumber) return d;
      return { ...d, items: d.items.filter((_, i) => i !== itemIndex) };
    });
    onDaysChange(newDays);
  }

  if (days.length === 0) {
    return (
      <div className="text-center py-12 text-muted border-2 border-dashed border-gray-200 rounded-xl">
        <p className="text-sm font-body">No days planned yet.</p>
        <p className="text-xs mt-1 font-body">Days will appear here once hotels are confirmed.</p>
      </div>
    );
  }

  // Group days by leg
  const legGroups: Record<number, DayPlan[]> = {};
  for (const day of days) {
    if (!legGroups[day.leg_number]) legGroups[day.leg_number] = [];
    legGroups[day.leg_number].push(day);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        {Object.entries(legGroups).map(([legNum, legDays]) => (
          <div key={legNum}>
            <h3 className="text-xs font-semibold text-muted uppercase tracking-widest mb-2 font-body">
              {legDays[0]?.city} — {legDays.length} day{legDays.length > 1 ? "s" : ""}
            </h3>
            <div className="space-y-3">
              {legDays.map((day) => (
                <DayColumn
                  key={day.day_number}
                  day={day}
                  onRemoveItem={handleRemoveItem}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </DndContext>
  );
}
