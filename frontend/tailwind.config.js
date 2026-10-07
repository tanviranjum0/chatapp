/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        // theme-aware tokens: the values live in index.css (dark / light / high contrast)
        white: "rgb(var(--c-white) / <alpha-value>)",
        black: "rgb(var(--c-black) / <alpha-value>)",
        snow: "#ffffff", // always white (text on gradients and photos)
        slate: {
          100: "rgb(var(--s100) / <alpha-value>)",
          200: "rgb(var(--s200) / <alpha-value>)",
          300: "rgb(var(--s300) / <alpha-value>)",
          400: "rgb(var(--s400) / <alpha-value>)",
          500: "rgb(var(--s500) / <alpha-value>)",
        },
        ink: {
          950: "rgb(var(--ink950) / <alpha-value>)",
          900: "rgb(var(--ink900) / <alpha-value>)",
          800: "rgb(var(--ink800) / <alpha-value>)",
          700: "rgb(var(--ink700) / <alpha-value>)",
        },
        brand: {
          400: "rgb(var(--brand400) / <alpha-value>)",
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
