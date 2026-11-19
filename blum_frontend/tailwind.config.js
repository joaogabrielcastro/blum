/** @type {import('tailwindcss').Config} */

/** Cor definida como canais RGB em CSS (`--x: 36 87 214`) para aceitar `/opacidade`. */
const token = (name) => `rgb(var(${name}) / <alpha-value>)`;

/**
 * Escala neutra sensível ao tema. Componentes legados usam `gray-*`/`zinc-*`
 * pensando no tema claro; no escuro a escala é invertida em `index.css`,
 * o que mantém contraste sem reescrever cada classe.
 */
const neutral = Object.fromEntries(
  [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((step) => [
    step,
    token(`--n-${step}`),
  ]),
);

/**
 * Tons semânticos (alertas, status, badges) também seguem o tema: os tons de
 * fundo/borda (50–300) e de texto (700–950) são invertidos no escuro.
 * 400–600 (botões sólidos, ícones) ficam iguais nos dois temas.
 */
const defaultColors = require("tailwindcss/colors");
const plugin = require("tailwindcss/plugin");

const TINT_PALETTES = [
  "blue", "sky", "indigo", "violet", "purple", "teal",
  "emerald", "green", "amber", "yellow", "orange", "red", "rose",
];
const TINT_STEPS = [50, 100, 200, 300, 700, 800, 900, 950];
const DARK_BG = [11, 11, 13];
const DARK_MIX = { 50: 0.12, 100: 0.18, 200: 0.3, 300: 0.42 };
const DARK_TEXT_FROM = { 700: 300, 800: 200, 900: 100, 950: 50 };

const hexToRgb = (hex) => {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const channels = (rgb) => rgb.map((v) => Math.round(v)).join(" ");

const tintColors = Object.fromEntries(
  TINT_PALETTES.map((name) => [
    name,
    Object.fromEntries(
      TINT_STEPS.map((step) => [step, token(`--t-${name}-${step}`)]),
    ),
  ]),
);

const tintVariables = plugin(({ addBase }) => {
  const light = {};
  const dark = {};
  TINT_PALETTES.forEach((name) => {
    const pal = defaultColors[name];
    const base = hexToRgb(pal[500]);
    TINT_STEPS.forEach((step) => {
      const key = `--t-${name}-${step}`;
      light[key] = channels(hexToRgb(pal[step]));
      if (DARK_MIX[step] != null) {
        const a = DARK_MIX[step];
        dark[key] = channels(base.map((c, i) => DARK_BG[i] + (c - DARK_BG[i]) * a));
      } else {
        dark[key] = channels(hexToRgb(pal[DARK_TEXT_FROM[step]]));
      }
    });
  });
  addBase({ ":root": light, "html.dark": dark });
});

module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: token("--brand"),
          50: token("--brand-50"),
          100: token("--brand-100"),
          500: token("--brand"),
          600: token("--brand-hover"),
          700: token("--brand-strong"),
        },
        surface: {
          DEFAULT: token("--color-surface"),
          muted: token("--color-surface-muted"),
          page: token("--color-page"),
          elevated: token("--color-elevated"),
        },
        ink: {
          DEFAULT: token("--color-text"),
          muted: token("--color-text-muted"),
        },
        edge: token("--color-border"),
        overlay: token("--color-overlay"),
        gray: neutral,
        zinc: neutral,
        ...tintColors,
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl: "0.5rem",
        "2xl": "0.75rem",
        "3xl": "1rem",
      },
      boxShadow: {
        glass: "var(--shadow-soft)",
        soft: "var(--shadow-soft)",
        pop: "var(--shadow-pop)",
      },
      animation: {
        "drawer-in": "drawerIn 0.2s ease-out",
        "fade-in": "fadeIn 0.15s ease-out",
      },
      keyframes: {
        drawerIn: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [tintVariables],
};
