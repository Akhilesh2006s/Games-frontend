/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        night: '#05040d',
        nebula: '#1b163a',
        pulse: '#ff5771',
        aurora: '#53ffe3',
        royal: '#5b5fff',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        neon: '0 0 30px rgba(91, 95, 255, 0.35)',
      },
    },
  },
  plugins: [],
};

