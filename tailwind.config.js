/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Unbounded', 'system-ui', 'sans-serif'],
        sans: ['Golos Text', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        craft: {
          bg: '#0e0e0e',
          surface: '#161616',
          surface2: '#1c1c1c',
          border: '#262626',
          border2: '#333333',
          accent: '#5BA4F5',
          green: '#42C774',
          purple: '#C9A0FF',
          orange: '#FFB155',
          red: '#FF7B72',
          cyan: '#6DD8E0',
          muted: '#7A8899',
        },
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
    },
  },
  plugins: [],
};
