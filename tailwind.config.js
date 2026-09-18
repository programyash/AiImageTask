/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'Segoe UI Variable Text',
          'Segoe UI',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
      },
      colors: {
        // Greens: 950-800 for the sidebar, 700/600 for accents and buttons,
        // 100/50 for tinted surfaces.
        brand: {
          950: '#08251D',
          900: '#0B2E24',
          800: '#0D3328',
          700: '#0B5D48',
          600: '#2D7A63',
          500: '#3E8F76',
          200: '#BFDCD0',
          100: '#DCEBE4',
          50: '#EEF5F1',
        },
        canvas: '#F7F8F5',
        card: '#FFFFFF',
        line: '#E4E9E5',
        muted: '#F0F3F1',
        ink: {
          DEFAULT: '#17211D',
          2: '#66736D',
          3: '#9AA59F',
        },
        // Restrained secondary accent, used only on the "happy" card icon.
        plum: {
          600: '#7C4AB5',
          100: '#EFE6F9',
        },
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(23, 33, 29, 0.04), 0 4px 16px -8px rgba(23, 33, 29, 0.08)',
        pop: '0 4px 12px -2px rgba(23, 33, 29, 0.12), 0 12px 32px -12px rgba(23, 33, 29, 0.18)',
        button: '0 1px 2px rgba(11, 93, 72, 0.25)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-scale': {
          from: { opacity: '0', transform: 'scale(0.985)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'bar-grow': {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 260ms cubic-bezier(0.2, 0.7, 0.2, 1) both',
        'fade-scale': 'fade-scale 240ms cubic-bezier(0.2, 0.7, 0.2, 1) both',
        'bar-grow': 'bar-grow 480ms cubic-bezier(0.2, 0.7, 0.2, 1) both',
      },
    },
  },
  plugins: [],
};
