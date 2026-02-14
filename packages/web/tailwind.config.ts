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
      padding: '2rem',
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
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        emerald: {
          50: '#edf5f3',
          100: '#d8e9e3',
          200: '#b6d3c9',
          300: '#93bdae',
          400: '#74aa9c',
          500: '#5f9387',
          600: '#4f7b71',
          700: '#42655d',
          800: '#38534d',
          900: '#314640',
          950: '#1f2d2a',
        },
        green: {
          50: '#edf5f3',
          100: '#d8e9e3',
          200: '#b6d3c9',
          300: '#93bdae',
          400: '#74aa9c',
          500: '#5f9387',
          600: '#4f7b71',
          700: '#42655d',
          800: '#38534d',
          900: '#314640',
          950: '#1f2d2a',
        },
        blue: {
          50: '#edf5f3',
          100: '#d8e9e3',
          200: '#b6d3c9',
          300: '#93bdae',
          400: '#74aa9c',
          500: '#5f9387',
          600: '#4f7b71',
          700: '#42655d',
          800: '#38534d',
          900: '#314640',
          950: '#1f2d2a',
        },
        gray: {
          50: '#171717',
          100: '#202123',
          200: '#2a2b2d',
          300: '#343541',
          400: '#4a4b52',
          500: '#6b6c72',
          600: '#8e8f95',
          700: '#b0b1b6',
          800: '#d0d1d5',
          900: '#ececec',
          950: '#f7f7f8',
        },
        slate: {
          50: '#17191f',
          100: '#20232b',
          200: '#2a2e38',
          300: '#353a46',
          400: '#4a5160',
          500: '#667085',
          600: '#8a94a8',
          700: '#b2bac8',
          800: '#d8dce3',
          900: '#eceff4',
          950: '#f7f8fa',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
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
