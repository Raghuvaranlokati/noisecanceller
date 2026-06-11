/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#8b5cf6',
          hover: '#7c3aed',
        },
        dark: {
          900: '#050505',
          800: '#111111',
          border: '#27272a'
        }
      },
      fontFamily: {
        inter: ['var(--font-inter)'],
        outfit: ['var(--font-outfit)'],
      }
    },
  },
  plugins: [],
}
