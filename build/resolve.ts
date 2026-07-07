/**
 * Alias resolution for the build pipeline.
 *
 * A token value is either concrete or an {@link Alias} in DTCG curly-brace form
 * (`"{color.neutral.0}"`). This module resolves an alias to the concrete value
 * at the end of its chain, following nested aliases, detecting cycles, and
 * enforcing that every hop's `$type` matches the referencing token. It reports
 * problems by throwing an `Error` with an actionable message; the aggregating
 * validator (see `./validate.ts`) turns those into build errors.
 */
import type {
  Alias,
  Token,
  TokenType,
  TokenValueMap,
} from "../src/tokens/schema.js";
import type { FlatToken } from "./paths.js";
import { toJsPath } from "./paths.js";
import type { ResolvedTokenValue } from "./model.js";

/** The outcome of resolving a single authored value. */
export interface ValueResolution {
  kind: "concrete" | "alias";
  /** Immediate alias target (dot-notation path); set only for aliases. */
  targetPath?: string;
  /** The concrete value at the end of the alias chain. */
  value: ResolvedTokenValue;
}

/** Whether a raw value is an {@link Alias} (a `"{path}"` reference string). */
export function isAlias(value: unknown): value is Alias {
  return (
    typeof value === "string" && value.startsWith("{") && value.endsWith("}")
  );
}

/** The dot-notation path an alias points at (its contents without the braces). */
export function aliasTargetPath(alias: Alias): string {
  return alias.slice(1, -1);
}

/** Build a lookup of every leaf token keyed by its dot-notation path. */
export function indexByPath(flat: FlatToken[]): Map<string, Token> {
  const index = new Map<string, Token>();
  for (const { path, token } of flat) {
    index.set(toJsPath(path), token);
  }
  return index;
}

/**
 * Resolve a raw authored value to its concrete form.
 *
 * @param rawValue The authored `$value` (or `$scopes` entry) to resolve.
 * @param expectedType The `$type` the value must match (the owning token's type).
 * @param index Lookup of every token by dot-notation path.
 * @param context Human-readable location for error messages (e.g. the token path).
 */
export function resolveValue(
  rawValue: TokenValueMap[TokenType] | Alias,
  expectedType: TokenType,
  index: Map<string, Token>,
  context: string,
): ValueResolution {
  if (!isAlias(rawValue)) {
    return { kind: "concrete", value: rawValue as ResolvedTokenValue };
  }

  const targetPath = aliasTargetPath(rawValue);
  const visited = new Set<string>();
  let currentPath = targetPath;
  let currentAlias: Alias = rawValue;

  for (;;) {
    if (visited.has(currentPath)) {
      const cycle = [...visited, currentPath].join(" -> ");
      throw new Error(
        `${context}: alias cycle detected (${cycle}). Aliases must terminate at a concrete value.`,
      );
    }
    visited.add(currentPath);

    const target = index.get(currentPath);
    if (!target) {
      throw new Error(
        `${context}: alias "${currentAlias}" does not resolve to a known token (missing "${currentPath}").`,
      );
    }
    if (target.$type !== expectedType) {
      throw new Error(
        `${context}: alias "${currentAlias}" points at "${currentPath}" of type "${target.$type}", but "${expectedType}" was expected.`,
      );
    }

    if (isAlias(target.$value)) {
      currentAlias = target.$value;
      currentPath = aliasTargetPath(target.$value);
      continue;
    }

    return {
      kind: "alias",
      targetPath,
      value: target.$value as ResolvedTokenValue,
    };
  }
}
