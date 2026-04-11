"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { DayPlan } from "@/types/trip";
import { DayColumn } from "./DayColumn";

interface Props {
  days: DayPlan[];
  onDaysChange: (days: DayPlan[]) => void;
}

export function DayPlanner({ days, onDaysChange }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [activeId, setActiveId] = useState<string | null>(null);

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }

    // Parse itemId format: "<dayNumber>-<itemIndex>"
    const [activeDayStr, activeIdxStr] = String(active.id).split("-");
    const [overDayStr, overIdxStr] = String(over.id).split("-");

    const activeDayNum = parseInt(activeDayStr);
    const overDayNum = parseInt(overDayStr);

    if (activeDayNum === overDayNum) {
      // Reorder within same day
      const dayIndex = days.findIndex((d) => d.day_number === activeDayNum);
      if (dayIndex === -1) { setActiveId(null); return; }
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
      if (activeDayIndex === -1 || overDayIndex === -1) { setActiveId(null); return; }

      const activeItemIndex = parseInt(activeIdxStr);
      const item = days[activeDayIndex].items[activeItemIndex];
      if (!item) { setActiveId(null); return; }

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
    setActiveId(null);
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
      <div
        className="text-center py-12 rounded-xl"
        style={{ color: "var(--text-muted)", border: "2px dashed rgba(255,255,255,0.12)" }}
      >
        <p className="text-sm font-body" style={{ color: "var(--text-muted)" }}>No days planned yet.</p>
        <p className="text-xs mt-1 font-body" style={{ color: "var(--text-muted)" }}>Days will appear here once hotels are confirmed.</p>
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
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        {Object.entries(legGroups).map(([legNum, legDays]) => (
          <div key={legNum}>
            <h3
              className="text-[10px] font-semibold uppercase tracking-[2.5px] mb-2 font-body"
              style={{ color: "var(--text-eyebrow)" }}
            >
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
      <DragOverlay>
        {activeId ? (
          <div style={{ opacity: 0.85, transform: "scale(1.04)", boxShadow: "0 0 20px var(--accent-glow)" }}>
            <div
              className="rounded-lg px-3 py-2 text-sm font-body"
              style={{ background: "var(--glass-3)", border: "1px solid var(--accent)", color: "var(--text-primary)" }}
            >
              Dragging...
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
