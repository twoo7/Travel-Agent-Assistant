"use client";

import type { DayPlan } from "@/types/trip";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface Props {
  days: DayPlan[];
  onPick: (dayNumber: number) => void;
  onCancel?: () => void;
}

export function DayPicker({ days, onPick, onCancel }: Props) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -6, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.97 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="rounded-lg overflow-hidden shadow-lg z-10 bg-surface border border-border"
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-[10px] font-semibold uppercase tracking-widest font-body text-ink-subtle">
            Add to day
          </span>
          {onCancel && (
            <button onClick={onCancel} className="opacity-60 hover:opacity-100 transition-opacity text-ink-muted" aria-label="Cancel">
              <X size={12} />
            </button>
          )}
        </div>
        <div className="max-h-48 overflow-y-auto">
          {days.map((day) => (
            <button
              key={day.day_number}
              onClick={() => onPick(day.day_number)}
              className="w-full text-left px-3 py-2 text-xs font-body transition-colors hover:bg-surface2 flex items-center justify-between gap-2 border-b border-border text-ink"
            >
              <span className="font-medium">Day {day.day_number}</span>
              <span className="text-ink-muted truncate">{day.city} · {day.date}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
