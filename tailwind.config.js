/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core backgrounds - use CSS variables for theme switching
        void: 'var(--color-void)',
        surface: 'var(--color-surface)',
        elevated: 'var(--color-elevated)',
        hover: 'var(--color-hover)',

        // Grid & borders
        grid: 'var(--color-grid)',
        border: 'var(--color-border)',
        'border-subtle': 'var(--color-border-subtle)',

        // Text
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        'text-dim': 'var(--color-text-dim)',

        // Trading colors (same in both themes for consistency)
        long: {
          DEFAULT: '#22c55e',
          glow: '#4ade80',
          bg: 'rgba(34, 197, 94, 0.1)',
          border: 'rgba(34, 197, 94, 0.3)',
        },
        short: {
          DEFAULT: '#ef4444',
          glow: '#f87171',
          bg: 'rgba(239, 68, 68, 0.1)',
          border: 'rgba(239, 68, 68, 0.3)',
        },

        // Accent colors (same in both themes)
        price: '#3b82f6',
        'price-glow': '#60a5fa',
        accent: '#6366f1',
        'accent-glow': '#818cf8',
        gold: '#f59e0b',
        'gold-glow': '#fbbf24',
        purple: '#a855f7',
        orange: '#f97316',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'SF Mono', 'Monaco', 'monospace'],
        sans: ['DM Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xxs': '0.625rem',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
        'settlement-drop': 'settlement-drop 0.6s ease-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.6 },
        },
        'fade-in': {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        'slide-up': {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { opacity: 0, transform: 'translateY(-10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: 0, transform: 'scale(0.95)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'settlement-drop': {
          '0%': { opacity: 0, transform: 'translateY(-20px)' },
          '60%': { transform: 'translateY(3px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'grid-pattern': 'linear-gradient(to right, var(--color-grid) 1px, transparent 1px), linear-gradient(to bottom, var(--color-grid) 1px, transparent 1px)',
        'shimmer-gradient': 'linear-gradient(90deg, transparent 0%, var(--color-shimmer-highlight) 50%, transparent 100%)',
      },
      boxShadow: {
        'glow-long': '0 0 20px rgba(34, 197, 94, 0.3)',
        'glow-short': '0 0 20px rgba(239, 68, 68, 0.3)',
        'glow-price': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-gold': '0 0 30px rgba(245, 158, 11, 0.4)',
        'card': '0 4px 6px -1px var(--color-card-shadow), 0 2px 4px -2px var(--color-card-shadow)',
        'card-hover': '0 10px 25px -5px var(--color-card-hover-shadow), 0 8px 10px -6px var(--color-card-hover-shadow)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
