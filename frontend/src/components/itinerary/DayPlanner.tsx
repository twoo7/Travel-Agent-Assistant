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
import type { DetailTarget } from "./LocationDetailSheet";
import { useToast } from "@/components/ui/Toast";
import { iataToCityName } from "@/utils/airportNames";

interface Props {
  days: DayPlan[];
  onDaysChange: (days: DayPlan[]) => void;
  unscheduledPois?: POI[];
  focusedDay?: number | null;
  onFocusedDayChange?: (day: number | null) => void;
  onSaveHotel?: (saved: SavedHotel) => void;
  onSavePOI?: (item: DayItem) => void;
  onOpenDetail?: (target: DetailTarget) => void;
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
  onSavePOI,
  onOpenDetail,
}: Props) {
  const { toast } = useToast();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<DayItem | null>(null);

  // Snapshot at drag-start for cancel revert
  const preDragDays = useRef<DayPlan[] | null>(null);

  // Working copy during drag
  const [workingDays, setWorkingDays] = useState<DayPlan[] | null>(null);

  // Track dragged item by reference so we can find it even after cross-day moves
  const dragItemRef = useRef<DayItem | null>(null);
  const dragCurrentDayRef = useRef<number | null>(null);

  const displayDays = workingDays ?? days;

  function handleDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    const { dayNumber, idx } = parseId(id);
    const day = days.find((d) => d.day_number === dayNumber);
    const item = day?.items[idx];
    if (!item || item.type === "hotel") return;

    dragItemRef.current = item;
    dragCurrentDayRef.current = dayNumber;
    preDragDays.current = days;
    setWorkingDays([...days]);
    setActiveItem(item);
    setActiveId(id);
  }

  const handleDragOver = useCallback(
    (e: DragOverEvent) => {
      const { over } = e;
      if (!over || !dragItemRef.current) return;

      const overStr = String(over.id);
      const overIsDayContainer = overStr.startsWith("day-");
      const overDayNum = overIsDayContainer
        ? parseInt(overStr.replace("day-", ""))
        : parseId(overStr).dayNumber;
      const sourceDayNum = dragCurrentDayRef.current;
      if (sourceDayNum == null) return;

      // Same day — let SortableContext handle intra-day ordering on drop
      if (sourceDayNum === overDayNum) return;

      setWorkingDays((prev) => {
        const base = prev ?? days;

        // Find item by reference equality in the current source day
        const srcDayData = base.find((d) => d.day_number === sourceDayNum);
        const srcIdx = srcDayData?.items.findIndex((it) => it === dragItemRef.current) ?? -1;
        if (srcIdx === -1) return prev;

        const targetDayData = base.find((d) => d.day_number === overDayNum);
        if (!targetDayData) return prev;

        const overIdx = overIsDayContainer
          ? targetDayData.items.length
          : parseId(overStr).idx;

        const next = base.map((d) => {
          if (d.day_number === sourceDayNum) {
            return { ...d, items: d.items.filter((_, i) => i !== srcIdx) };
          }
          if (d.day_number === overDayNum) {
            const items = [...d.items];
            items.splice(isNaN(overIdx) ? items.length : overIdx, 0, dragItemRef.current!);
            return { ...d, items };
          }
          return d;
        });

        // Update source day so subsequent drag-overs compute correctly
        dragCurrentDayRef.current = overDayNum;
        return next;
      });
    },
    [days]
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const base = workingDays ?? days;

    if (!over || !dragItemRef.current) {
      // No valid drop — commit working state or revert
      if (workingDays) onDaysChange(workingDays);
      cleanup();
      return;
    }

    const activeStr = String(active.id);
    const overStr = String(over.id);
    const overIsDayContainer = overStr.startsWith("day-");
    const overDayNum = overIsDayContainer
      ? parseInt(overStr.replace("day-", ""))
      : parseId(overStr).dayNumber;
    const currentDayNum = dragCurrentDayRef.current;

    if (currentDayNum != null && currentDayNum === overDayNum) {
      // Intra-day reorder: apply arrayMove on the current working day
      const dayIndex = base.findIndex((d) => d.day_number === currentDayNum);
      if (dayIndex === -1) { onDaysChange(base); cleanup(); return; }

      const currentItems = base[dayIndex].items;
      const srcIdx = currentItems.findIndex((it) => it === dragItemRef.current);
      const overIdx = overIsDayContainer
        ? currentItems.length - 1
        : parseId(overStr).idx;

      if (srcIdx !== -1 && srcIdx !== overIdx) {
        const newItems = arrayMove(currentItems, srcIdx, overIdx);
        const newDays = base.map((d) =>
          d.day_number === currentDayNum ? { ...d, items: newItems } : d
        );
        onDaysChange(newDays);
      } else {
        onDaysChange(base);
      }
    } else {
      // Cross-day move: workingDays already has the correct state from handleDragOver
      onDaysChange(base);
    }

    // Suppress unused variable warning — activeStr used for parseId in same-day fallback
    void activeStr;

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
    dragItemRef.current = null;
    dragCurrentDayRef.current = null;
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

    const newDays = displayDays.map((d) => {
      if (d.day_number !== dayNumber) return d;
      return { ...d, items: d.items.filter((_, i) => i !== itemIndex) };
    });
    onDaysChange(newDays);

    if (item?.type === "hotel") {
      const savedHotel: SavedHotel = {
        id: `hotel-${dayNumber}-${Date.now()}`,
        item,
        day_number: dayNumber,
        leg_number: day!.leg_number,
        original_day_index: itemIndex,
      };
      onSaveHotel?.(savedHotel);

      toast(`${item.name} removed`, {
        onUndo: () => {
          onDaysChange(
            displayDays.map((d) => {
              if (d.day_number !== dayNumber) return d;
              const items = [...d.items];
              items.splice(itemIndex, 0, item);
              return { ...d, items };
            })
          );
        },
      });
    }
  }

  function handleMoveItem(itemIndex: number, fromDay: number, toDay: number) {
    const item = displayDays.find((d) => d.day_number === fromDay)?.items[itemIndex];
    if (!item) return;
    const newDays = displayDays.map((d) => {
      if (d.day_number === fromDay) return { ...d, items: d.items.filter((_, i) => i !== itemIndex) };
      if (d.day_number === toDay) return { ...d, items: [...d.items, item] };
      return d;
    });
    onDaysChange(newDays);
  }

  function handleMoveToSaved(itemIndex: number, dayNumber: number) {
    const item = displayDays.find((d) => d.day_number === dayNumber)?.items[itemIndex];
    if (!item || item.type !== "poi") return;
    onSavePOI?.(item);
    const newDays = displayDays.map((d) =>
      d.day_number === dayNumber ? { ...d, items: d.items.filter((_, i) => i !== itemIndex) } : d
    );
    onDaysChange(newDays);
  }

  function handleOpenDetail(dayNumber: number, itemIndex: number) {
    if (!onOpenDetail) return;
    const item = displayDays.find((d) => d.day_number === dayNumber)?.items[itemIndex];
    if (!item) return;
    onOpenDetail({
      source: "day",
      dayNumber,
      item,
      days: displayDays,
      onRemove: () => handleRemoveItem(dayNumber, itemIndex),
      onMoveToDay: (toDay) => handleMoveItem(itemIndex, dayNumber, toDay),
      onMoveToSaved: () => handleMoveToSaved(itemIndex, dayNumber),
    });
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
              {iataToCityName(legDays[0]?.city ?? "")} — {legDays.length} day{legDays.length > 1 ? "s" : ""}
            </h3>
            <div className="space-y-3">
              {legDays.map((day) => (
                <DayColumn
                  key={day.day_number}
                  day={day}
                  onRemoveItem={handleRemoveItem}
                  onModeChange={handleModeChange}
                  onOpenDetails={handleOpenDetail}
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
