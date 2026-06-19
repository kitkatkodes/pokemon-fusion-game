/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'poke-red': '#e63946',
        'poke-blue': '#4cc9f0',
        'poke-yellow': '#f4c430',
        'poke-dark': '#0a0a0f',
        'poke-card': '#1a1a2e',
        'poke-border': '#2d2d4e',
        'neon-green': '#4ade80',
        'neon-pink': '#f472b6',
      },
      fontFamily: {
        game: ['"Press Start 2P"', 'monospace'],
        ui: ['"Exo 2"', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
        'scan': 'scan 2s linear infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #4cc9f0, 0 0 10px #4cc9f0' },
          '100%': { boxShadow: '0 0 20px #4cc9f0, 0 0 40px #4cc9f0, 0 0 80px #4cc9f040' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        scan: {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '0% 100%' },
        },
      },
    },
  },
  plugins: [],
}
