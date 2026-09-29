/** @type {import('tailwindcss').Config} */
// Adapted from admin-template/tailwind.config.js per BACKEND-TASK.md §10 —
// only this config changed, the template's markup patterns (glass-card,
// nav-item, chip, stat-icon, notif-item) are re-implemented in React as-is.
// Palette anchored to design/tokens.json's brand book values, not invented:
// graphite #0B0B0C, brand swapped to ArByte violet (F-01),
// and the onDark status variants (already tuned for ≥4.5:1 on graphite).
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Estedad", "Tahoma", "sans-serif"],
      },
      colors: {
        ink: {
          950: "#0B0B0C",
          900: "#131315",
          850: "#18181B",
          800: "#202023",
          700: "#2C2C30",
          600: "#3D3D42",
        },
        // ArByte violet (packages/tokens/index.css --palette-violet-*):
        // 500 = #6C4DFF brand, 700 = violet-deep, 300/400 = the on-dark
        // variants the tokens define for text on dark surfaces.
        brand: {
          50: "#F4F1FD",
          100: "#EDE9FA",
          200: "#D6CCF7",
          300: "#A88CFF",
          400: "#8B6BFF",
          500: "#6C4DFF",
          600: "#5B3EE6",
          700: "#4B32C3",
        },
        titanium: "#7A7D82",
        silver: "#B8BCC2",
        "fog-white": "#F5F5F3",
        warning: "#F4B400",
        danger: "#E86A6A",
        success: "#2FB66B",
      },
      boxShadow: {
        // Kept only for the admin panel — the storefront's brand book rejects
        // shadows in favor of borders, but this is internal tooling, not a
        // customer-facing surface, and the glow is toned down from the
        // template's green version to match cyan at lower opacity.
        glow: "0 0 24px -8px rgba(108, 77, 255, 0.35)",
        "glow-lg": "0 0 60px -14px rgba(108, 77, 255, 0.28)",
        card: "0 8px 30px -12px rgba(2, 8, 20, 0.7)",
        lift: "0 20px 45px -15px rgba(2, 8, 20, 0.85)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(108,77,255,.4)" },
          "70%": { boxShadow: "0 0 0 10px rgba(108,77,255,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(108,77,255,0)" },
        },
        // floaty / spin-slow / marquee-x deliberately dropped — an admin
        // panel staff look at for hours shouldn't have floating chrome.
      },
      animation: {
        "fade-up": "fade-up .5s cubic-bezier(.22,1,.36,1) both",
        "fade-in": "fade-in .6s ease both",
        "scale-in": "scale-in .5s cubic-bezier(.22,1,.36,1) both",
        shimmer: "shimmer 2.5s linear infinite",
        "pulse-ring": "pulse-ring 2s cubic-bezier(.4,0,.6,1) infinite",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(.22,1,.36,1)",
      },
    },
  },
  plugins: [],
};
