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
        className="rounded-lg overflow-hidden shadow-xl z-10"
        style={{ background: "var(--glass-elevated, rgba(255,255,255,0.11))", backdropFilter: "blur(20px)", border: "1px solid var(--glass-border-1)" }}
      >
        <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: "1px solid var(--glass-border-1)" }}>
          <span className="text-[10px] font-semibold uppercase tracking-widest font-body" style={{ color: "var(--text-eyebrow)" }}>
            Add to day
          </span>
          {onCancel && (
            <button onClick={onCancel} className="opacity-60 hover:opacity-100 transition-opacity" aria-label="Cancel">
              <X size={12} style={{ color: "var(--text-muted)" }} />
            </button>
          )}
        </div>
        <div className="max-h-48 overflow-y-auto">
          {days.map((day) => (
            <button
              key={day.day_number}
              onClick={() => onPick(day.day_number)}
              className="w-full text-left px-3 py-2 text-xs font-body transition-colors hover:bg-[var(--glass-2)] flex items-center justify-between gap-2"
              style={{ borderBottom: "1px solid var(--glass-border-1)", color: "var(--text-primary)" }}
            >
              <span className="font-medium">Day {day.day_number}</span>
              <span style={{ color: "var(--text-muted)" }} className="truncate">{day.city} · {day.date}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
