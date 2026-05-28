import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#05050a",
        panel: "#0d0f1c",
        neon: "#9d4edd",
        cyan: "#00d4ff",
        acid: "#b7ff2a",
        danger: "#ff2d75"
      },
      boxShadow: {
        glow: "0 0 32px rgba(157,78,221,.35)",
        cyan: "0 0 32px rgba(0,212,255,.28)"
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px)"
      },
      gridTemplateColumns: {
        13: "repeat(13, minmax(0, 1fr))"
      }
    }
  },
  plugins: []
};

export default config;
