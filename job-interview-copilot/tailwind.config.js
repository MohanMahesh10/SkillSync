/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['index.html', 'src/**/*.{svelte,ts,js}'],
  theme: {
    extend: {
      colors: {
        accent: {
          sky: {
            DEFAULT: '#38bdf8',
          },
          yellow: {
            DEFAULT: '#facc15',
          },
          red: {
            DEFAULT: '#ef4444',
          },
        },
      },
    },
  },
  plugins: [],
};


