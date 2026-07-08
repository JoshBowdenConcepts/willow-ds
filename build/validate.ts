/**
 * Token validation. Runs before the model is assembled and aggregates every
 * problem it finds into a single {@link BuildError} so authors see all issues
 * at once rather than fixing them one build at a time.
 *
 * It checks the things the authoring types cannot: path segment characters,
 * well-formed `color` / `dimension` / `duration` values, resolvable and
 * type-matching aliases (including cycles), and valid scope selector keys with
 * type-matching scoped values.
 */
import type { Token, TokenType } from "../src/tokens/schema.js";
import type { FlatToken } from "./paths.js";
import { isValidSegment, SEGMENT_PATTERN, toJsPath } from "./paths.js";
import { isAlias, resolveValue } from "./resolve.js";
import { parseScopeSelector } from "./scopes.js";

/** An aggregated build failure carrying every individual validation message. */
export class BuildError extends Error {
  readonly errors: string[];

  constructor(errors: string[]) {
    super(
      `Token validation failed with ${errors.length} error(s):\n` +
        errors.map((error) => `  - ${error}`).join("\n"),
    );
    this.name = "BuildError";
    this.errors = errors;
  }
}

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const FUNCTIONAL_COLOR = /^(?:rgb|rgba|hsl|hsla)\(.+\)$/;
const COLOR_KEYWORDS = new Set(["transparent", "currentcolor"]);
const DIMENSION =
  /^-?(?:\d+|\d*\.\d+)(?:px|rem|em|%|vh|vw|vmin|vmax|ch|ex|cm|mm|in|pt|pc|fr)$/;
const DURATION = /^-?(?:\d+|\d*\.\d+)(?:ms|s)$/;

/** Whether `value` is a well-formed CSS color string. */
function isValidColor(value: string): boolean {
  return (
    HEX_COLOR.test(value) ||
    FUNCTIONAL_COLOR.test(value) ||
    COLOR_KEYWORDS.has(value.toLowerCase())
  );
}

/** Whether `value` is a well-formed CSS length (`"0"` or number + unit). */
function isValidDimension(value: string): boolean {
  return value === "0" || DIMENSION.test(value);
}

/** Whether `value` is a well-formed CSS time (`"200ms"`, `"0.2s"`). */
function isValidDuration(value: string): boolean {
  return DURATION.test(value);
}

/**
 * Check a concrete (non-alias) value's format for the type kinds we can
 * meaningfully validate at build time. Returns an error message or `null`.
 */
function checkValueFormat(
  type: TokenType,
  value: unknown,
  context: string,
): string | null {
  if (type === "color") {
    if (typeof value !== "string" || !isValidColor(value)) {
      return `${context}: "${String(value)}" is not a valid color.`;
    }
  }
  if (type === "dimension") {
    if (typeof value !== "string" || !isValidDimension(value)) {
      return `${context}: "${String(value)}" is not a valid dimension (expected "0" or a number with a unit).`;
    }
  }
  if (type === "duration") {
    if (typeof value !== "string" || !isValidDuration(value)) {
      return `${context}: "${String(value)}" is not a valid duration (expected e.g. "200ms").`;
    }
  }
  return null;
}

/** Validate a single token's base value and any scope overrides. */
function validateToken(
  path: string[],
  token: Token,
  index: Map<string, Token>,
  errors: string[],
): void {
  const jsPath = toJsPath(path);

  for (const segment of path) {
    if (!isValidSegment(segment)) {
      errors.push(
        `token "${jsPath}": path segment "${segment}" must match ${SEGMENT_PATTERN}.`,
      );
    }
  }

  const check = (rawValue: Token["$value"], context: string): void => {
    if (isAlias(rawValue)) {
      try {
        resolveValue(rawValue, token.$type, index, context);
      } catch (error) {
        errors.push((error as Error).message);
      }
      return;
    }
    const formatError = checkValueFormat(token.$type, rawValue, context);
    if (formatError) errors.push(formatError);
  };

  check(token.$value, `token "${jsPath}"`);

  if (token.$scopes) {
    for (const [key, scopedValue] of Object.entries(token.$scopes)) {
      if (scopedValue === undefined) continue;
      try {
        parseScopeSelector(key);
      } catch (error) {
        errors.push(`token "${jsPath}": ${(error as Error).message}`);
        continue;
      }
      check(scopedValue, `token "${jsPath}" scope "${key}"`);
    }
  }
}

/**
 * Validate every token in `flat`, throwing a {@link BuildError} that lists all
 * problems if any are found. `index` must contain every token keyed by path.
 */
export function validateTokens(
  flat: FlatToken[],
  index: Map<string, Token>,
): void {
  const errors: string[] = [];
  for (const { path, token } of flat) {
    validateToken(path, token, index, errors);
  }
  if (errors.length > 0) {
    throw new BuildError(errors);
  }
}
