/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        mit: {
          white: '#FFFFFF',
          ice: '#F8FAFC',
          tint: '#F0F9FF',
          primary: '#0284C7',
          accent: '#38BDF8',
          navy: '#0F172A',
          border: '#E0F2FE',
          available: '#059669',
          issued: '#0284C7',
          reserved: '#D97706',
          overdue: '#DC2626',
        },
      },
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1440px',
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(2, 132, 199, 0.05)',
        'card': '0 4px 12px -2px rgba(15, 23, 42, 0.04), 0 2px 4px -2px rgba(2, 132, 199, 0.04)',
      },
    },
  },
  plugins: [],
};
