import type { Config } from 'tailwindcss';

// Every color resolves to a CSS variable (src/styles/tokens.css + src/index.css)
// so the same class works in light and dark mode. `rgb(var(--x) / <alpha-value>)`
// keeps opacity modifiers like bg-gray-900/40 working.
const v = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

const SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
const palette = (name: string) => Object.fromEntries(SHADES.map((s) => [s, v(`${name}-${s}`)]));

const PALETTES = ['red', 'orange', 'yellow', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'violet', 'purple', 'pink', 'rose'];

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ...Object.fromEntries(PALETTES.map((p) => [p, palette(p)])),
        gray: palette('gray'),
        slate: palette('gray'),
        // Brand. `amber` is the pre-redesign accent class name — kept as an alias
        // so older screens pick up the brand color automatically.
        primary: { DEFAULT: v('brand-600'), ...palette('brand') },
        amber: palette('brand'),
        canvas: v('canvas'),
        surface: { DEFAULT: v('surface'), raised: v('surface-raised') },
        line: v('border'),
        ink: { DEFAULT: v('text'), muted: v('text-muted') },
        income: { DEFAULT: v('income'), light: v('income-soft'), dark: v('income-strong') },
        expense: { DEFAULT: v('expense'), light: v('expense-soft'), dark: v('expense-strong') },
        transfer: { DEFAULT: v('transfer'), light: v('gray-100') },
        success: { DEFAULT: v('income'), light: v('income-soft') },
        app: {
          bg: v('canvas'),
          card: v('surface'),
          border: v('border'),
          text: v('text'),
          'text-secondary': v('text-muted'),
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
      },
      boxShadow: {
        card: '0 1px 2px rgb(15 23 42 / 0.04), 0 1px 3px rgb(15 23 42 / 0.04)',
        'card-hover': '0 4px 16px rgb(15 23 42 / 0.08)',
        elevated: '0 12px 32px rgb(15 23 42 / 0.12)',
        fab: '0 10px 24px rgb(79 70 229 / 0.35)',
      },
    },
  },
  plugins: [],
};

export default config;
