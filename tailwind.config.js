/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Onest', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        craft: {
          bg: '#0B0F15',
          surface: '#161D27',
          surface2: '#1B2432',
          border: '#2A3545',
          accent: '#5BA4F5',
          green: '#42C774',
          purple: '#C9A0FF',
          orange: '#FFB155',
          red: '#FF7B72',
        },
      },
    },
  },
  plugins: [],
};
