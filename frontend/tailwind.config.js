/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#36D79D",
          foreground: "#0F241C",
        },
        light: {
          background: "#F4F8F6",
          surface: {
            DEFAULT: "#FAFFFD",
            secondary: "#EEF3F0",
            tertiary: "#E8EEEC",
          },
          foreground: "#1B211E",
          muted: "#6D7A74",
          border: "#DEE4E1",
          success: "#29D163",
          warning: "#E59500",
          danger: "#F8465B",
        },
        dark: {
          background: "#121614",
          surface: {
            DEFAULT: "#1B221E",
            secondary: "#242C28",
            tertiary: "#27302C",
          },
          foreground: "#FBFDFC",
          muted: "#96A49E",
          border: "#2A322E",
          success: "#29D163",
          warning: "#F0AF23",
          danger: "#E33B4E",
        },
      },
      fontFamily: {
        sans: ["Fredoka", "sans-serif"],
      },
      borderRadius: {
        btn: "9999px",
        card: "16px",
        modal: "20px",
        badge: "8px",
      },
      boxShadow: {
        card: "0 4px 12px rgba(0, 0, 0, 0.05)",
        "card-hover": "0 8px 24px rgba(0, 0, 0, 0.08)",
      },
    },
  },
  plugins: [],
};
