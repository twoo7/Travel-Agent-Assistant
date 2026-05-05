"use client";

import React from "react";

type BadgeVariant =
  | "default"
  | "teal"
  | "green"
  | "amber"
  | "red"
  | "ai-pick"
  | "selected"
  | "stale"
  | "status"
  | "auto"
  | "primary"
  | "success"
  | "warning"
  | "danger";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default:  "bg-surface2 text-ink-muted border border-border",
  teal:     "bg-teal-light text-teal border border-teal/20",
  green:    "bg-green/10 text-green border border-green/20",
  amber:    "bg-amber/10 text-amber border border-amber/20",
  red:      "bg-red/10 text-red border border-red/20",
  // Legacy aliases
  "ai-pick": "bg-teal text-surface",
  selected:  "bg-teal-light text-teal border border-teal/20",
  stale:     "bg-amber/10 text-amber border border-amber/20",
  status:    "bg-surface2 text-ink-muted border border-border",
  auto:      "bg-teal-light text-teal border border-teal/20",
  primary:   "bg-teal-light text-teal border border-teal/20",
  success:   "bg-green/10 text-green border border-green/20",
  warning:   "bg-amber/10 text-amber border border-amber/20",
  danger:    "bg-red/10 text-red border border-red/20",
};

export function Badge({ variant = "default", children, className = "" }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
