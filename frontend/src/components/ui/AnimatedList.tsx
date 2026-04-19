"use client";

import React from "react";
import { motion } from "framer-motion";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

export const listItemVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.96 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 28 },
  },
};

interface AnimatedListProps {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedList({ children, className = "" }: AnimatedListProps) {
  return (
    <motion.ul
      variants={container}
      initial="hidden"
      animate="show"
      className={["space-y-3", className].filter(Boolean).join(" ")}
    >
      {children}
    </motion.ul>
  );
}

export function AnimatedListItem({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.li variants={listItemVariants} className={className}>
      {children}
    </motion.li>
  );
}
