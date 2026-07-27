/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // High-end custom palette
        brand: {
          50: '#f5f7fa',
          100: '#e4ebf3',
          200: '#c2d2e4',
          300: '#94afd0',
          400: '#6184b7',
          500: '#3e639a',
          600: '#2f4d7b',
          700: '#263d63',
          800: '#1f3150',
          900: '#1a2741',
          950: '#0e1525',
        }
      }
    },
  },
  plugins: [],
}
