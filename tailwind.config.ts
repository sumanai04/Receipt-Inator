import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      /*
       * Semantic color roles. Every value resolves to an OKLCH channel triplet
       * defined in globals.css, so `bg-accent/10` and friends keep working.
       * Components use these roles — never raw ramps. See DESIGN.md §4.
       */
      colors: {
        ground: "oklch(var(--ground) / <alpha-value>)",
        "surface-1": "oklch(var(--surface-1) / <alpha-value>)",
        "surface-2": "oklch(var(--surface-2) / <alpha-value>)",
        "surface-3": "oklch(var(--surface-3) / <alpha-value>)",

        "outline-subtle": "oklch(var(--outline-subtle) / <alpha-value>)",
        outline: "oklch(var(--outline) / <alpha-value>)",
        "outline-strong": "oklch(var(--outline-strong) / <alpha-value>)",

        text: "oklch(var(--text) / <alpha-value>)",
        "text-muted": "oklch(var(--text-muted) / <alpha-value>)",
        "text-faint": "oklch(var(--text-faint) / <alpha-value>)",

        accent: "oklch(var(--accent) / <alpha-value>)",
        "accent-text": "oklch(var(--accent-text) / <alpha-value>)",
        "on-accent": "oklch(var(--on-accent) / <alpha-value>)",

        success: "oklch(var(--success) / <alpha-value>)",
        warning: "oklch(var(--warning) / <alpha-value>)",
        danger: "oklch(var(--danger) / <alpha-value>)",
        info: "oklch(var(--info) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};
export default config;
