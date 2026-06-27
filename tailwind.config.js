/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(15 23 42 / 0.06), 0 4px 16px -2px rgb(15 23 42 / 0.08)",
        "card-hover": "0 4px 12px -2px rgb(15 23 42 / 0.1), 0 12px 32px -4px rgb(79 70 229 / 0.12)",
        glow: "0 0 40px -8px rgb(99 102 241 / 0.35)",
      },
      backgroundImage: {
        "mesh-gradient":
          "radial-gradient(at 40% 20%, rgb(99 102 241 / 0.12) 0px, transparent 50%), radial-gradient(at 80% 0%, rgb(139 92 246 / 0.1) 0px, transparent 50%), radial-gradient(at 0% 50%, rgb(59 130 246 / 0.08) 0px, transparent 50%)",
      },
    },
  },
  plugins: [],
};
