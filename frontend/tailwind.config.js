/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        ink: {
          950: "#06060f",
          900: "#0a0a18",
          800: "#11112a",
          700: "#1a1a3a",
        },
        brand: {
          400: "#8b9bff",
          500: "#6d7cff",
          600: "#5b5bf0",
          700: "#4a46d4",
        },
        aqua: {
          400: "#4cc9f0",
          500: "#22b8e8",
        },
        bloom: {
          400: "#e879f9",
          500: "#d946ef",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(139,155,255,.25), 0 8px 32px -8px rgba(109,124,255,.55)",
        soft: "0 10px 40px -12px rgba(0,0,0,.6)",
      },
      keyframes: {
        float: {
          "0%,100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-14px) rotate(1.2deg)" },
        },
        drift: {
          "0%,100%": { transform: "translate3d(0,0,0) scale(1)" },
          "33%": { transform: "translate3d(6vw,-4vh,0) scale(1.15)" },
          "66%": { transform: "translate3d(-5vw,5vh,0) scale(.92)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        gradientShift: {
          "0%,100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        ping2: {
          "75%,100%": { transform: "scale(2.2)", opacity: "0" },
        },
      },
      animation: {
        float: "float 7s ease-in-out infinite",
        drift: "drift 22s ease-in-out infinite",
        "drift-slow": "drift 32s ease-in-out infinite reverse",
        shimmer: "shimmer 1.6s infinite",
        gradient: "gradientShift 6s ease infinite",
        ping2: "ping2 2s cubic-bezier(0,0,.2,1) infinite",
      },
    },
  },
  plugins: [],
};
