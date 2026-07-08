/**
 * Semantic tokens: intent-based tokens that alias primitives via `ref(...)`.
 * These are what product code should consume. Each `$value` is a curly-brace
 * reference (e.g. `"{color.brand.500}"`) that the build resolves to the
 * primitive's value. A semantic token's `$type` must match the type of the
 * primitive it references.
 */
import { defineTokens, ref } from "./schema.js";

export const semantic = defineTokens({
  color: {
    background: {
      primary: {
        $type: "color",
        $value: ref("color.neutral.0"),
        $description: "Default page/surface background.",
        $scopes: {
          "color-mode:dark": ref("color.neutral.900"),
        },
      },
      inverse: { $type: "color", $value: ref("color.neutral.900") },
    },
    text: {
      primary: {
        $type: "color",
        $value: ref("color.neutral.900"),
        $description: "Default body text.",
        $scopes: {
          "color-mode:dark": ref("color.neutral.0"),
        },
      },
      muted: { $type: "color", $value: ref("color.neutral.600") },
      onBrand: { $type: "color", $value: ref("color.neutral.0") },
    },
    action: {
      primary: { $type: "color", $value: ref("color.brand.500") },
      primaryHover: { $type: "color", $value: ref("color.brand.700") },
    },
    feedback: {
      danger: { $type: "color", $value: ref("color.red.500") },
      success: { $type: "color", $value: ref("color.green.500") },
    },
  },

  space: {
    inline: { $type: "dimension", $value: ref("spacing.2") },
    stack: { $type: "dimension", $value: ref("spacing.4") },
    section: { $type: "dimension", $value: ref("spacing.8") },
  },

  radius: {
    control: { $type: "dimension", $value: ref("radius.md") },
    pill: { $type: "dimension", $value: ref("radius.full") },
  },

  border: {
    width: {
      default: { $type: "dimension", $value: ref("border.width.thin") },
    },
  },

  elevation: {
    raised: { $type: "shadow", $value: ref("shadow.sm") },
    overlay: { $type: "shadow", $value: ref("shadow.lg") },
  },

  typography: {
    body: {
      family: {
        $type: "fontFamily",
        $value: ref("typography.fontFamily.sans"),
      },
      size: { $type: "dimension", $value: ref("typography.fontSize.md") },
      weight: {
        $type: "fontWeight",
        $value: ref("typography.fontWeight.regular"),
      },
      lineHeight: {
        $type: "number",
        $value: ref("typography.lineHeight.normal"),
      },
    },
    heading: {
      family: {
        $type: "fontFamily",
        $value: ref("typography.fontFamily.sans"),
      },
      size: { $type: "dimension", $value: ref("typography.fontSize.xl") },
      weight: {
        $type: "fontWeight",
        $value: ref("typography.fontWeight.bold"),
      },
      lineHeight: {
        $type: "number",
        $value: ref("typography.lineHeight.tight"),
      },
    },
  },

  motion: {
    transition: {
      duration: { $type: "duration", $value: ref("motion.duration.base") },
      easing: { $type: "cubicBezier", $value: ref("motion.easing.standard") },
    },
  },
});
