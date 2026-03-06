/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        galaxy: {
          purple: '#a78bfa',
          pink:   '#f9a8d4',
          green:  '#6ee7b7',
          gold:   '#fcd34d',
          dark:   '#0d0d2b',
          darker: '#000010',
        },
      },
    },
  },
  plugins: [],
}
