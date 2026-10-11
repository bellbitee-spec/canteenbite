/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        sakura: {
          50: '#FDF2F4',
          100: '#FBE7EE',
          200: '#F6C7D7',
          300: '#EE9FB9',
          400: '#DC7296',
          500: '#C94F78',
          600: '#B33D65',
          700: '#962E52',
          800: '#7A2542',
          900: '#652137',
          950: '#352431',
          cream: '#FFF9F2',
          petal: '#FBE7EE',
          blush: '#FFF0F5',
          border: '#EBD4DC',
          rose: '#C94F78',
          'rose-dark': '#B33D65',
          plum: '#352431',
          taupe: '#735A67',
          mauve: '#927681',
          matcha: '#5F9A68',
        },
      },
      boxShadow: {
        'sakura-sm': '0 2px 8px -2px rgba(201, 79, 120, 0.08), 0 1px 4px -1px rgba(53, 36, 49, 0.04)',
        'sakura-card': '0 8px 30px -4px rgba(201, 79, 120, 0.08), 0 2px 10px -2px rgba(53, 36, 49, 0.03)',
        'sakura-hover': '0 14px 34px -4px rgba(201, 79, 120, 0.14), 0 4px 14px -2px rgba(53, 36, 49, 0.05)',
      },
    },
  },
  plugins: [],
};
