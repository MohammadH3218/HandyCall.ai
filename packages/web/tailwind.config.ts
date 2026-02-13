import type { Config } from 'tailwindcss'

const config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx,js,jsx}',
    './components/**/*.{ts,tsx,js,jsx}',
    './app/**/*.{ts,tsx,js,jsx}',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '24px',
        md: '32px',
        xl: '40px',
      },
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: 'rgb(var(--stroke-subtle-rgb) / <alpha-value>)',
        input: 'rgb(var(--stroke-subtle-rgb) / <alpha-value>)',
        ring: 'rgb(var(--focus-rgb) / <alpha-value>)',
        background: 'rgb(var(--bg-rgb) / <alpha-value>)',
        foreground: 'rgb(var(--text-rgb) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--accent-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--bg-rgb) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--bg-elev-1-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--text-rgb) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'rgb(var(--danger-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--text-rgb) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'rgb(var(--bg-elev-2-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--text-muted-rgb) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--text-rgb) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'rgb(var(--bg-elev-2-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--text-rgb) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'rgb(var(--bg-elev-1-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--text-rgb) / <alpha-value>)',
        },
        surface: {
          1: 'rgb(var(--bg-elev-1-rgb) / <alpha-value>)',
          2: 'rgb(var(--bg-elev-2-rgb) / <alpha-value>)',
        },
        text: {
          DEFAULT: 'rgb(var(--text-rgb) / <alpha-value>)',
          muted: 'rgb(var(--text-muted-rgb) / <alpha-value>)',
          faint: 'rgb(var(--text-faint-rgb) / <alpha-value>)',
        },
        success: 'rgb(var(--success-rgb) / <alpha-value>)',
        warning: 'rgb(var(--warning-rgb) / <alpha-value>)',
      },
      borderRadius: {
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        xl: 'var(--r-xl)',
      },
      boxShadow: {
        1: 'var(--shadow-1)',
        2: 'var(--shadow-2)',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
      transitionDuration: {
        standard: '180ms',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config

export default config


