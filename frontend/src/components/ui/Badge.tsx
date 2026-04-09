"use client";

import React from "react";

type BadgeVariant =
  | "ai-pick"
  | "selected"
  | "stale"
  | "status"
  | "auto"
  | "default"
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
  "ai-pick": "bg-accent text-white",
  selected: "bg-success/15 text-success-dark border border-success/30",
  stale: "bg-warning/15 text-warning-dark border border-warning/30",
  status: "bg-gray-100 text-muted border border-gray-200",
  auto: "bg-success/15 text-success-dark border border-success/30",
  default: "bg-gray-100 text-gray-700 border border-gray-200",
  primary: "bg-primary/10 text-primary border border-primary/20",
  success: "bg-success/15 text-success-dark border border-success/30",
  warning: "bg-warning/15 text-warning-dark border border-warning/30",
  danger: "bg-red-50 text-red-700 border border-red-200",
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
