"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as "dark" | "light" | null;
    if (stored) {
      setTheme(stored);
      document.documentElement.setAttribute("data-theme", stored === "light" ? "light" : "");
    }
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    if (next === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      whileHover={{ opacity: 0.8 }}
      onClick={toggle}
      style={{ borderTop: "1px solid var(--sidebar-border)", color: "var(--text-subtle)" }}
      className="w-full flex items-center justify-center py-3 transition-colors duration-150"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
    </motion.button>
  );
}
