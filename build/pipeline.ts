/**
 * The build pipeline core (issue #6): load the authored token tree, validate
 * it, and resolve aliases and scope overrides into a {@link TokenModel} that
 * the CSS (#7) and JS (#8) emitters consume.
 *
 * `buildModel` is the stable entry point emitters call. It performs the fixed
 * sequence flatten -> validate -> resolve -> assemble, so resolution and naming
 * happen exactly once and invalid tokens fail fast with actionable errors.
 */
import { tokens } from "../src/tokens/index.js";
import type { Token, TokenTree, TokenType } from "../src/tokens/schema.js";
import type {
  ModelToken,
  ResolvedValue,
  ScopeSelector,
  TokenModel,
} from "./model.js";
import { flatten, toCssVar, toJsPath } from "./paths.js";
import { indexByPath, resolveValue, type ValueResolution } from "./resolve.js";
import { parseScopeSelector } from "./scopes.js";
import { validateTokens } from "./validate.js";

/** Load the authored token tree that the pipeline builds from. */
export function loadTokens(): TokenTree {
  return tokens;
}

/** Turn a raw {@link ValueResolution} into a model {@link ResolvedValue}. */
function toResolvedValue(
  resolution: ValueResolution,
  type: TokenType,
  selector: ScopeSelector | null,
): ResolvedValue {
  if (resolution.kind === "alias") {
    return {
      selector,
      type,
      kind: "alias",
      targetPath: resolution.targetPath as string,
      value: resolution.value,
    };
  }
  return { selector, type, kind: "concrete", value: resolution.value };
}

/** Resolve a single flat token's base value and scope overrides. */
function resolveToken(
  path: string[],
  token: Token,
  index: Map<string, Token>,
): ModelToken {
  const jsPath = toJsPath(path);

  const base = toResolvedValue(
    resolveValue(token.$value, token.$type, index, `token "${jsPath}"`),
    token.$type,
    null,
  );

  const scopes: ResolvedValue[] = [];
  if (token.$scopes) {
    for (const [key, scopedValue] of Object.entries(token.$scopes)) {
      if (scopedValue === undefined) continue;
      const selector = parseScopeSelector(key);
      const resolution = resolveValue(
        scopedValue,
        token.$type,
        index,
        `token "${jsPath}" scope "${key}"`,
      );
      scopes.push(toResolvedValue(resolution, token.$type, selector));
    }
  }

  return {
    path,
    cssVar: toCssVar(path),
    jsPath,
    type: token.$type,
    description: token.$description,
    base,
    scopes,
  };
}

/**
 * Build the resolved {@link TokenModel} from an authored token tree. Throws a
 * {@link BuildError} (from `./validate.ts`) if any token is invalid.
 */
export function buildModel(tree: TokenTree): TokenModel {
  const flat = flatten(tree);
  const index = indexByPath(flat);

  validateTokens(flat, index);

  const modelTokens = flat.map(({ path, token }) =>
    resolveToken(path, token, index),
  );

  return { tokens: modelTokens };
}
