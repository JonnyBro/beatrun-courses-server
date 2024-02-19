/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js,php}"],
  theme: {
    extend: {            
      colors: {
        'zinc': {
          920: '#131316'
        },
        'neutral': {
          920: '#121212'
        }
      }
    },
  },
  plugins: [],
}