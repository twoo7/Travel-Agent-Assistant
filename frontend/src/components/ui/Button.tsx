"use client";

import React from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "success" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:   "bg-teal text-surface hover:bg-teal-hover shadow-sm",
  secondary: "bg-surface border border-border text-ink hover:bg-surface2 shadow-sm",
  ghost:     "text-ink-muted hover:text-ink hover:bg-surface2",
  success:   "text-surface shadow-sm",
  danger:    "text-surface shadow-sm",
};

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary:   {},
  secondary: {},
  ghost:     {},
  success:   { background: "var(--green)" },
  danger:    { background: "var(--red)" },
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8  px-3 text-xs  font-medium rounded  gap-1.5",
  md: "h-9  px-4 text-sm  font-medium rounded  gap-2",
  lg: "h-10 px-6 text-sm  font-semibold rounded gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  icon,
  children,
  className = "",
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      whileTap={isDisabled ? undefined : { scale: 0.98 }}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      style={{ ...variantStyles[variant], ...style }}
      className={[
        "inline-flex items-center justify-center transition-all duration-150 font-body",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/50 focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...(props as unknown as React.ComponentPropsWithoutRef<typeof motion.button>)}
    >
      {loading && (
        <Loader2
          aria-hidden="true"
          className="animate-spin shrink-0"
          size={size === "sm" ? 12 : 14}
        />
      )}
      {!loading && icon && <span className="shrink-0" aria-hidden="true">{icon}</span>}
      {children}
    </motion.button>
  );
}
