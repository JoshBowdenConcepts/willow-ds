/**
 * The in-memory token model produced by the build pipeline (issue #6).
 *
 * This is the stable internal interface that the CSS (#7) and JS (#8) emitters
 * plug into. The pipeline loads the authored token tree, validates it, resolves
 * every alias and scope override, and assembles a flat list of
 * {@link ModelToken}s. Emitters consume this model instead of the raw tree, so
 * alias resolution, scope precedence, and naming are computed exactly once.
 */
import type { TokenType, TokenValueMap } from "../src/tokens/schema.js";

/** The concrete value a token of type `T` resolves to. */
export type ResolvedTokenValue<T extends TokenType = TokenType> =
  TokenValueMap[T];

/** A scope type on one of the two scope axes (see `docs/scope-model.md`). */
export type ScopeType = "color-mode" | "breakpoint" | "feature";

/**
 * A single, fully-parsed scope condition, e.g. `color-mode:dark`,
 * `breakpoint:lg`, or `feature-promo:on`.
 */
export interface ScopeCondition {
  type: ScopeType;
  /** The feature name for `feature` conditions (e.g. `"promo"`); otherwise undefined. */
  name?: string;
  /** The condition value, e.g. `"dark"`, `"lg"`, `"on"`, `"compact"`. */
  value: string;
}

/**
 * A parsed scope selector key. A selector is an unordered set of conditions
 * that must all hold (AND). The conditions are split by axis so emitters can
 * map attribute conditions to selectors and the optional breakpoint to a media
 * query.
 */
export interface ScopeSelector {
  /** The original selector key, e.g. `"color-mode:dark & breakpoint:lg"`. */
  key: string;
  /** Every condition in the selector, in the order authored. */
  conditions: ScopeCondition[];
  /** DOM-axis conditions (color mode + features) that compile to selectors. */
  attributes: ScopeCondition[];
  /** The single viewport-axis condition, if the selector includes one. */
  breakpoint?: ScopeCondition;
}

/**
 * A resolved value for a token: either the base value (`selector: null`) or a
 * scoped override. A value is `concrete` when authored directly, or `alias`
 * when it points at another token — in which case `targetPath` is preserved so
 * the CSS emitter can emit `var(--willow-…)` while `value` still holds the
 * ultimately-resolved concrete value for JS/other consumers.
 */
export type ResolvedValue<T extends TokenType = TokenType> = {
  /** `null` for the base value; a parsed selector for a scoped override. */
  selector: ScopeSelector | null;
  type: T;
  /** The concrete value, with any alias chain fully resolved. */
  value: ResolvedTokenValue<T>;
} & (
  | { kind: "concrete" }
  | {
      kind: "alias";
      /** Dot-notation path of the token this value aliases. */
      targetPath: string;
    }
);

/** A single resolved token in the model. */
export interface ModelToken {
  /** Path segments from the tree root to the leaf, e.g. `["color","brand","500"]`. */
  path: string[];
  /** CSS custom property name, e.g. `--willow-color-brand-500`. */
  cssVar: string;
  /** Dot-notation JS access path, e.g. `color.brand.500`. */
  jsPath: string;
  type: TokenType;
  description?: string;
  /** The unscoped base value (always present). */
  base: ResolvedValue;
  /** Scoped overrides, one per `$scopes` entry. */
  scopes: ResolvedValue[];
}

/** The complete resolved token model consumed by emitters. */
export interface TokenModel {
  tokens: ModelToken[];
}
