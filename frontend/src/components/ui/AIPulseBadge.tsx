"use client";

import React from "react";
import { Sparkles } from "lucide-react";

interface AIPulseBadgeProps {
  pulsing?: boolean;
  className?: string;
}

export function AIPulseBadge({ pulsing = false, className = "" }: AIPulseBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full font-body",
        "text-white",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        background: "linear-gradient(135deg, var(--accent), var(--accent-dark))",
        boxShadow: "0 0 12px var(--accent-glow)",
      }}
    >
      <Sparkles
        aria-hidden="true"
        size={10}
        className={pulsing ? "animate-ai-pulse" : ""}
      />
      <span aria-hidden="true">✦</span>{" "}AI Pick
    </span>
  );
}
