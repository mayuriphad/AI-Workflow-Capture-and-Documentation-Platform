import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#C1E8FF",
        ink: "#021024",
        accent: {
          DEFAULT: "#052659",
          hover: "#021024",
        },
        recording: "#5483B3",
        done: "#7DA0CA",
        line: "#7DA0CA",
      },
      fontFamily: {
        display: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
