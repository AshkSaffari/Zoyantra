/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        autodesk: {
          blue: '#0066CC',
          dark: '#1E3A8A',
          light: '#3B82F6'
        }
      }
    },
  },
  plugins: [],
}



