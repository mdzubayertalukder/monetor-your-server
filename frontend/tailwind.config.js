/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        ops: {
          950: '#070a0f', // deep canvas
          900: '#0d1117', // main panels
          850: '#131822', // cards / subpanels
          800: '#1b2230', // hover / active
          750: '#232b3d', // subtle elements
          700: '#2d374b', // borders
          600: '#414e68', // muted text / borders
          500: '#64748b',
          accent: '#0284c7', // industrial cyan/blue
          crit: '#f43f5e',
          warn: '#f59e0b',
          ok: '#10b981',
          info: '#38bdf8',
        }
      }
    },
  },
  plugins: [],
}
