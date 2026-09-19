/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Design: a serif with real polytonic Greek for Scripture...
        scripture: ['Literata', 'Gentium Book Plus', 'EB Garamond', 'Georgia', 'serif'],
        // ...and a separate face for interface chrome.
        ui: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        ink: {
          950: '#0a0a0b', // page
          900: '#121214', // raised surface
          800: '#1c1c20', // control
          700: '#2a2a30', // border
        },
        // Stability is a color, never a number (product.md / SCH-1).
        stability: {
          new: '#8a8a94',
          fragile: '#e0603a',
          working: '#d9a441',
          firm: '#4f9d69',
        },
      },
    },
  },
  plugins: [],
}
