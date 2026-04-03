import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        tomato: '#E8433A',
        saffron: '#F5A623',
        herb: '#4CAF7D',
        sky: '#4A90D9',
        warm: '#FFFBF5',
        'warm-100': '#FFF5E6',
        'warm-200': '#FFECD0',
      },
      fontFamily: {
        rubik: ['Rubik', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
      },
    },
  },
  plugins: [],
}
export default config
