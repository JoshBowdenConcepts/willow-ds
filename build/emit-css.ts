/**
 * CSS emitter (issue #7): turns a resolved {@link TokenModel} into a stylesheet
 * of `--willow-*` custom properties with `:root` base vars and scoped overrides
 * per `docs/scope-model.md`.
 */
import type {
  CubicBezierValue,
  ShadowValue,
  TokenType,
} from "../src/tokens/schema.js";
import type {
  ResolvedValue,
  ScopeCondition,
  ScopeSelector,
  TokenModel,
} from "./model.js";
import { toCssVar } from "./paths.js";
import { breakpointMinWidth } from "./scopes.js";

/** A grouped CSS rule block for one selector (optionally inside a media query). */
interface ScopedRuleBlock {
  rank: number;
  sortKey: string;
  mediaWidth?: number;
  selector: string;
  declarations: Map<string, string>;
}

/** Serialize a resolved token value to a CSS declaration value. */
export function formatCssValue(
  type: TokenType,
  resolved: ResolvedValue,
): string {
  if (resolved.kind === "alias") {
    const segments = resolved.targetPath.split(".");
    return `var(${toCssVar(segments)})`;
  }

  const value = resolved.value;

  switch (type) {
    case "color":
    case "dimension":
    case "duration":
    case "string":
      return String(value);
    case "fontWeight":
      return String(value);
    case "number":
      return String(value);
    case "fontFamily":
      return formatFontFamily(value as string | readonly string[]);
    case "cubicBezier":
      return formatCubicBezier(value as CubicBezierValue);
    case "shadow":
      return formatShadow(value as ShadowValue | readonly ShadowValue[]);
  }
}

function formatFontFamily(value: string | readonly string[]): string {
  const families = typeof value === "string" ? [value] : value;
  return families.map(quoteFontFamily).join(", ");
}

function quoteFontFamily(name: string): string {
  if (/^[a-zA-Z0-9_-]+$/.test(name)) {
    return name;
  }
  return `"${name.replace(/"/g, '\\"')}"`;
}

function formatCubicBezier(value: CubicBezierValue): string {
  return `cubic-bezier(${value.join(", ")})`;
}

function formatShadowLayer(layer: ShadowValue): string {
  const inset = layer.inset ? "inset " : "";
  return `${inset}${layer.offsetX} ${layer.offsetY} ${layer.blur} ${layer.spread} ${layer.color}`;
}

function formatShadow(value: ShadowValue | readonly ShadowValue[]): string {
  const layers = Array.isArray(value) ? value : [value];
  return layers.map(formatShadowLayer).join(", ");
}

/** Build the attribute (or `:root`) selector for DOM-axis scope conditions. */
export function attributeSelector(conditions: ScopeCondition[]): string {
  if (conditions.length === 0) {
    return ":root";
  }

  return conditions
    .map((condition) => {
      if (condition.type === "color-mode") {
        return `[data-willow-color-mode="${condition.value}"]`;
      }
      return `[data-willow-feature-${condition.name}="${condition.value}"]`;
    })
    .join("");
}

/** Wrap `inner` CSS in a min-width media query block. */
export function mediaBlock(minWidth: number, inner: string): string {
  return `@media (min-width: ${minWidth}px) {\n${indent(inner)}\n}`;
}

function indent(text: string, spaces = 2): string {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => (line.length > 0 ? `${pad}${line}` : line))
    .join("\n");
}

/**
 * Emit rank for scoped rules. Lower ranks appear first; later rules win on
 * same-element ties (color-mode before feature per scope spec v1).
 */
export function scopeEmitRank(selector: ScopeSelector): number {
  const hasBreakpoint = selector.breakpoint !== undefined;
  const hasAttributes = selector.attributes.length > 0;
  const hasFeature = selector.attributes.some(
    (condition) => condition.type === "feature",
  );

  if (!hasBreakpoint) {
    return hasFeature ? 1 : 0;
  }

  if (!hasAttributes) {
    return 2;
  }

  return hasFeature ? 4 : 3;
}

function scopedBlockKey(block: ScopedRuleBlock): string {
  const media = block.mediaWidth ?? 0;
  return `${block.rank}|${media}|${block.selector}`;
}

/** Collect and merge scoped override blocks from the model. */
export function groupScopedRules(model: TokenModel): ScopedRuleBlock[] {
  const blocks = new Map<string, ScopedRuleBlock>();

  for (const token of model.tokens) {
    for (const scope of token.scopes) {
      if (!scope.selector) continue;

      const selector = scope.selector;
      const rank = scopeEmitRank(selector);
      const cssSelector = attributeSelector(selector.attributes);
      const mediaWidth = selector.breakpoint
        ? breakpointMinWidth(selector.breakpoint.value)
        : undefined;

      const block: ScopedRuleBlock = {
        rank,
        sortKey: selector.key,
        mediaWidth,
        selector: cssSelector,
        declarations: new Map(),
      };

      const key = scopedBlockKey(block);
      const existing = blocks.get(key);
      const target = existing ?? block;
      target.declarations.set(token.cssVar, formatCssValue(token.type, scope));

      if (!existing) {
        blocks.set(key, target);
      }
    }
  }

  return [...blocks.values()].sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    if ((a.mediaWidth ?? 0) !== (b.mediaWidth ?? 0)) {
      return (a.mediaWidth ?? 0) - (b.mediaWidth ?? 0);
    }
    return a.selector.localeCompare(b.selector);
  });
}

function renderDeclarations(declarations: Map<string, string>): string {
  return [...declarations.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");
}

function renderRuleBlock(
  selector: string,
  declarations: Map<string, string>,
): string {
  return `${selector} {\n${renderDeclarations(declarations)}\n}`;
}

/** Emit the full CSS stylesheet for a resolved token model. */
export function emitCss(model: TokenModel): string {
  const rootDeclarations = new Map<string, string>();

  for (const token of model.tokens) {
    rootDeclarations.set(token.cssVar, formatCssValue(token.type, token.base));
  }

  const parts: string[] = [renderRuleBlock(":root", rootDeclarations)];

  for (const block of groupScopedRules(model)) {
    const rule = renderRuleBlock(block.selector, block.declarations);
    parts.push(
      block.mediaWidth !== undefined
        ? mediaBlock(block.mediaWidth, rule)
        : rule,
    );
  }

  return `${parts.join("\n\n")}\n`;
}
