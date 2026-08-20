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
        paper: {
          bg: 'rgb(var(--paper-bg) / <alpha-value>)',
          surface: 'rgb(var(--paper-surface) / <alpha-value>)',
          card: 'rgb(var(--paper-card) / <alpha-value>)',
          border: 'rgb(var(--paper-border) / <alpha-value>)',
          borderDark: 'rgb(var(--paper-border-dark) / <alpha-value>)',
          ink: 'rgb(var(--paper-ink) / <alpha-value>)',
          muted: 'rgb(var(--paper-muted) / <alpha-value>)',
          lightMuted: 'rgb(var(--paper-light-muted) / <alpha-value>)',
          rust: 'rgb(var(--paper-rust) / <alpha-value>)',
          rustHover: 'rgb(var(--paper-rust-hover) / <alpha-value>)',
          emerald: 'rgb(var(--paper-emerald) / <alpha-value>)',
        }
      },
      fontFamily: {
        heading: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      spacing: {
        '3': '12px',
        '4': '16px',
        '6': '24px',
        '12': '48px',
      },
      boxShadow: {
        'offset-sm': '0 1px 2px 0 rgb(24 24 27 / 0.06)',
        'offset': '0 1px 3px 0 rgb(24 24 27 / 0.08)',
        'offset-lg': '0 4px 12px 0 rgb(24 24 27 / 0.08)',
        'offset-rust': '0 1px 3px 0 rgb(var(--paper-rust) / 0.25)',
      }
    },
  },
  plugins: [],
}
