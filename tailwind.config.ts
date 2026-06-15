import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#f7f8fa",
        ink: "#111827",
        muted: "#667085",
        line: "#d7dce3",
        panel: "#ffffff",
        brand: {
          50: "#ecfeff",
          100: "#cffafe",
          500: "#0891b2",
          600: "#0e7490",
          700: "#155e75"
        },
        success: "#0f766e",
        warning: "#b45309",
        danger: "#b42318"
      },
      boxShadow: {
        surface: "0 1px 2px rgba(16, 24, 40, 0.06)"
      }
    }
  },
  plugins: []
};

export default config;
