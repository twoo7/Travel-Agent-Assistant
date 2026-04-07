"use client";

import { useState } from "react";
import type { FlightOffer } from "@/types/trip";

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

  return (
    <div
      onClick={() => { if (!selected) onSelect(offer); }}
      className={`relative border rounded-xl p-4 transition-all ${
        selected
          ? "border-green-500 bg-green-50 ring-2 ring-green-500 cursor-default"
          : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm cursor-pointer"
      }`}
    >
      {offer.ai_recommended && (
        <span className="absolute top-3 right-3 bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          ✨ AI Pick
        </span>
      )}

      {selected && (
        <span className="absolute top-3 left-3 text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
          ✓ Selected
        </span>
      )}

      <div className={`flex items-center gap-4 ${selected ? "pl-20" : ""} pr-20`}>
        <div className="text-center min-w-[48px]">
          <div className="text-lg font-bold">{seg.departure_airport}</div>
          <div className="text-xs text-gray-500">{formatTime(seg.departure_time)}</div>
        </div>

        <div className="flex-1 text-center">
          <div className="text-xs text-gray-400 mb-1">{formatDuration(offer.total_duration)}</div>
          <div className="flex items-center gap-1">
            <div className="flex-1 h-px bg-gray-300" />
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {offer.stops === 0 ? "Nonstop" : `${offer.stops} stop${offer.stops > 1 ? "s" : ""}`}
          </div>
        </div>

        <div className="text-center min-w-[48px]">
          <div className="text-lg font-bold">{lastSeg.arrival_airport}</div>
          <div className="text-xs text-gray-500">{formatTime(lastSeg.arrival_time)}</div>
        </div>

        <div className="text-right ml-4 min-w-[80px]">
          <div className="text-xl font-bold text-gray-900">
            {offer.currency} {offer.price.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">per person</div>
          <div className="text-xs text-gray-400 mt-0.5">{seg.carrier_code}{seg.flight_number}</div>
        </div>
      </div>

      {offer.ai_recommended && (hasBullets || offer.ai_reason) && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition-colors"
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
            <div className="mt-2 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
              {hasBullets ? (
                <ul className="space-y-1">
                  {offer.ai_reason_bullets!.map((bullet, idx) => (
                    <li key={idx} className="text-sm text-indigo-800 leading-snug">
                      {bullet}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-indigo-800 leading-relaxed">{offer.ai_reason}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
