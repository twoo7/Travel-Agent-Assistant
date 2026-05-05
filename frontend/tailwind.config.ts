import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:          "var(--bg)",
        surface:     "var(--surface)",
        surface2:    "var(--surface2)",
        border:      "var(--border)",
        border2:     "var(--border2)",
        ink:         "var(--ink)",
        "ink-muted": "var(--ink-muted)",
        "ink-subtle":"var(--ink-subtle)",
        teal:        "var(--teal)",
        "teal-hover":"var(--teal-hover)",
        "teal-mid":  "var(--teal-mid)",
        "teal-light":"var(--teal-light)",
        amber:       "var(--amber)",
        green:       "var(--green)",
        red:         "var(--red)",
        // Legacy aliases kept for backward compat during migration
        background:  "var(--bg)",
        foreground:  "var(--ink)",
      },
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        body:    ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        sm:  "var(--shadow-sm)",
        md:  "var(--shadow-md)",
        lg:  "var(--shadow-lg)",
        // Legacy alias
        card: "var(--shadow-md)",
        "card-hover": "var(--shadow-lg)",
      },
      borderRadius: {
        sm:  "8px",
        DEFAULT: "12px",
        lg:  "16px",
        xl:  "20px",
        // Legacy alias
        card: "16px",
      },
      keyframes: {
        "fade-up": {
          "0%":   { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%":   { opacity: "0", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "pop-in": {
          "0%":   { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          "0%":   { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%":       { opacity: "0.5" },
        },
      },
      animation: {
        "fade-up":  "fade-up 0.24s ease-out",
        "slide-in": "slide-in 0.24s ease-out",
        "pop-in":   "pop-in 0.18s ease-out",
        "slide-up": "slide-up 0.24s ease-out",
        shimmer:    "shimmer 1.8s infinite",
        pulse:      "pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
