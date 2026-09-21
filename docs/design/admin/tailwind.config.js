/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,html}"],
  theme: {
    screens: {
      xs: "400px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      fontFamily: {
        persian: ["Vazirmatn", "Tahoma", "sans-serif"],
      },
      colors: {
        surface: {
          DEFAULT: "#f8faff",
          card: "#ffffff",
          muted: "#eef2f9",
        },
        ink: {
          DEFAULT: "#0f172a",
          soft: "#475569",
          faint: "#94a3b8",
        },
        brand: {
          blue: "#2563eb",
          purple: "#7c3aed",
          pink: "#ec4899",
          green: "#10b981",
          orange: "#f59e0b",
          cyan: "#06b6d4",
        },
      },
      boxShadow: {
        soft: "0 4px 24px rgba(15, 23, 42, 0.06)",
        card: "0 8px 32px rgba(15, 23, 42, 0.08)",
        glow: "0 12px 40px rgba(37, 99, 235, 0.18)",
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out forwards",
        "fade-in": "fade-in 0.5s ease-out forwards",
        float: "float 8s ease-in-out infinite",
        "pulse-soft": "pulse-soft 3s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
      },
    },
  },
  plugins: [],
};
