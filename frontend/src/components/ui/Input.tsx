"use client";

import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className = "", id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium font-body text-ink-muted">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={[
          "w-full bg-surface border border-border rounded text-sm font-body",
          "px-3 py-2 text-ink placeholder:text-ink-subtle",
          "transition-colors duration-150",
          "focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          error ? "border-red focus:ring-red/20" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />
      {hint && !error && (
        <p className="text-xs text-ink-muted">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red">{error}</p>
      )}
    </div>
  );
}
