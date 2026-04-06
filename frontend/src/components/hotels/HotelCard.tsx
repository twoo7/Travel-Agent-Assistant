"use client";

import { useState } from "react";
import type { HotelOffer } from "@/types/trip";

interface Props {
  offer: HotelOffer;
  selected: boolean;
  confirmed: boolean;
  onSelect: (offer: HotelOffer) => void;
}

function StarRating({ rating }: { rating?: number }) {
  if (!rating) return null;
  const filled = Math.round(rating);
  return (
    <span className="text-xs text-amber-500">
      {"★".repeat(filled)}{"☆".repeat(5 - filled)}
      <span className="text-gray-500 ml-1">{rating.toFixed(1)}</span>
    </span>
  );
}

export function HotelCard({ offer, selected, confirmed, onSelect }: Props) {
  const [expanded, setExpanded] = useState(false);
  const hasBullets = offer.ai_reason_bullets && offer.ai_reason_bullets.length > 0;

  return (
    <div
      onClick={() => { if (!confirmed) onSelect(offer); }}
      className={`relative border rounded-xl p-4 transition-all ${
        confirmed
          ? "border-green-500 bg-green-50 ring-2 ring-green-500 cursor-default"
          : selected
          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500 cursor-pointer"
          : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm cursor-pointer"
      }`}
    >
      {offer.ai_recommended && (
        <span className="absolute top-3 right-3 bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          ✨ AI Pick
        </span>
      )}

      {confirmed && (
        <span className="absolute top-3 left-3 text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
          ✓ Stay Confirmed
        </span>
      )}

      <div className={`flex items-start justify-between ${confirmed ? "pl-28" : ""} pr-20`}>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{offer.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{offer.address}</p>
          <div className="mt-1">
            <StarRating rating={offer.rating} />
          </div>
        </div>
        <div className="text-right ml-4 shrink-0">
          <div className="text-xl font-bold text-gray-900">
            {offer.currency} {offer.price_per_night.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">per night</div>
        </div>
      </div>

      {offer.ai_recommended && (hasBullets || offer.ai_reason) && (
        <div className="mt-3 border-t border-indigo-100 pt-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((prev) => !prev);
            }}
            className="text-xs text-indigo-600 font-medium hover:text-indigo-800 transition-colors flex items-center gap-1"
          >
            <span>✨ Why AI picked this</span>
            <span
              className="inline-block transition-transform duration-200"
              style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
            >
              ›
            </span>
          </button>
          {expanded && (
            <div className="mt-2 bg-indigo-50 border border-indigo-100 rounded-lg p-3">
              {hasBullets ? (
                <ul className="space-y-1">
                  {offer.ai_reason_bullets!.map((bullet, idx) => (
                    <li key={idx} className="text-sm text-indigo-800 leading-snug">
                      {bullet}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-indigo-800">{offer.ai_reason}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
