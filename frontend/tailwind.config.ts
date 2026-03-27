import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        roundedJp: ['"M PLUS Rounded 1c"', '"Kosugi Maru"', 'sans-serif'],
      },
      colors: {
        snack: {
          cream: '#fff7ed',
          peach: '#ff7a59',
          mint: '#18a999',
          cocoa: '#3d2612',
        },
      },
      borderRadius: {
        bubble: '1.25rem',
      },
      boxShadow: {
        candy: '0 10px 25px rgba(205, 126, 40, 0.12)',
      },
    },
  },
  plugins: [],
};
export default config;
