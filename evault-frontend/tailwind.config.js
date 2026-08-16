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
        heading: ['Manrope', 'DM Sans', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      spacing: {
        '3': '12px',
        '4': '16px',
        '6': '24px',
        '12': '48px',
      },
      boxShadow: {
        'offset-sm': '2px 2px 0px 0px rgb(var(--paper-border-dark))',
        'offset': '3px 3px 0px 0px rgb(var(--paper-border-dark))',
        'offset-lg': '5px 5px 0px 0px rgb(var(--paper-border-dark))',
        'offset-rust': '3px 3px 0px 0px rgb(var(--paper-rust))',
      }
    },
  },
  plugins: [],
}
