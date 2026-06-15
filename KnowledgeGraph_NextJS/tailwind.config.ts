import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#fafafa",
        surface: "#ffffff",
        border: "#e5e5e5",
        text: "#1a1a1a",
        muted: "#6b7280",
        accent: "#374151",
        node: {
          person: "#64748b",
          org: "#78716c",
          concept: "#d4a574",
          location: "#8b8ca0",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica Neue",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
