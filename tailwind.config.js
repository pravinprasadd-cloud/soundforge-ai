/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Semantic tokens — driven by CSS variables
        bg:        'rgb(var(--bg) / <alpha-value>)',
        surface:   'rgb(var(--surface) / <alpha-value>)',
        elevated:  'rgb(var(--elevated) / <alpha-value>)',
        border:    'rgb(var(--border) / <alpha-value>)',
        text:      'rgb(var(--text) / <alpha-value>)',
        muted:     'rgb(var(--muted) / <alpha-value>)',
        accent:    'rgb(var(--accent) / <alpha-value>)',
        accent2:   'rgb(var(--accent2) / <alpha-value>)',
        highlight: 'rgb(var(--highlight) / <alpha-value>)',
        danger:    'rgb(var(--danger) / <alpha-value>)',

        // Legacy names — mapped to tokens for backward compatibility
        ink: {
          900: 'rgb(var(--bg) / <alpha-value>)',
          800: 'rgb(var(--surface) / <alpha-value>)',
          700: 'rgb(var(--elevated) / <alpha-value>)',
          600: 'rgb(var(--border) / <alpha-value>)',
        },
        neon: {
          pink: 'rgb(var(--accent2) / <alpha-value>)',
          cyan: 'rgb(var(--accent) / <alpha-value>)',
          lime: 'rgb(var(--highlight) / <alpha-value>)',
        },
        brand: {
          DEFAULT: 'rgb(var(--highlight) / <alpha-value>)',
          dark:    'rgb(var(--highlight) / <alpha-value>)',
        },
        brass: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          dark:    'rgb(var(--accent) / <alpha-value>)',
        },
        marsh: {
          DEFAULT: 'rgb(var(--accent2) / <alpha-value>)',
          dark:    'rgb(var(--accent2) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
        serif: ['Georgia', 'serif'],
      },
      boxShadow: {
        knob:  '0 8px 16px rgba(0,0,0,.6), inset 0 -3px 6px rgba(255,255,255,.1), inset 0 3px 6px rgba(0,0,0,.7)',
        glass: '0 8px 32px rgba(0,0,0,.4)',
      },
    },
  },
  plugins: [],
};