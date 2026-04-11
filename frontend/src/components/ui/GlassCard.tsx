"use client";

import React from "react";

type GlassLevel = 1 | 2 | 3;

interface GlassCardProps {
  level?: GlassLevel;
  as?: "div" | "article" | "section" | "li";
  selected?: boolean;
  aiPick?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  onClick?: React.MouseEventHandler;
  id?: string;
  role?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

const levelStyles: Record<GlassLevel, React.CSSProperties> = {
  1: {
    background: "var(--glass-1)",
    border: "1px solid var(--glass-border-1)",
    backdropFilter: "blur(12px)",
  },
  2: {
    background: "var(--glass-2)",
    border: "1px solid var(--glass-border-2)",
    backdropFilter: "blur(12px)",
    boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
  },
  3: {
    background: "var(--glass-3)",
    border: "1px solid var(--glass-border-3)",
    backdropFilter: "blur(12px)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  },
};

export function GlassCard({
  level = 2,
  as: Tag = "div",
  selected = false,
  aiPick = false,
  children,
  style,
  className = "",
  ...props
}: GlassCardProps) {
  const baseStyle = levelStyles[level];

  const selectedStyle: React.CSSProperties = selected
    ? {
        border: "1px solid var(--success)",
        boxShadow: "0 0 0 2px var(--success), 0 0 20px var(--success-glow), 0 8px 32px rgba(0,0,0,0.4)",
      }
    : {};

  const aiStyle: React.CSSProperties = aiPick
    ? {
        border: "1px solid rgba(224,122,95,0.4)",
        boxShadow: "0 0 20px var(--accent-glow), 0 4px 24px rgba(0,0,0,0.3)",
      }
    : {};

  const combinedStyle = { ...baseStyle, ...aiStyle, ...selectedStyle, ...style };
  const combinedClassName = ["rounded-2xl", className].filter(Boolean).join(" ");

  // Render with explicit typing per tag to satisfy TypeScript
  if (Tag === "li") {
    return (
      <li style={combinedStyle} className={combinedClassName} {...(props as React.LiHTMLAttributes<HTMLLIElement>)}>
        {children}
      </li>
    );
  }
  if (Tag === "article") {
    return (
      <article style={combinedStyle} className={combinedClassName} {...(props as React.HTMLAttributes<HTMLElement>)}>
        {children}
      </article>
    );
  }
  if (Tag === "section") {
    return (
      <section style={combinedStyle} className={combinedClassName} {...(props as React.HTMLAttributes<HTMLElement>)}>
        {children}
      </section>
    );
  }
  return (
    <div style={combinedStyle} className={combinedClassName} {...(props as React.HTMLAttributes<HTMLDivElement>)}>
      {children}
    </div>
  );
}
