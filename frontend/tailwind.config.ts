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
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "#FFFFFF",
        primary: {
          DEFAULT: "#1B3A4B",
          light: "#2A5068",
          dark: "#0F2937",
        },
        accent: {
          DEFAULT: "#E07A5F",
          light: "#E8967F",
          dark: "#C96A4F",
        },
        success: {
          DEFAULT: "#6B9080",
          light: "#8AB09F",
          dark: "#557363",
        },
        warning: {
          DEFAULT: "#D4A574",
          light: "#E0BC94",
          dark: "#B88E5F",
        },
        muted: "#6B7280",
        subtle: "#9CA3AF",
        charcoal: "#2D2D2D",
        navy: {
          DEFAULT: "#1B3A4B",
          sidebar: "#071420",
        },
        canvas: {
          from: "var(--canvas-from)",
          to: "var(--canvas-to)",
          mid: "var(--canvas-mid)",
        },
      },
      fontFamily: {
        display: ["var(--font-dm-serif)", "Georgia", "serif"],
        body: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 4px 24px rgba(0,0,0,0.3)",
        "card-hover": "0 8px 32px rgba(0,0,0,0.4)",
        warm: "0 4px 14px rgba(139,90,43,0.08)",
      },
      borderRadius: {
        card: "16px",
      },
      keyframes: {
        "fade-in-up": {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "ai-pulse": {
          "0%, 100%": { filter: "drop-shadow(0 0 4px rgba(224,122,95,0.4))" },
          "50%":       { filter: "drop-shadow(0 0 12px rgba(224,122,95,0.8))" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.6" },
          "50%":       { opacity: "1" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.3s ease-out",
        shimmer: "shimmer 1.8s infinite",
        "ai-pulse": "ai-pulse 2s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
