/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0F172A',
        card: {
          DEFAULT: '#1B2336',
          muted: '#272F42',
          border: '#334155'
        },
        brand: {
          emerald: '#22C55E',
          cyan: '#06B6D4',
          sky: '#38BDF8',
          amber: '#F59E0B',
          rose: '#EF4444'
        }
      },
      fontFamily: {
        sans: ['"Fira Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"Fira Code"', 'ui-monospace', 'monospace']
      }
    },
  },
  plugins: [],
}
