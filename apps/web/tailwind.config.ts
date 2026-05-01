import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#0052C9',
          gold: '#FEB81B',
        },
      },
    },
  },
  plugins: [],
};

export default config;
