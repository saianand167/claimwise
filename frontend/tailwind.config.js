/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4fa',
          100: '#dce5f2',
          600: '#1e3a6d',
          700: '#162d56',
          800: '#102140',
          900: '#0a162c',
        },
      },
    },
  },
  plugins: [],
};

