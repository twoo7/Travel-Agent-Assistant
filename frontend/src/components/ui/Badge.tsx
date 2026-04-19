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

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  "ai-pick":  { background: "var(--accent)", color: "white" },
  selected:   { background: "rgba(107,144,128,0.15)", color: "var(--success)", border: "1px solid rgba(107,144,128,0.3)" },
  stale:      { background: "rgba(212,165,116,0.15)", color: "var(--warning)", border: "1px solid rgba(212,165,116,0.3)" },
  status:     { background: "var(--glass-1)", color: "var(--text-muted)", border: "1px solid var(--glass-border-1)" },
  auto:       { background: "rgba(107,144,128,0.15)", color: "var(--success)", border: "1px solid rgba(107,144,128,0.3)" },
  default:    { background: "var(--glass-1)", color: "var(--text-muted)", border: "1px solid var(--glass-border-1)" },
  primary:    { background: "rgba(224,122,95,0.1)", color: "var(--accent)", border: "1px solid rgba(224,122,95,0.2)" },
  success:    { background: "rgba(107,144,128,0.15)", color: "var(--success)", border: "1px solid rgba(107,144,128,0.3)" },
  warning:    { background: "rgba(212,165,116,0.15)", color: "var(--warning)", border: "1px solid rgba(212,165,116,0.3)" },
  danger:     { background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" },
};

export function Badge({ variant = "default", children, className = "" }: BadgeProps) {
  return (
    <span
      style={variantStyles[variant]}
      className={[
        "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
