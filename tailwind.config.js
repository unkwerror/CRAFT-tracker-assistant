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
          bg: 'rgb(var(--craft-bg) / <alpha-value>)',
          surface: 'rgb(var(--craft-surface) / <alpha-value>)',
          surface2: 'rgb(var(--craft-surface2) / <alpha-value>)',
          border: 'rgb(var(--craft-border) / <alpha-value>)',
          border2: 'rgb(var(--craft-border2) / <alpha-value>)',
          accent: 'rgb(var(--craft-accent) / <alpha-value>)',
          green: 'rgb(var(--craft-green) / <alpha-value>)',
          purple: 'rgb(var(--craft-purple) / <alpha-value>)',
          orange: 'rgb(var(--craft-orange) / <alpha-value>)',
          red: 'rgb(var(--craft-red) / <alpha-value>)',
          cyan: 'rgb(var(--craft-cyan) / <alpha-value>)',
          muted: 'rgb(var(--craft-muted) / <alpha-value>)',
        },
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
    },
  },
  plugins: [],
};
