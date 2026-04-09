"use client";

import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  selected?: boolean;
  selectedColor?: "success" | "primary" | "accent";
  as?: "div" | "article" | "section";
}

const selectedRing: Record<string, string> = {
  success: "ring-2 ring-success border-success bg-success/5",
  primary: "ring-2 ring-primary border-primary bg-primary/5",
  accent: "ring-2 ring-accent border-accent bg-accent/5",
};

export function Card({
  interactive = false,
  selected = false,
  selectedColor = "success",
  as: Tag = "div",
  children,
  className = "",
  ...props
}: CardProps) {
  return (
    <Tag
      className={[
        "card-base transition-all duration-200",
        interactive && !selected
          ? "hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer"
          : "",
        selected ? selectedRing[selectedColor] : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </Tag>
  );
}
