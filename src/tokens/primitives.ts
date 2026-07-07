/**
 * Primitive tokens: raw, context-free values that never reference another
 * token. Semantic tokens (see `./semantic.ts`) alias into this layer, so
 * changing a primitive updates everything that points at it.
 */
import { defineTokens } from "./schema.js";

export const primitives = defineTokens({
  color: {
    neutral: {
      0: { $type: "color", $value: "#ffffff", $description: "White." },
      50: { $type: "color", $value: "#f7f7f8" },
      100: { $type: "color", $value: "#ebebef" },
      200: { $type: "color", $value: "#d5d5dc" },
      400: { $type: "color", $value: "#9a9aa8" },
      600: { $type: "color", $value: "#5b5b68" },
      800: { $type: "color", $value: "#2a2a31" },
      900: { $type: "color", $value: "#17171b" },
      1000: { $type: "color", $value: "#000000", $description: "Black." },
    },
    brand: {
      100: { $type: "color", $value: "#dbe4ff" },
      300: { $type: "color", $value: "#91a7ff" },
      500: { $type: "color", $value: "#3b5bdb", $description: "Brand base." },
      700: { $type: "color", $value: "#2c3fa8" },
      900: { $type: "color", $value: "#1d2a70" },
    },
    red: {
      500: { $type: "color", $value: "#e03131" },
    },
    green: {
      500: { $type: "color", $value: "#2f9e44" },
    },
  },

  // Base spacing scale (4px grid). Consumers reference these via semantic tokens.
  spacing: {
    0: { $type: "dimension", $value: "0" },
    1: { $type: "dimension", $value: "0.25rem" },
    2: { $type: "dimension", $value: "0.5rem" },
    3: { $type: "dimension", $value: "0.75rem" },
    4: { $type: "dimension", $value: "1rem" },
    6: { $type: "dimension", $value: "1.5rem" },
    8: { $type: "dimension", $value: "2rem" },
    12: { $type: "dimension", $value: "3rem" },
  },

  // Sizing scale for widths/heights of components and containers.
  sizing: {
    xs: { $type: "dimension", $value: "20rem" },
    sm: { $type: "dimension", $value: "24rem" },
    md: { $type: "dimension", $value: "28rem" },
    lg: { $type: "dimension", $value: "32rem" },
    full: { $type: "dimension", $value: "100%" },
  },

  radius: {
    none: { $type: "dimension", $value: "0" },
    sm: { $type: "dimension", $value: "0.125rem" },
    md: { $type: "dimension", $value: "0.375rem" },
    lg: { $type: "dimension", $value: "0.75rem" },
    full: { $type: "dimension", $value: "9999px" },
  },

  border: {
    width: {
      none: { $type: "dimension", $value: "0" },
      thin: { $type: "dimension", $value: "1px" },
      thick: { $type: "dimension", $value: "2px" },
    },
  },

  shadow: {
    sm: {
      $type: "shadow",
      $value: {
        color: "rgba(0, 0, 0, 0.08)",
        offsetX: "0",
        offsetY: "1px",
        blur: "2px",
        spread: "0",
      },
    },
    lg: {
      $type: "shadow",
      $value: [
        {
          color: "rgba(0, 0, 0, 0.1)",
          offsetX: "0",
          offsetY: "8px",
          blur: "16px",
          spread: "-4px",
        },
        {
          color: "rgba(0, 0, 0, 0.06)",
          offsetX: "0",
          offsetY: "2px",
          blur: "4px",
          spread: "0",
        },
      ],
    },
  },

  zIndex: {
    base: { $type: "number", $value: 0 },
    dropdown: { $type: "number", $value: 1000 },
    overlay: { $type: "number", $value: 1100 },
    modal: { $type: "number", $value: 1200 },
    toast: { $type: "number", $value: 1300 },
  },

  motion: {
    duration: {
      fast: { $type: "duration", $value: "120ms" },
      base: { $type: "duration", $value: "200ms" },
      slow: { $type: "duration", $value: "320ms" },
    },
    easing: {
      standard: { $type: "cubicBezier", $value: [0.4, 0, 0.2, 1] },
      accelerate: { $type: "cubicBezier", $value: [0.4, 0, 1, 1] },
      decelerate: { $type: "cubicBezier", $value: [0, 0, 0.2, 1] },
    },
  },

  typography: {
    fontFamily: {
      sans: {
        $type: "fontFamily",
        $value: ["Inter", "system-ui", "sans-serif"],
      },
      mono: {
        $type: "fontFamily",
        $value: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
    fontSize: {
      sm: { $type: "dimension", $value: "0.875rem" },
      md: { $type: "dimension", $value: "1rem" },
      lg: { $type: "dimension", $value: "1.25rem" },
      xl: { $type: "dimension", $value: "1.5rem" },
    },
    fontWeight: {
      regular: { $type: "fontWeight", $value: 400 },
      medium: { $type: "fontWeight", $value: 500 },
      bold: { $type: "fontWeight", $value: 700 },
    },
    lineHeight: {
      tight: { $type: "number", $value: 1.2 },
      normal: { $type: "number", $value: 1.5 },
    },
    letterSpacing: {
      normal: { $type: "dimension", $value: "0" },
      wide: { $type: "dimension", $value: "0.025em" },
    },
  },
});
