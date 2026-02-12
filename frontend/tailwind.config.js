/** @type {import('tailwindcss').Config} */
module.exports = {
  // NativeWind v4 uses this to scan for class names
  content: [
    './App.{js,jsx,ts,tsx}',
    './screens/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ── Primary: Deep Teal ──
        primary: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488', // Main brand color
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
          950: '#042F2E',
          DEFAULT: '#0D9488',
        },
        // ── Accent: Amber ──
        accent: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B', // Main accent
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
          950: '#451A03',
          DEFAULT: '#F59E0B',
        },
        // ── Semantic colors ──
        success: {
          50: '#F0FDF4',
          500: '#22C55E',
          600: '#16A34A',
          DEFAULT: '#22C55E',
        },
        danger: {
          50: '#FEF2F2',
          500: '#EF4444',
          600: '#DC2626',
          DEFAULT: '#EF4444',
        },
        warning: {
          50: '#FFFBEB',
          500: '#F59E0B',
          600: '#D97706',
          DEFAULT: '#F59E0B',
        },
        info: {
          50: '#EFF6FF',
          500: '#3B82F6',
          600: '#2563EB',
          DEFAULT: '#3B82F6',
        },
        // ── Neutral surface colors ──
        surface: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0A0A0A',
        },
      },
      fontFamily: {
        sans: ['Inter'],
        'sans-medium': ['Inter-Medium'],
        'sans-semibold': ['Inter-SemiBold'],
        'sans-bold': ['Inter-Bold'],
      },
      borderRadius: {
        'card': '12px',
        'button': '8px',
        'input': '8px',
        'pill': '9999px',
      },
      spacing: {
        'card': '16px',
        'section': '24px',
        'screen': '20px',
      },
    },
  },
  plugins: [],
};
