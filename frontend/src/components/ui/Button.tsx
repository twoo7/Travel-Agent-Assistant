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
  primary:   "text-white shadow-sm hover:shadow-md",
  secondary: "",
  ghost:     "",
  success:   "shadow-sm hover:shadow-md",
  danger:    "bg-red-500 text-white hover:bg-red-600 shadow-sm hover:shadow-md",
};

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary:   {
    background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%)",
    boxShadow: "0 0 20px var(--accent-glow)",
  },
  secondary: {
    background: "var(--glass-2)",
    border: "1px solid var(--glass-border-2)",
    color: "var(--text-primary)",
  },
  ghost:     { color: "var(--text-muted)" },
  success:   { background: "var(--success)", color: "white" },
  danger:    {},
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs font-medium rounded-lg gap-1.5",
  md: "px-4 py-2 text-sm font-medium rounded-[10px] gap-2",
  lg: "px-6 py-3 text-sm font-semibold rounded-xl gap-2",
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
      whileTap={isDisabled ? undefined : { scale: 0.97 }}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      style={{ ...variantStyles[variant], ...style }}
      className={[
        "inline-flex items-center justify-center transition-all duration-150 font-body",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2",
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
