import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FBBF24',
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
        income: {
          DEFAULT: '#3B82F6',
          light: '#EFF6FF',
          dark: '#1D4ED8',
        },
        expense: {
          DEFAULT: '#EF4444',
          light: '#FEF2F2',
          dark: '#B91C1C',
        },
        transfer: {
          DEFAULT: '#6B7280',
          light: '#F9FAFB',
        },
        success: {
          DEFAULT: '#10B981',
          light: '#ECFDF5',
        },
        app: {
          bg: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E5E7EB',
          text: '#111827',
          'text-secondary': '#6B7280',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 8px 22px rgba(15, 23, 42, 0.05)',
        'card-hover': '0 14px 35px rgba(15, 23, 42, 0.10)',
        elevated: '0 14px 35px rgba(15, 23, 42, 0.08)',
        fab: '0 18px 40px rgba(217, 119, 6, 0.32)',
      },
    },
  },
  plugins: [],
};

export default config;
