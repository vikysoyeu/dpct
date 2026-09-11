import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--color-background) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        "surface-low": "rgb(var(--color-surface-low) / <alpha-value>)",
        "surface-high": "rgb(var(--color-surface-high) / <alpha-value>)",
        "surface-card": "rgb(var(--color-surface-card) / <alpha-value>)",
        primary: "rgb(var(--color-primary) / <alpha-value>)",
        "primary-strong": "rgb(var(--color-primary-strong) / <alpha-value>)",
        secondary: "rgb(var(--color-secondary) / <alpha-value>)",
        danger: "rgb(var(--color-danger) / <alpha-value>)",
        "text-main": "rgb(var(--color-text-main) / <alpha-value>)",
        "text-subtle": "rgb(var(--color-text-subtle) / <alpha-value>)",
        outline: "rgb(var(--color-outline) / <alpha-value>)"
      },
      boxShadow: {
        ambient: "0 12px 32px -4px rgba(25, 28, 29, 0.08)"
      },
      fontFamily: {
        body: ["var(--font-body)", "sans-serif"],
        label: ["var(--font-label)", "sans-serif"]
      },
      borderRadius: {
        xl: "0.75rem"
      }
    }
  },
  plugins: []
};

export default config;
