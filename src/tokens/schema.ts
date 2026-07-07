/**
 * Willow token authoring schema.
 *
 * Tokens are authored as TypeScript modules under `src/tokens/`. Each leaf
 * token uses a DTCG-inspired shape (`$type`, `$value`, optional `$description`)
 * and groups are plain nested objects. The build pipeline (see issue #6) reads
 * this tree, resolves aliases, and emits CSS custom properties plus a typed JS
 * object. This module defines the contract only; it performs no resolution.
 *
 * See `docs/token-schema.md` for the full written specification.
 */

/** The value kinds a token may hold. */
export type TokenType =
  | "color"
  | "dimension"
  | "number"
  | "fontFamily"
  | "fontWeight"
  | "duration"
  | "cubicBezier"
  | "shadow"
  | "string";

/** A single layer of a `shadow` composite value. */
export interface ShadowValue {
  color: string;
  offsetX: string;
  offsetY: string;
  blur: string;
  spread: string;
  /** Inset shadows set this to `true`; omit for outer shadows. */
  inset?: boolean;
}

/** A cubic-bezier easing curve expressed as `[x1, y1, x2, y2]`. */
export type CubicBezierValue = readonly [number, number, number, number];

/** Maps each {@link TokenType} to the concrete value it may hold. */
export interface TokenValueMap {
  color: string;
  dimension: string;
  number: number;
  fontFamily: string | readonly string[];
  fontWeight: number | string;
  duration: string;
  cubicBezier: CubicBezierValue;
  shadow: ShadowValue | readonly ShadowValue[];
  string: string;
}

/**
 * A reference to another token, serialized in DTCG curly-brace form, e.g.
 * `"{color.brand.500}"`. The path between the braces is the dot-notation path
 * to the target token. Create one with {@link ref}.
 */
export type Alias = `{${string}}`;

/** A single leaf token of a given {@link TokenType}. */
export interface Token<T extends TokenType = TokenType> {
  $type: T;
  /** A concrete value for `$type`, or an {@link Alias} to another token. */
  $value: TokenValueMap[T] | Alias;
  $description?: string;
}

/** A namespace of nested tokens and/or subgroups. */
export interface TokenGroup {
  [segment: string]: TokenNode;
}

/** Any node in the token tree: a leaf token or a group. */
export type TokenNode = Token | TokenGroup;

/** The root of a token tree. */
export type TokenTree = TokenGroup;

/**
 * Build an {@link Alias} from a dot-notation token path.
 *
 * @example
 * ref("color.brand.500") // => "{color.brand.500}"
 */
export function ref(path: string): Alias {
  return `{${path}}`;
}

/**
 * Identity helper that pins a token tree to the {@link TokenTree} type while
 * preserving its literal shape for autocomplete and dot-notation access.
 */
export function defineTokens<const T extends TokenTree>(tree: T): T {
  return tree;
}
