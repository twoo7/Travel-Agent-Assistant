"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DayItem } from "@/types/trip";
import { MapPin, Hotel, Plane, Train, Ship, Car, Clock, GripVertical, X } from "lucide-react";

interface Props {
  item: DayItem;
  itemId: string;
  onRemove?: () => void;
  isDragging?: boolean;
}

function getItemIcon(item: DayItem) {
  if (item.transport_mode) {
    const icons: Record<string, React.ReactNode> = {
      flight: <Plane size={13} />,
      train:  <Train size={13} />,
      ferry:  <Ship  size={13} />,
      car:    <Car   size={13} />,
    };
    return icons[item.transport_mode] ?? <Plane size={13} />;
  }
  const icons: Record<string, React.ReactNode> = {
    poi:     <MapPin  size={13} />,
    hotel:   <Hotel   size={13} />,
    airport: <Plane   size={13} />,
  };
  return icons[item.type] ?? <MapPin size={13} />;
}

const TYPE_STYLE: Record<string, string> = {
  poi:     "border-gray-200 bg-white",
  hotel:   "border-primary/20 bg-primary/5",
  airport: "border-accent/20 bg-accent/5",
};

const TYPE_ICON_COLOR: Record<string, string> = {
  poi:     "text-muted",
  hotel:   "text-primary",
  airport: "text-accent",
};

export function DayItemCard({ item, itemId, onRemove, isDragging }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: itemId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const borderStyle = TYPE_STYLE[item.type] ?? "border-gray-200 bg-white";
  const iconColor = TYPE_ICON_COLOR[item.type] ?? "text-muted";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-lg px-3 py-2 flex items-start gap-2 ${borderStyle} ${
        isDragging ? "shadow-card-hover ring-2 ring-primary/20" : ""
      }`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-subtle hover:text-muted mt-0.5 shrink-0 select-none"
        aria-label="Drag handle"
      >
        <GripVertical size={14} />
      </div>

      {/* Icon */}
      <span className={`shrink-0 mt-0.5 ${iconColor}`}>
        {getItemIcon(item)}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium text-charcoal truncate font-body">{item.name}</span>
          {item.spans_days && item.spans_days > 1 && (
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium shrink-0 font-body">
              spans {item.spans_days} days
            </span>
          )}
        </div>
        {item.address && (
          <p className="text-xs text-muted truncate mt-0.5 font-body">{item.address}</p>
        )}
        {item.duration_mins && (
          <p className="text-xs text-subtle flex items-center gap-1 mt-0.5 font-body">
            <Clock size={10} />
            {item.duration_mins} min
          </p>
        )}
      </div>

      {/* Remove */}
      {onRemove && item.type !== "airport" && (
        <button
          onClick={onRemove}
          className="text-subtle hover:text-red-500 transition-colors shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center rounded hover:bg-red-50"
          aria-label="Remove"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
