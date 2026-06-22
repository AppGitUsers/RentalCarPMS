/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#EEF4FA',
          100: '#D9E6F2',
          200: '#B3CDE5',
          300: '#7FA8CC',
          400: '#4E81AE',
          500: '#2C5F8A',
          600: '#1E4B72',
          700: '#163C5E',
          800: '#0F3D63',
          900: '#0A2840',
          950: '#061A2A',
        },
        amber: {
          50: '#FDF6E8',
          100: '#FAEAC4',
          200: '#F4D58C',
          300: '#EEBE54',
          400: '#E2A52A',
          500: '#D98E04',
          600: '#B97403',
          700: '#925C03',
          800: '#6B4302',
          900: '#473001',
        },
        success: {
          50: '#EAFAF2',
          100: '#CDF0DE',
          500: '#1B8A5A',
          600: '#157049',
          700: '#105939',
        },
        danger: {
          50: '#FCEEEC',
          100: '#F7D4CE',
          500: '#C0392B',
          600: '#A22F23',
        },
        surface: '#FFFFFF',
        canvas: '#F7FAFD',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontFeatureSettings: {
        tabular: '"tnum"',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(15, 61, 99, 0.06), 0 1px 3px 0 rgba(15, 61, 99, 0.08)',
        'card-hover': '0 4px 12px -2px rgba(15, 61, 99, 0.12), 0 2px 6px -2px rgba(15, 61, 99, 0.08)',
        panel: '0 2px 8px 0 rgba(15, 61, 99, 0.06)',
      },
      borderRadius: {
        xl: '0.875rem',
      },
    },
  },
  plugins: [],
}
