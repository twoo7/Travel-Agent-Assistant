"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { HotelOffer } from "@/types/trip";
import { calcNights } from "@/utils/dateUtils";
import { formatPrice } from "@/utils/formatPrice";
import { Sparkles, ChevronRight, Check } from "lucide-react";

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
    <span className="text-xs text-warning-dark">
      {"★".repeat(filled)}{"☆".repeat(5 - filled)}
      <span className="text-muted ml-1 font-body">{rating.toFixed(1)}</span>
    </span>
  );
}

export function HotelCard({ offer, selected, confirmed, onSelect, checkIn, checkOut, index = 0 }: Props) {
  const [expanded, setExpanded] = useState(false);
  const hasBullets = offer.ai_reason_bullets && offer.ai_reason_bullets.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05, ease: "easeOut" }}
      onClick={() => { if (!confirmed) onSelect(offer); }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !confirmed) { e.preventDefault(); onSelect(offer); } }}
      className={[
        "relative border rounded-xl p-4 transition-all duration-200 outline-none",
        confirmed
          ? "border-success bg-success/5 ring-2 ring-success cursor-default"
          : selected
          ? "border-primary bg-primary/5 ring-2 ring-primary/30 cursor-pointer"
          : "border-gray-200 bg-white hover:border-primary/30 hover:shadow-card cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/30",
      ].join(" ")}
    >
      {/* AI Pick badge */}
      {offer.ai_recommended && !confirmed && (
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 bg-accent text-white text-xs font-bold px-2 py-0.5 rounded-full font-body">
          <Sparkles size={10} />
          AI Pick
        </span>
      )}

      {/* Stay confirmed badge */}
      {confirmed && (
        <span className="absolute top-3 left-3 inline-flex items-center gap-1 text-xs font-bold text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded-full font-body">
          <Check size={10} />
          Stay Confirmed
        </span>
      )}

      <div className={`flex items-start justify-between ${confirmed ? "pl-32" : ""} pr-20`}>
        <div className="flex-1">
          <h3 className="font-semibold text-charcoal font-body">{offer.name}</h3>
          <p className="text-xs text-muted mt-0.5 font-body">{offer.address}</p>
          <div className="mt-1">
            <StarRating rating={offer.rating} />
          </div>
        </div>
        <div className="text-right ml-4 shrink-0">
          <div className="text-xl font-bold text-primary font-display">
            {formatPrice(offer.price_per_night, offer.currency)}
          </div>
          <div className="text-xs text-muted font-body">per night</div>
          {checkIn && checkOut && (() => {
            const nights = calcNights(checkIn, checkOut);
            return (
              <div className="text-xs text-muted font-body mt-0.5">
                {formatPrice(offer.price_per_night * nights, offer.currency)} total ({nights} night{nights !== 1 ? "s" : ""})
              </div>
            );
          })()}
        </div>
      </div>

      {/* AI reason expand */}
      {offer.ai_recommended && (hasBullets || offer.ai_reason) && (
        <div className="mt-3 border-t border-gray-100 pt-2">
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded((prev) => !prev); }}
            className="text-xs text-accent hover:text-accent-dark font-medium flex items-center gap-1 transition-colors font-body focus:outline-none"
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
              transition={{ duration: 0.2 }}
              className="mt-2 bg-accent/5 border border-accent/10 rounded-lg p-3"
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
                <p className="text-sm text-charcoal/80 font-body">{offer.ai_reason}</p>
              )}
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
}
