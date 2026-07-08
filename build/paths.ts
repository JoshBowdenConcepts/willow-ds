/**
 * Token path helpers: flattening the authored tree into leaves and deriving the
 * CSS-variable and JS-access names from a token path. Naming follows the
 * schema's convention — the `willow` prefix plus the path segments — so every
 * emitter derives names identically (see `docs/token-schema.md`).
 */
import type { Token, TokenNode, TokenTree } from "../src/tokens/schema.js";

/** The `willow` namespace prefix shared by every emitted name. */
export const TOKEN_PREFIX = "willow";

/**
 * Permitted characters for a single path segment: lowercase alphanumeric or
 * camelCase words, optionally hyphen-separated (numeric scale steps allowed).
 */
export const SEGMENT_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+|[A-Z][a-z0-9]*)*$/;

/** Whether `segment` uses only permitted segment characters. */
export function isValidSegment(segment: string): boolean {
  return SEGMENT_PATTERN.test(segment);
}

/** A leaf token paired with its path from the tree root. */
export interface FlatToken {
  path: string[];
  token: Token;
}

/** Whether a tree node is a leaf token (rather than a group). */
export function isToken(node: TokenNode): node is Token {
  return (
    typeof node === "object" &&
    node !== null &&
    "$type" in node &&
    "$value" in node
  );
}

/**
 * Walk a token tree depth-first and return every leaf token with its path.
 * Groups (objects without `$value`) are traversed; leaves are collected.
 */
export function flatten(tree: TokenTree): FlatToken[] {
  const out: FlatToken[] = [];

  const walk = (node: TokenNode, path: string[]): void => {
    if (isToken(node)) {
      out.push({ path, token: node });
      return;
    }
    for (const [segment, child] of Object.entries(node)) {
      walk(child, [...path, segment]);
    }
  };

  walk(tree, []);
  return out;
}

/** The CSS custom property name for a token path, e.g. `--willow-color-brand-500`. */
export function toCssVar(path: string[]): string {
  return `--${[TOKEN_PREFIX, ...path].join("-")}`;
}

/** The dot-notation JS access path for a token path, e.g. `color.brand.500`. */
export function toJsPath(path: string[]): string {
  return path.join(".");
}
