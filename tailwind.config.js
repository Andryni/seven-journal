/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#06060a',
        surface: '#0e0e14',
        card: '#111117',
        border: 'rgba(255,255,255,0.06)',
        primary: {
          DEFAULT: '#7c3aed',
          light: '#a78bfa',
          hover: '#6d28d9',
          glow: 'rgba(124,58,237,0.4)',
        },
        accent: {
          cyan: '#06b6d4',
          gold: '#f59e0b',
          teal: '#14b8a6',
        },
        profit: {
          DEFAULT: '#10b981',
          light: '#34d399',
          glow: 'rgba(16,185,129,0.4)',
        },
        loss: {
          DEFAULT: '#ef4444',
          light: '#f87171',
          glow: 'rgba(239,68,68,0.4)',
        },
        text: {
          primary: '#f4f4f5',
          secondary: '#a1a1aa',
          muted: '#52525b',
        },
      },
      fontFamily: {
        sans: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
        display: ['Orbitron', 'monospace'],
      },
      borderRadius: {
        '2xl': '20px',
        xl: '16px',
        lg: '12px',
        md: '10px',
        sm: '8px',
      },
      boxShadow: {
        primary: '0 0 20px rgba(124,58,237,0.4), 0 0 60px rgba(124,58,237,0.15)',
        green: '0 0 20px rgba(16,185,129,0.4), 0 0 60px rgba(16,185,129,0.15)',
        red: '0 0 20px rgba(239,68,68,0.4), 0 0 60px rgba(239,68,68,0.15)',
        cyan: '0 0 20px rgba(6,182,212,0.4), 0 0 60px rgba(6,182,212,0.15)',
        card: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        'card-hover': '0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.15)',
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-primary': 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
        'gradient-profit': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'gradient-loss': 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        'gradient-cyan': 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
        'gradient-dark': 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'spin-slow': 'spin-slow 20s linear infinite',
        'slide-up': 'slide-up 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
        'fade-scale': 'fade-in-scale 0.4s ease both',
        'blink': 'blink 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
