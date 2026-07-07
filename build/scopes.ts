/**
 * Parsing and validation for scope selectors (see `docs/scope-model.md`).
 *
 * A scope selector is the key of a token's `$scopes` map. It is an unordered
 * set of `scope-type:value` conditions combined with `&`, e.g.
 * `"color-mode:dark"` or `"color-mode:dark & breakpoint:lg"`. This module turns
 * a raw key into a structured {@link ScopeSelector}, throwing an actionable
 * error when the key is malformed so the build can surface it.
 */
import type { ScopeCondition, ScopeSelector } from "./model.js";
import { SEGMENT_PATTERN, isValidSegment } from "./paths.js";

/** v1 breakpoint min-width thresholds (px), keyed by breakpoint value. */
export const BREAKPOINTS: Readonly<Record<string, number>> = {
  sm: 640,
  md: 768,
  lg: 1024,
};

const CONDITION_SEPARATOR = "&";
const FEATURE_PREFIX = "feature-";

/** The min-width (px) for a breakpoint value, or `undefined` if unknown. */
export function breakpointMinWidth(value: string): number | undefined {
  return BREAKPOINTS[value];
}

/** Parse a single `scope-type:value` condition into a {@link ScopeCondition}. */
function parseCondition(raw: string, key: string): ScopeCondition {
  const separator = raw.indexOf(":");
  if (separator === -1) {
    throw new Error(
      `scope selector "${key}": condition "${raw}" must be of the form "scope-type:value".`,
    );
  }

  const head = raw.slice(0, separator).trim();
  const value = raw.slice(separator + 1).trim();

  if (!isValidSegment(value)) {
    throw new Error(
      `scope selector "${key}": value "${value}" must match ${SEGMENT_PATTERN} (lowercase alphanumeric, hyphen-separated).`,
    );
  }

  if (head === "color-mode") {
    return { type: "color-mode", value };
  }

  if (head === "breakpoint") {
    if (breakpointMinWidth(value) === undefined) {
      throw new Error(
        `scope selector "${key}": unknown breakpoint "${value}" (expected one of ${Object.keys(
          BREAKPOINTS,
        ).join(", ")}).`,
      );
    }
    return { type: "breakpoint", value };
  }

  if (head.startsWith(FEATURE_PREFIX)) {
    const name = head.slice(FEATURE_PREFIX.length);
    if (!isValidSegment(name)) {
      throw new Error(
        `scope selector "${key}": feature name "${name}" must match ${SEGMENT_PATTERN}.`,
      );
    }
    return { type: "feature", name, value };
  }

  throw new Error(
    `scope selector "${key}": unknown scope type "${head}" (expected "color-mode", "breakpoint", or "feature-<name>").`,
  );
}

/**
 * Parse a scope selector key into a structured {@link ScopeSelector}, splitting
 * conditions by axis and enforcing the cross-axis constraints from the scope
 * model. Throws an `Error` with an actionable message on any malformed key.
 */
export function parseScopeSelector(key: string): ScopeSelector {
  const trimmed = key.trim();
  if (trimmed === "") {
    throw new Error(`scope selector "${key}": must not be empty.`);
  }

  const conditions = trimmed
    .split(CONDITION_SEPARATOR)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => parseCondition(part, key));

  if (conditions.length === 0) {
    throw new Error(`scope selector "${key}": must not be empty.`);
  }

  const breakpoints = conditions.filter(
    (condition) => condition.type === "breakpoint",
  );
  if (breakpoints.length > 1) {
    throw new Error(
      `scope selector "${key}": at most one breakpoint condition is allowed (breakpoints are mutually exclusive).`,
    );
  }

  const attributes = conditions.filter(
    (condition) => condition.type !== "breakpoint",
  );

  return {
    key,
    conditions,
    attributes,
    breakpoint: breakpoints[0],
  };
}
