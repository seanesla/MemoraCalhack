import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
        display: ["Inter Variable", "Inter", "-apple-system", "system-ui", "sans-serif"],
        serif: ["Inter Variable", "Inter", "-apple-system", "system-ui", "sans-serif"]
      },
      colors: {
        // Core palette inspired by Memora logo - soft lavender and sage
        lavender: {
          50: "#fdfcfd",   // Almost white with lavender hint
          100: "#f9f7fa",  // Softest lavender for backgrounds
          200: "#efe9f2",  // Light lavender for cards
          300: "#e2d7e8",  // Soft borders
          400: "#d4c3dc",  // Medium lavender - logo background
          500: "#c0a5cd",  // Rich lavender
          600: "#a788b8",  // Deep lavender
          700: "#8b6b9a",  // Muted purple
          800: "#6f5579",  // Dark lavender
          900: "#574361"   // Deepest lavender
        },
        sage: {
          50: "#f8faf9",   // Faintest sage tint
          100: "#f0f4f2",  // Very light sage
          200: "#dfe8e5",  // Soft sage for backgrounds
          300: "#c5d4ce",  // Light sage
          400: "#8fa89f",  // Logo sage green
          500: "#6f8b82",  // Main sage
          600: "#5a7068",  // Deep sage
          700: "#475852",  // Dark sage for text
          800: "#384641",  // Very dark sage
          900: "#2a3531"   // Deepest sage
        },
        // Neutral grays with warm undertones
        neutral: {
          50: "#fafaf9",   // Off-white
          100: "#f5f5f4",  // Light gray
          200: "#e7e6e5",  // Soft gray
          300: "#d1cfcd",  // Medium light gray
          400: "#a8a5a2",  // Medium gray
          500: "#787572",  // Text secondary
          600: "#5c5957",  // Text primary
          700: "#454341",  // Dark gray
          800: "#323130",  // Very dark
          900: "#1f1e1e"   // Near black
        },
        // Soft semantic colors - no harsh tones
        rose: {
          50: "#fdf8f8",
          100: "#faeeed",
          200: "#f4d4d1",
          300: "#e8a9a5",
          400: "#d98580",
          500: "#c26460",
          600: "#a54945",
          700: "#883939",
          800: "#6d2f2f"
        },
        "sage-alt": {
          100: "#e8f0ed",
          200: "#d1e1db",
          300: "#afc8be",
          400: "#8daf9f",
          500: "#6b9680",
          600: "#547766",
          700: "#425a4f",
          800: "#2f3d37"
        },
        amber: {
          50: "#fdfbf7",
          100: "#fbf3e5",
          200: "#f5deb8",
          300: "#ecc37a",
          400: "#dfa44a",
          500: "#c98930",
          600: "#a86f24",
          700: "#85571e",
          800: "#6a451c"
        },
        emerald: {
          50: "#f7fcf9",
          100: "#eaf8ef",
          200: "#d0efd9",
          300: "#a8dfb8",
          400: "#77c890",
          500: "#52a96f",
          600: "#408a58",
          700: "#356d47",
          800: "#2d5739"
        },
        // Soft interactive colors
        interactive: {
          primary: "#6f8b82",      // Sage green for primary actions
          primaryHover: "#5a7068",
          subtle: "#d4c3dc",       // Lavender for subtle actions
          subtleHover: "#c0a5cd"
        }
      },
      boxShadow: {
        "card": "0 1px 3px 0 rgba(0, 0, 0, 0.12), 0 1px 2px 0 rgba(0, 0, 0, 0.08)",
        "card-hover": "0 4px 12px 0 rgba(0, 0, 0, 0.15), 0 2px 4px 0 rgba(0, 0, 0, 0.10)",
        "card-elevated": "0 8px 24px 0 rgba(0, 0, 0, 0.18), 0 4px 8px 0 rgba(0, 0, 0, 0.12)"
      },
      spacing: {
        // Clinical spacing system - generous gutters
        "0.5": "0.125rem",  // 2px
        "1": "0.25rem",     // 4px
        "2": "0.5rem",      // 8px
        "3": "0.75rem",     // 12px - min tight spacing
        "4": "1rem",        // 16px - standard spacing
        "5": "1.25rem",     // 20px
        "6": "1.5rem",      // 24px
        "8": "2rem",        // 32px
        "10": "2.5rem",     // 40px
        "12": "3rem",       // 48px - generous vertical rhythm
        "16": "4rem",       // 64px
        "20": "5rem",       // 80px
        "24": "6rem"        // 96px
      },
      borderRadius: {
        "none": "0",
        "sm": "0.25rem",    // 4px
        "DEFAULT": "0.5rem", // 8px
        "md": "0.75rem",    // 12px
        "lg": "1rem",       // 16px - standard for cards
        "xl": "1.5rem",     // 24px
        "2xl": "2rem",      // 32px
        "full": "9999px"
      },
      animation: {
        "fade-in": "fade-in 0.4s ease forwards",
        "pulse-soft": "pulse-soft 3s ease-in-out infinite"
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" }
        }
      }
    }
  },
  plugins: []
};

export default config;
