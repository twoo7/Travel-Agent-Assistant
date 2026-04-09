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
          className="text-xs font-medium text-charcoal/70 font-body"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={[
          "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-charcoal font-body",
          "bg-white placeholder:text-subtle",
          "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
          "disabled:bg-gray-50 disabled:text-muted disabled:cursor-not-allowed",
          "transition-colors duration-150",
          error ? "border-red-300 focus:ring-red-200 focus:border-red-400" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />
      {hint && !error && (
        <p className="text-xs text-muted">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
