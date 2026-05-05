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
        "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full font-body",
        "bg-teal text-surface",
        pulsing ? "animate-pulse" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Sparkles aria-hidden="true" size={10} />
      AI Pick
    </span>
  );
}
