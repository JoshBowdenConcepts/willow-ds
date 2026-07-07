/**
 * Token source entry point. The build pipeline reads the exported `tokens`
 * tree, resolves aliases, and generates the CSS + JS artifacts.
 *
 * Primitives and semantic tokens share a single tree so that alias paths
 * (e.g. `{color.neutral.0}`) resolve within it. Within each category the two
 * layers occupy distinct groups, so they merge without key collisions.
 */
import { defineTokens } from "./schema.js";
import { primitives } from "./primitives.js";
import { semantic } from "./semantic.js";

export const tokens = defineTokens({
  color: { ...primitives.color, ...semantic.color },
  spacing: primitives.spacing,
  space: semantic.space,
  sizing: primitives.sizing,
  radius: { ...primitives.radius, ...semantic.radius },
  border: {
    width: { ...primitives.border.width, ...semantic.border.width },
  },
  shadow: primitives.shadow,
  elevation: semantic.elevation,
  zIndex: primitives.zIndex,
  motion: { ...primitives.motion, ...semantic.motion },
  typography: { ...primitives.typography, ...semantic.typography },
});

export { primitives, semantic };
export * from "./schema.js";
