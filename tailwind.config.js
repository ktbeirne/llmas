/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./chat.html", 
    "./settings.html",
    "./renderer/**/*.html",
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // デザインシステムカラーパレット
        primary: '#BFECFF',
        secondary: '#CDC1FF',
        background: '#FFF6E3',
        accent: '#FFCCEA',
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      animation: {
        'spin-fast': 'spin 0.7s linear infinite',
      },
    },
  },
  plugins: [],
}