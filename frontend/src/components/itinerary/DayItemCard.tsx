"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DayItem } from "@/types/trip";

interface Props {
  item: DayItem;
  itemId: string;
  onRemove?: () => void;
  isDragging?: boolean;
}

const TYPE_ICON: Record<string, string> = {
  poi: "📍",
  hotel: "🏨",
  airport: "✈️",
};

const TRANSPORT_ICON: Record<string, string> = {
  flight: "✈️",
  train: "🚂",
  ferry: "⛴",
  car: "🚗",
};

const TYPE_COLOR: Record<string, string> = {
  poi: "border-blue-200 bg-white",
  hotel: "border-purple-200 bg-purple-50",
  airport: "border-orange-200 bg-orange-50",
};

export function DayItemCard({ item, itemId, onRemove, isDragging }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: itemId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-lg px-3 py-2 flex items-start gap-2 ${TYPE_COLOR[item.type] ?? "border-gray-200 bg-white"} ${isDragging ? "shadow-lg ring-2 ring-blue-400" : ""}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 mt-0.5 shrink-0 select-none"
        aria-label="Drag handle"
      >
        ⠿
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm">
            {item.transport_mode ? TRANSPORT_ICON[item.transport_mode] : TYPE_ICON[item.type]}
          </span>
          <span className="text-sm font-medium text-gray-900 truncate">{item.name}</span>
          {item.spans_days && item.spans_days > 1 && (
            <span className="text-xs bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded font-medium shrink-0">
              spans {item.spans_days} days
            </span>
          )}
        </div>
        {item.address && (
          <p className="text-xs text-gray-400 truncate mt-0.5">{item.address}</p>
        )}
        {item.duration_mins && (
          <p className="text-xs text-gray-400">⏱ {item.duration_mins} min</p>
        )}
      </div>

      {onRemove && item.type !== "airport" && (
        <button
          onClick={onRemove}
          className="text-gray-300 hover:text-red-500 transition-colors shrink-0 mt-0.5"
          aria-label="Remove"
        >
          ✕
        </button>
      )}
    </div>
  );
}
