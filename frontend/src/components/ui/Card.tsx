"use client";

import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  selected?: boolean;
  aiPick?: boolean;
  as?: "div" | "article" | "section";
}

export function Card({
  interactive = false,
  selected = false,
  aiPick = false,
  as: Tag = "div",
  children,
  className = "",
  ...props
}: CardProps) {
  const base = "relative bg-surface border border-border rounded-lg transition-all duration-200";
  const interactiveClass = interactive && !selected
    ? "hover:shadow-md hover:-translate-y-0.5 cursor-pointer shadow-sm"
    : "shadow-sm";
  const selectedClass = selected
    ? "border-teal ring-1 ring-teal/30 shadow-sm"
    : "";
  const aiPickClass = aiPick && !selected
    ? "border-teal/40"
    : "";

  return (
    <Tag
      className={[base, interactiveClass, selectedClass, aiPickClass, className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {aiPick && (
        <span className="absolute top-0 right-0 px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded-bl-lg rounded-tr-lg bg-teal text-surface">
          AI Pick
        </span>
      )}
      {children}
    </Tag>
  );
}
