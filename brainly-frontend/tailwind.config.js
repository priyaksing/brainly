/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        white: {
          100: "#ffffff",
          200: "#f9fbfc"
        },
        gray: {
          300: "#a8aaac",
          400: "#6e747a",
          500: "#373b49",
          600: "#404447"
        },
        blue: {
          100: "#e0e7ff",
          200: "#a39eee",
          400: "#5c57bb",
          500: "#5046e4",
          600: "#2419b3"
        }
      }
    },
  },
  plugins: [],
}

