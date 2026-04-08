import type { Config } from 'tailwindcss'

function v(name: string) {
  return `var(--color-${name})`
}

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Material Design 3 tokens — driven by CSS variables for theming
        primary: v('primary'),
        'primary-container': v('primary-container'),
        'on-primary': v('on-primary'),
        'on-primary-container': v('on-primary-container'),
        secondary: '#835500',
        'secondary-container': '#feae2c',
        'on-secondary': '#ffffff',
        'on-secondary-container': '#6b4500',
        tertiary: '#006a43',
        'tertiary-container': '#168557',
        'on-tertiary': '#ffffff',
        'on-tertiary-container': '#f6fff6',
        error: v('error'),
        'error-container': v('error-container'),
        surface: v('surface'),
        'surface-dim': v('surface-dim'),
        'surface-bright': v('surface-bright'),
        'surface-container-lowest': v('surface-container-lowest'),
        'surface-container-low': v('surface-container-low'),
        'surface-container': v('surface-container'),
        'surface-container-high': v('surface-container-high'),
        'surface-container-highest': v('surface-container-highest'),
        'on-surface': v('on-surface'),
        'on-surface-variant': v('on-surface-variant'),
        outline: v('outline'),
        'outline-variant': v('outline-variant'),
        'inverse-surface': v('inverse-surface'),
        'inverse-on-surface': v('inverse-on-surface'),
        'inverse-primary': v('inverse-primary'),
        // Legacy aliases
        tomato: v('primary'),
        saffron: '#feae2c',
        herb: '#006a43',
        sky: '#4A90D9',
        warm: v('surface'),
        'warm-100': v('surface-container'),
        'warm-200': v('surface-container-high'),
      },
      fontFamily: {
        rubik: ['Rubik', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '1rem',
        card: '1rem',
        lg: '2rem',
        xl: '3rem',
      },
      animation: {
        shimmer: 'shimmer 1.5s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}
export default config
