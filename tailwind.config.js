/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
      },
      colors: {
        parchment: {
          50: '#fbf8f1',
          100: '#f4eedb',
          200: '#e7dcb4',
          300: '#d6c485',
          400: '#c2a958',
          500: '#a98a3d',
        },
        stone: {
          850: '#1c1b18',
          900: '#141312',
        },
      },
    },
  },
  plugins: [],
};
