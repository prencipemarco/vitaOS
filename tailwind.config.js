/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
        serif: ['Lora', 'Georgia', 'serif'],
      },
      colors: {
        accent: { DEFAULT: '#C46A3C', dark: '#DF8A68' },
        surface: { DEFAULT: '#F9F8F5', dark: '#181614' },
      },
      animation: {
        'fade-up': 'fadeUp 0.24s cubic-bezier(.4,0,.2,1) both',
        'fade-in': 'fadeIn 0.18s ease both',
        'slide-in': 'slideIn 0.22s cubic-bezier(.4,0,.2,1) both',
      },
      keyframes: {
        fadeUp: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideIn: { from: { opacity: 0, transform: 'translateX(-8px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [],
}
