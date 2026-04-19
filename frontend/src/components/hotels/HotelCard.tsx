"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { HotelOffer } from "@/types/trip";
import { calcNights } from "@/utils/dateUtils";
import { formatPrice } from "@/utils/formatPrice";
import { Sparkles, ChevronRight, Check } from "lucide-react";
import { AIPulseBadge } from "@/components/ui/AIPulseBadge";

interface Props {
  offer: HotelOffer;
  selected: boolean;
  confirmed: boolean;
  onSelect: (offer: HotelOffer) => void;
  checkIn?: string;
  checkOut?: string;
  index?: number;
}

function StarRating({ rating }: { rating?: number }) {
  if (!rating) return null;
  const filled = Math.round(rating);
  return (
    <span className="text-xs" style={{ color: "var(--warning)" }}>
      {"★".repeat(filled)}{"☆".repeat(5 - filled)}
      <span className="ml-1 font-body" style={{ color: "var(--text-muted)" }}>{rating.toFixed(1)}</span>
    </span>
  );
}

export function HotelCard({ offer, selected, confirmed, onSelect, checkIn, checkOut }: Props) {
  const [expanded, setExpanded] = useState(false);
  const hasBullets = offer.ai_reason_bullets && offer.ai_reason_bullets.length > 0;

  const cardStyle: React.CSSProperties = confirmed || selected
    ? {
        background: "var(--glass-3)",
        border: "1px solid var(--success)",
        boxShadow: "0 0 0 2px var(--success), 0 0 20px var(--success-glow), 0 8px 32px rgba(0,0,0,0.4)",
        backdropFilter: "blur(12px)",
      }
    : offer.ai_recommended
    ? {
        background: "var(--glass-2)",
        border: "1px solid rgba(224,122,95,0.4)",
        boxShadow: "0 0 20px var(--accent-glow), 0 4px 24px rgba(0,0,0,0.3)",
        backdropFilter: "blur(12px)",
      }
    : {
        background: "var(--glass-2)",
        border: "1px solid var(--glass-border-2)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
        backdropFilter: "blur(12px)",
      };

  return (
    <motion.div
      whileHover={confirmed ? undefined : { y: -2 }}
      whileTap={confirmed ? undefined : { scale: 0.99 }}
      onClick={() => { if (!confirmed) onSelect(offer); }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !confirmed) { e.preventDefault(); onSelect(offer); } }}
      style={cardStyle}
      className="relative rounded-2xl p-4 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      {offer.ai_recommended && !confirmed && (
        <span className="absolute top-3 right-3">
          <AIPulseBadge />
        </span>
      )}
      {confirmed && (
        <span
          className="absolute top-3 left-3 inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full font-body"
          style={{ color: "var(--success)", background: "rgba(107,144,128,0.15)", border: "1px solid rgba(107,144,128,0.3)" }}
        >
          <Check size={10} />
          Stay Confirmed
        </span>
      )}

      <div className={`flex items-start justify-between ${confirmed ? "pl-32" : ""} pr-20`}>
        <div className="flex-1">
          <h3 className="font-semibold font-display text-base" style={{ color: "var(--text-primary)" }}>
            {offer.name}
          </h3>
          <p className="text-xs mt-0.5 font-body" style={{ color: "var(--text-muted)" }}>{offer.address}</p>
          <div className="mt-1">
            <StarRating rating={offer.rating} />
          </div>
        </div>
        <div className="text-right ml-4 shrink-0">
          <div className="text-xl font-bold font-display" style={{ color: "var(--accent)" }}>
            {formatPrice(offer.price_per_night, offer.currency)}
          </div>
          <div className="text-xs font-body" style={{ color: "var(--text-muted)" }}>per night</div>
          {checkIn && checkOut && (() => {
            const nights = calcNights(checkIn, checkOut);
            return (
              <div className="text-xs font-body mt-0.5" style={{ color: "var(--text-muted)" }}>
                {formatPrice(offer.price_per_night * nights, offer.currency)} total ({nights} night{nights !== 1 ? "s" : ""})
              </div>
            );
          })()}
        </div>
      </div>

      {offer.ai_recommended && (hasBullets || offer.ai_reason) && (
        <div className="mt-3 pt-2" style={{ borderTop: "1px solid var(--glass-border-1)" }}>
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded((prev) => !prev); }}
            className="text-xs font-medium flex items-center gap-1 transition-colors font-body focus:outline-none"
            style={{ color: "var(--accent)" }}
          >
            <Sparkles size={11} />
            <span>Why AI picked this</span>
            <ChevronRight size={13} className="transition-transform duration-200"
              style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }} />
          </button>
          <AnimatePresence>
            {expanded && (
              <motion.div
                key="ai-reason"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-2 rounded-lg p-3 overflow-hidden"
                style={{ background: "rgba(224,122,95,0.08)", border: "1px solid rgba(224,122,95,0.15)" }}
              >
                {hasBullets ? (
                  <ul className="space-y-1">
                    {offer.ai_reason_bullets!.map((bullet, idx) => (
                      <li key={idx} className="text-sm leading-snug font-body" style={{ color: "var(--text-muted)" }}>{bullet}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm font-body" style={{ color: "var(--text-muted)" }}>{offer.ai_reason}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
