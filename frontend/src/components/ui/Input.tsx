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
        <label
          htmlFor={inputId}
          className="text-xs font-medium font-body"
          style={{ color: "var(--text-muted)" }}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={[
          "w-full rounded-lg px-3 py-2 text-sm font-body transition-colors duration-150",
          "focus:outline-none focus:ring-2 focus:ring-accent/50",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          error ? "border-red-300 focus:ring-red-200 focus:border-red-400" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />
      {hint && !error && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
