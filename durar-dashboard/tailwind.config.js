/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class", "[data-theme='dark']"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        durar: {
          blue: "#1E3A8A",
          gold: "#D4AF37",
          light: "#F8F9FB",
        },
        tivo: {
          primary: "#5C61F2",
          secondary: "#6C5DD3",
          info: "#48A3D7",
          success: "#54BA4A",
          warning: "#FFAA05",
          danger: "#E4606D",
          dark: "#2B2E4A",
          muted: "#A0AEC0",
        },
      },
      fontFamily: {
        sans: ["Tajawal", "Poppins", "ui-sans-serif", "system-ui", "Segoe UI", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
