"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { FlightOffer } from "@/types/trip";
import { Sparkles, ChevronRight, Check } from "lucide-react";

interface Props {
  offer: FlightOffer;
  selected: boolean;
  onSelect: (offer: FlightOffer) => void;
  index?: number;
}

function formatDuration(iso: string) {
  return iso.replace("PT", "").replace("H", "h ").replace("M", "m").trim();
}

function formatTime(dt: string) {
  return new Date(dt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function FlightCard({ offer, selected, onSelect, index = 0 }: Props) {
  const [expanded, setExpanded] = useState(false);
  const seg = offer.segments[0];
  const lastSeg = offer.segments[offer.segments.length - 1];
  const hasBullets = offer.ai_reason_bullets && offer.ai_reason_bullets.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05, ease: "easeOut" }}
      onClick={() => { if (!selected) onSelect(offer); }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !selected) { e.preventDefault(); onSelect(offer); } }}
      className={[
        "relative border rounded-xl p-4 transition-all duration-200 outline-none",
        selected
          ? "border-success bg-success/5 ring-2 ring-success cursor-default"
          : "border-gray-200 bg-white hover:border-primary/30 hover:shadow-card cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/30",
      ].join(" ")}
    >
      {/* Badges */}
      {offer.ai_recommended && !selected && (
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 bg-accent text-white text-xs font-bold px-2 py-0.5 rounded-full font-body">
          <Sparkles size={10} />
          AI Pick
        </span>
      )}
      {selected && (
        <span className="absolute top-3 left-3 inline-flex items-center gap-1 text-xs font-bold text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded-full font-body">
          <Check size={10} />
          Selected
        </span>
      )}

      {/* Main flight row */}
      <div className={`flex items-center gap-4 ${selected ? "pl-20" : ""} pr-20`}>
        <div className="text-center min-w-[52px]">
          <div className="text-xl font-bold text-charcoal font-display">{seg.departure_airport}</div>
          <div className="text-xs text-muted font-body">{formatTime(seg.departure_time)}</div>
        </div>

        <div className="flex-1 text-center">
          <div className="text-xs text-muted mb-1 font-body">{formatDuration(offer.total_duration)}</div>
          <div className="flex items-center gap-1">
            <div className="flex-1 h-px bg-gray-200" />
            <div className="w-2 h-2 rounded-full border-2 border-gray-300 bg-white" />
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="text-xs text-muted mt-1 font-body">
            {offer.stops === 0 ? "Nonstop" : `${offer.stops} stop${offer.stops > 1 ? "s" : ""}`}
          </div>
        </div>

        <div className="text-center min-w-[52px]">
          <div className="text-xl font-bold text-charcoal font-display">{lastSeg.arrival_airport}</div>
          <div className="text-xs text-muted font-body">{formatTime(lastSeg.arrival_time)}</div>
        </div>

        <div className="text-right ml-4 min-w-[88px]">
          <div className="text-xl font-bold text-primary font-display">
            {offer.currency} {offer.price.toLocaleString()}
          </div>
          <div className="text-xs text-muted font-body">per person</div>
          <div className="text-xs text-subtle mt-0.5 font-mono">{seg.carrier_code}{seg.flight_number}</div>
        </div>
      </div>

      {/* AI reason expand */}
      {offer.ai_recommended && (hasBullets || offer.ai_reason) && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="mt-2.5 text-xs text-accent hover:text-accent-dark font-medium flex items-center gap-1 transition-colors font-body focus:outline-none"
          >
            <Sparkles size={11} />
            <span>Why AI picked this</span>
            <ChevronRight
              size={13}
              className="transition-transform duration-200"
              style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
            />
          </button>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-2 p-3 bg-accent/5 rounded-lg border border-accent/10"
            >
              {hasBullets ? (
                <ul className="space-y-1">
                  {offer.ai_reason_bullets!.map((bullet, idx) => (
                    <li key={idx} className="text-sm text-charcoal/80 leading-snug font-body">
                      {bullet}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-charcoal/80 leading-relaxed font-body">{offer.ai_reason}</p>
              )}
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
