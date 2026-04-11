"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DayItem } from "@/types/trip";
import { MapPin, Hotel, Plane, Train, Ship, Car, Clock, GripVertical, X } from "lucide-react";
import { motion } from "framer-motion";

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

export function DayItemCard({ item, itemId, onRemove, isDragging }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: itemId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const itemStyle: React.CSSProperties = {
    background: item.type === "hotel" ? "rgba(107,144,128,0.1)" : item.type === "airport" ? "rgba(224,122,95,0.1)" : "var(--glass-2)",
    border: item.type === "hotel" ? "1px solid rgba(107,144,128,0.3)" : item.type === "airport" ? "1px solid rgba(224,122,95,0.3)" : "1px solid var(--glass-border-2)",
  };
  const iconColor = item.type === "hotel" ? "var(--success)" : item.type === "airport" ? "var(--accent)" : "var(--text-muted)";

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, ...itemStyle }}
      className={`rounded-lg px-3 py-2 flex items-start gap-2 ${isDragging ? "ring-2 shadow-lg" : ""}`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing mt-0.5 shrink-0 select-none"
        style={{ color: "var(--text-subtle)" }}
        aria-label="Drag handle"
      >
        <GripVertical size={14} />
      </div>

      {/* Icon */}
      <span className="shrink-0 mt-0.5" style={{ color: iconColor }}>
        {getItemIcon(item)}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium truncate font-body" style={{ color: "var(--text-primary)" }}>{item.name}</span>
          {item.spans_days && item.spans_days > 1 && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 font-body"
              style={{ background: "rgba(107,144,128,0.15)", color: "var(--success)" }}
            >
              spans {item.spans_days} days
            </span>
          )}
        </div>
        {item.address && (
          <p className="text-xs truncate mt-0.5 font-body" style={{ color: "var(--text-muted)" }}>{item.address}</p>
        )}
        {item.duration_mins && (
          <p className="text-xs flex items-center gap-1 mt-0.5 font-body" style={{ color: "var(--text-subtle)" }}>
            <Clock size={10} />
            {item.duration_mins} min
          </p>
        )}
      </div>

      {/* Remove */}
      {onRemove && item.type !== "airport" && (
        <motion.button
          whileHover={{ color: "rgba(239,68,68,0.85)", backgroundColor: "rgba(239,68,68,0.1)" }}
          onClick={onRemove}
          className="transition-colors shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center rounded"
          style={{ color: "var(--text-subtle)" }}
          aria-label="Remove"
        >
          <X size={12} />
        </motion.button>
      )}
    </div>
  );
}
