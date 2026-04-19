"use client";

import { useState, useRef, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { DayPlan, DayItem, POI, SavedHotel, HopMode } from "@/types/trip";
import { DayColumn } from "./DayColumn";
import { DayItemCard } from "./DayItemCard";

interface Props {
  days: DayPlan[];
  onDaysChange: (days: DayPlan[]) => void;
  unscheduledPois?: POI[];
  focusedDay?: number | null;
  onFocusedDayChange?: (day: number | null) => void;
  onSaveHotel?: (saved: SavedHotel) => void;
}

/** Parse the itemId format "<dayNumber>-<itemIndex>" */
function parseId(id: string): { dayNumber: number; idx: number } {
  const [d, i] = id.split("-");
  return { dayNumber: parseInt(d), idx: parseInt(i) };
}

export function DayPlanner({
  days,
  onDaysChange,
  focusedDay,
  onFocusedDayChange,
  onSaveHotel,
}: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<DayItem | null>(null);

  // Snapshot of days at drag-start — used for cancel revert
  const preDragDays = useRef<DayPlan[] | null>(null);

  // Working copy during drag (for optimistic cross-day moves)
  const [workingDays, setWorkingDays] = useState<DayPlan[] | null>(null);

  const displayDays = workingDays ?? days;

  function handleDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    setActiveId(id);
    preDragDays.current = days;
    setWorkingDays([...days]);

    const { dayNumber, idx } = parseId(id);
    const day = days.find((d) => d.day_number === dayNumber);
    setActiveItem(day?.items[idx] ?? null);
  }

  const handleDragOver = useCallback(
    (e: DragOverEvent) => {
      const { active, over } = e;
      if (!over || active.id === over.id) return;

      const activeStr = String(active.id);
      const overStr = String(over.id);

      const { dayNumber: activeDayNum, idx: activeIdx } = parseId(activeStr);
      // over can be an item id or a droppable day container id ("day-N")
      const overIsDayContainer = overStr.startsWith("day-");
      const overDayNum = overIsDayContainer
        ? parseInt(overStr.replace("day-", ""))
        : parseId(overStr).dayNumber;

      if (activeDayNum === overDayNum) return; // same day — handled by sortable

      setWorkingDays((prev) => {
        const base = prev ?? days;
        const sourceDayIdx = base.findIndex((d) => d.day_number === activeDayNum);
        const targetDayIdx = base.findIndex((d) => d.day_number === overDayNum);
        if (sourceDayIdx === -1 || targetDayIdx === -1) return prev;

        const item = base[sourceDayIdx].items[activeIdx];
        if (!item || item.type === "hotel") return prev; // hotels can't be dragged

        const newDays = base.map((d, i) => {
          if (i === sourceDayIdx) {
            return { ...d, items: d.items.filter((_, idx) => idx !== activeIdx) };
          }
          if (i === targetDayIdx) {
            const overIdx = overIsDayContainer
              ? d.items.length
              : parseId(overStr).idx;
            const newItems = [...d.items];
            newItems.splice(isNaN(overIdx) ? newItems.length : overIdx, 0, item);
            return { ...d, items: newItems };
          }
          return d;
        });
        return newDays;
      });
    },
    [days]
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      // No valid drop — commit working state as-is or revert
      if (workingDays) onDaysChange(workingDays);
      cleanup();
      return;
    }

    const activeStr = String(active.id);
    const overStr = String(over.id);

    const { dayNumber: activeDayNum, idx: activeIdxOrig } = parseId(activeStr);
    const overIsDayContainer = overStr.startsWith("day-");
    const overDayNum = overIsDayContainer
      ? parseInt(overStr.replace("day-", ""))
      : parseId(overStr).dayNumber;

    const base = workingDays ?? days;

    if (activeDayNum === overDayNum) {
      // Same-day reorder (workingDays may already be correct, but apply arrayMove to be safe)
      const dayIndex = base.findIndex((d) => d.day_number === activeDayNum);
      if (dayIndex === -1) { if (workingDays) onDaysChange(workingDays); cleanup(); return; }

      // Find active item's current position in working copy
      const currentDayItems = base[dayIndex].items;
      const overIdx = overIsDayContainer ? currentDayItems.length - 1 : parseId(overStr).idx;
      // Find active item current idx (may differ from original after drag-over moves)
      const activeCurrentIdx = currentDayItems.findIndex(
        (_, i) => `${activeDayNum}-${i}` === activeStr
      );
      const fromIdx = activeCurrentIdx !== -1 ? activeCurrentIdx : activeIdxOrig;
      const newItems = arrayMove(currentDayItems, fromIdx, overIdx);
      const newDays = base.map((d) =>
        d.day_number === activeDayNum ? { ...d, items: newItems } : d
      );
      onDaysChange(newDays);
    } else {
      // Cross-day: workingDays already reflects the optimistic move from handleDragOver
      onDaysChange(base);
    }

    cleanup();
  }

  function handleDragCancel() {
    if (preDragDays.current) onDaysChange(preDragDays.current);
    cleanup();
  }

  function cleanup() {
    setActiveId(null);
    setActiveItem(null);
    preDragDays.current = null;
    setWorkingDays(null);
  }

  function handleModeChange(dayNumber: number, itemIndex: number, mode: HopMode) {
    const newDays = displayDays.map((d) => {
      if (d.day_number !== dayNumber) return d;
      return {
        ...d,
        items: d.items.map((item, i) =>
          i === itemIndex ? { ...item, transport_mode: mode } : item
        ),
      };
    });
    onDaysChange(newDays);
  }

  function handleRemoveItem(dayNumber: number, itemIndex: number) {
    const day = displayDays.find((d) => d.day_number === dayNumber);
    const item = day?.items[itemIndex];

    if (item?.type === "hotel") {
      // Hotel delete: persist to saved_hotels via callback, remove from local days
      onSaveHotel?.({
        id: `hotel-${dayNumber}-${Date.now()}`,
        item,
        day_number: dayNumber,
        leg_number: day!.leg_number,
        original_day_index: itemIndex,
      });
    }

    // Always remove from local days (for hotels the SAVE_HOTEL context action handles persistence)
    const newDays = displayDays.map((d) => {
      if (d.day_number !== dayNumber) return d;
      return { ...d, items: d.items.filter((_, i) => i !== itemIndex) };
    });
    onDaysChange(newDays);
  }

  if (displayDays.length === 0) {
    return (
      <div
        className="text-center py-12 rounded-xl"
        style={{ color: "var(--text-muted)", border: "2px dashed rgba(255,255,255,0.12)" }}
      >
        <p className="text-sm font-body" style={{ color: "var(--text-muted)" }}>No days planned yet.</p>
        <p className="text-xs mt-1 font-body" style={{ color: "var(--text-muted)" }}>
          Days will appear here once hotels are confirmed.
        </p>
      </div>
    );
  }

  // Group days by leg
  const legGroups: Record<number, DayPlan[]> = {};
  for (const day of displayDays) {
    if (!legGroups[day.leg_number]) legGroups[day.leg_number] = [];
    legGroups[day.leg_number].push(day);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
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
                  onModeChange={handleModeChange}
                  isFocused={focusedDay === day.day_number}
                  onFocus={onFocusedDayChange}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeId && activeItem ? (
          <DayItemCard
            item={activeItem}
            itemId={activeId}
            isOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
