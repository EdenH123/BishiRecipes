import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Material Design 3 tokens from Stitch design
        primary: '#b41c1b',
        'primary-container': '#d83730',
        'on-primary': '#ffffff',
        'on-primary-container': '#fffbff',
        secondary: '#835500',
        'secondary-container': '#feae2c',
        'on-secondary': '#ffffff',
        'on-secondary-container': '#6b4500',
        tertiary: '#006a43',
        'tertiary-container': '#168557',
        'on-tertiary': '#ffffff',
        'on-tertiary-container': '#f6fff6',
        error: '#ba1a1a',
        'error-container': '#ffdad6',
        surface: '#fdf9f3',
        'surface-dim': '#dddad4',
        'surface-bright': '#fdf9f3',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f7f3ed',
        'surface-container': '#f1ede7',
        'surface-container-high': '#ebe8e2',
        'surface-container-highest': '#e6e2dc',
        'on-surface': '#1c1c18',
        'on-surface-variant': '#5b403d',
        outline: '#8f706c',
        'outline-variant': '#e3beb9',
        'inverse-surface': '#31302d',
        'inverse-on-surface': '#f4f0ea',
        'inverse-primary': '#ffb4ab',
        // Legacy aliases for compatibility
        tomato: '#b41c1b',
        saffron: '#feae2c',
        herb: '#006a43',
        sky: '#4A90D9',
        warm: '#fdf9f3',
        'warm-100': '#f1ede7',
        'warm-200': '#ebe8e2',
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
    },
  },
  plugins: [],
}
export default config
