"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FlightOffer } from "@/types/trip";
import { Sparkles, ChevronRight, Check } from "lucide-react";
import { formatPrice } from "@/utils/formatPrice";
import { AIPulseBadge } from "@/components/ui/AIPulseBadge";
import { iataToCityName, getAirportName } from "@/utils/airportNames";

interface Props {
  offer: FlightOffer;
  selected: boolean;
  onSelect: (offer: FlightOffer) => void;
}

function formatDuration(iso: string) {
  return iso.replace("PT", "").replace("H", "h ").replace("M", "m").trim();
}

function formatTime(dt: string) {
  return new Date(dt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function FlightCard({ offer, selected, onSelect }: Props) {
  const [expanded, setExpanded] = useState(false);
  const seg = offer.segments[0];
  const lastSeg = offer.segments[offer.segments.length - 1];
  const hasBullets = offer.ai_reason_bullets && offer.ai_reason_bullets.length > 0;

  const cardClass = selected
    ? "bg-surface border-2 border-teal shadow-md ring-2 ring-teal/20"
    : offer.ai_recommended
    ? "bg-surface border border-teal/40 shadow-md"
    : "bg-surface border border-border shadow-sm";

  return (
    <motion.div
      whileHover={selected ? undefined : { y: -2 }}
      whileTap={selected ? undefined : { scale: 0.99 }}
      onClick={() => { if (!selected) onSelect(offer); }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !selected) { e.preventDefault(); onSelect(offer); } }}
      className={`relative rounded-2xl p-4 transition-shadow duration-200 outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-teal/40 ${cardClass}`}
    >
      {/* Badges */}
      {offer.ai_recommended && !selected && (
        <span className="absolute top-3 right-3">
          <AIPulseBadge />
        </span>
      )}
      {selected && (
        <span className="absolute top-3 left-3 inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full font-body text-teal bg-teal-light border border-teal/30">
          <Check size={10} />
          Selected
        </span>
      )}

      {/* Main flight row */}
      <div className={`flex items-center gap-4 ${selected ? "pl-20" : ""} pr-20`}>
        <div className="text-center min-w-[64px]">
          <div className="text-xl font-bold font-display text-ink">
            {seg.departure_airport}
          </div>
          <div className="text-xs font-body text-ink-muted">
            {formatTime(seg.departure_time)}
          </div>
          <div className="text-[10px] font-body leading-tight mt-0.5 text-ink-subtle">
            {iataToCityName(seg.departure_airport)} · {getAirportName(seg.departure_airport)}
          </div>
        </div>

        <div className="flex-1 text-center">
          <div className="text-xs mb-1 font-body text-ink-muted">
            {formatDuration(offer.total_duration)}
          </div>
          <div className="flex items-center gap-1">
            <div className="flex-1 h-px bg-border" />
            <div className="w-2 h-2 rounded-full border-2 border-border2 bg-transparent" />
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="text-xs mt-1 font-body text-ink-muted">
            {offer.stops === 0 ? "Nonstop" : `${offer.stops} stop${offer.stops > 1 ? "s" : ""}`}
          </div>
        </div>

        <div className="text-center min-w-[64px]">
          <div className="text-xl font-bold font-display text-ink">
            {lastSeg.arrival_airport}
          </div>
          <div className="text-xs font-body text-ink-muted">
            {formatTime(lastSeg.arrival_time)}
          </div>
          <div className="text-[10px] font-body leading-tight mt-0.5 text-ink-subtle">
            {iataToCityName(lastSeg.arrival_airport)} · {getAirportName(lastSeg.arrival_airport)}
          </div>
        </div>

        <div className="text-right ml-4 min-w-[88px]">
          <div className="text-xl font-bold font-display text-teal">
            {formatPrice(offer.price, offer.currency)}
          </div>
          <div className="text-xs font-body text-ink-muted">per person</div>
          <div className="text-xs mt-0.5 font-mono text-ink-subtle">
            {seg.carrier_code}{seg.flight_number}
          </div>
        </div>
      </div>

      {/* AI reason expand */}
      {offer.ai_recommended && (hasBullets || offer.ai_reason) && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="mt-2.5 text-xs font-medium flex items-center gap-1 transition-colors font-body focus:outline-none text-teal"
          >
            <Sparkles size={11} />
            <span>Why AI picked this</span>
            <ChevronRight
              size={13}
              className="transition-transform duration-200"
              style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
            />
          </button>
          <AnimatePresence>
            {expanded && (
              <motion.div
                key="ai-reason"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-2 p-3 rounded-lg overflow-hidden bg-teal-light border border-teal/20"
              >
                {hasBullets ? (
                  <ul className="space-y-1">
                    {offer.ai_reason_bullets!.map((bullet, idx) => (
                      <li key={idx} className="text-sm leading-snug font-body text-ink-muted">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm leading-relaxed font-body text-ink-muted">
                    {offer.ai_reason}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}
