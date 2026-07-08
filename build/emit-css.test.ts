import { ref, type TokenTree } from "../src/tokens/schema.js";
import {
  attributeSelector,
  emitCss,
  formatCssValue,
  groupScopedRules,
  mediaBlock,
  scopeEmitRank,
} from "./emit-css.js";
import { buildModel, loadTokens } from "./pipeline.js";
import { parseScopeSelector } from "./scopes.js";
import type { TokenModel } from "./model.js";

const precedenceFixture: TokenTree = {
  color: {
    neutral: {
      0: { $type: "color", $value: "#ffffff" },
      900: { $type: "color", $value: "#17171b" },
    },
    brand: {
      500: { $type: "color", $value: "#3b5bdb" },
    },
    background: {
      primary: {
        $type: "color",
        $value: ref("color.neutral.0"),
        $scopes: {
          "color-mode:dark": ref("color.neutral.900"),
          "feature-promo:on": ref("color.brand.500"),
        },
      },
    },
  },
};

const scopeTypesFixture: TokenTree = {
  color: {
    surface: {
      $type: "color",
      $value: "#ffffff",
      $scopes: {
        "color-mode:dark": "#111111",
        "feature-promo:on": "#222222",
        "breakpoint:sm": "#333333",
        "color-mode:dark & breakpoint:lg": "#444444",
      },
    },
  },
};

interface DomNode {
  tag: string;
  attrs: Record<string, string>;
  children: DomNode[];
}

interface ParsedRule {
  selector: string;
  mediaMinWidth?: number;
  declarations: Map<string, string>;
}

function parseCssRules(css: string): ParsedRule[] {
  const rules: ParsedRule[] = [];
  let pos = 0;

  while (pos < css.length) {
    const rest = css.slice(pos).trimStart();
    pos += css.slice(pos).length - rest.length;

    if (rest.startsWith("@media")) {
      const header = rest.match(
        /^@media\s*\(\s*min-width:\s*(\d+)px\s*\)\s*\{/,
      );
      if (!header) break;

      const mediaMinWidth = Number(header[1]);
      let depth = 1;
      let cursor = header[0].length;

      while (cursor < rest.length && depth > 0) {
        const char = rest[cursor];
        if (char === "{") depth += 1;
        if (char === "}") depth -= 1;
        cursor += 1;
      }

      const inner = rest.slice(header[0].length, cursor - 1);
      rules.push(...parsePlainRules(inner, mediaMinWidth));
      pos += cursor;
      continue;
    }

    const ruleMatch = rest.match(/^([^{]+)\{([^}]*)\}/);
    if (!ruleMatch) break;

    rules.push(...parsePlainRules(`${ruleMatch[1].trim()}{${ruleMatch[2]}}`));
    pos += ruleMatch[0].length;
  }

  return rules;
}

function parsePlainRules(css: string, mediaMinWidth?: number): ParsedRule[] {
  const rules: ParsedRule[] = [];
  const blockPattern = /([^{]+)\{([^}]*)\}/g;
  let match: RegExpExecArray | null;

  while ((match = blockPattern.exec(css)) !== null) {
    const selector = match[1].trim();
    if (!selector || selector.startsWith("@")) continue;

    const declarations = new Map<string, string>();
    for (const line of match[2].split("\n")) {
      const decl = line.trim().match(/^(--[\w-]+):\s*(.+);$/);
      if (decl) {
        declarations.set(decl[1], decl[2]);
      }
    }

    rules.push({ selector, mediaMinWidth, declarations });
  }

  return rules;
}

function nodeMatchesSelector(node: DomNode, selector: string): boolean {
  if (selector === ":root") {
    return node.tag === "html";
  }

  const attrPattern = /\[data-willow-([^\]=]+)="([^"]+)"\]/g;
  let match: RegExpExecArray | null;

  while ((match = attrPattern.exec(selector)) !== null) {
    const attrName = `data-willow-${match[1]}`;
    if (node.attrs[attrName] !== match[2]) {
      return false;
    }
  }

  return true;
}

function flattenDom(node: DomNode, ancestors: DomNode[] = []): DomNode[][] {
  const path = [...ancestors, node];
  return [path, ...node.children.flatMap((child) => flattenDom(child, path))];
}

/** Simulates custom-property inheritance for test fixtures. */
export function resolveVar(
  dom: DomNode,
  css: string,
  varName: string,
  viewportWidth: number,
  targetTag = "button",
): string | undefined {
  const rules = parseCssRules(css);
  const paths = flattenDom(dom);
  const targetPath = paths.find((path) => path.at(-1)?.tag === targetTag);
  if (!targetPath) return undefined;

  for (let index = targetPath.length - 1; index >= 0; index -= 1) {
    const node = targetPath[index];
    let matchedValue: string | undefined;

    for (const rule of rules) {
      if (
        rule.mediaMinWidth !== undefined &&
        viewportWidth < rule.mediaMinWidth
      ) {
        continue;
      }
      if (!nodeMatchesSelector(node, rule.selector)) continue;
      const value = rule.declarations.get(varName);
      if (value !== undefined) {
        matchedValue = value;
      }
    }

    if (matchedValue !== undefined) {
      return matchedValue;
    }
  }

  return undefined;
}

describe("formatCssValue", () => {
  it("emits var() for alias values", () => {
    expect(
      formatCssValue("color", {
        kind: "alias",
        selector: null,
        type: "color",
        targetPath: "color.neutral.0",
        value: "#ffffff",
      }),
    ).toBe("var(--willow-color-neutral-0)");
  });

  it("formats composite token types", () => {
    expect(
      formatCssValue("fontFamily", {
        kind: "concrete",
        selector: null,
        type: "fontFamily",
        value: ["Inter", "system-ui", "sans-serif"],
      }),
    ).toBe("Inter, system-ui, sans-serif");

    expect(
      formatCssValue("fontFamily", {
        kind: "concrete",
        selector: null,
        type: "fontFamily",
        value: 'Say "Hello"',
      }),
    ).toBe('"Say \\"Hello\\""');

    expect(
      formatCssValue("string", {
        kind: "concrete",
        selector: null,
        type: "string",
        value: "underline",
      }),
    ).toBe("underline");

    expect(
      formatCssValue("cubicBezier", {
        kind: "concrete",
        selector: null,
        type: "cubicBezier",
        value: [0.4, 0, 0.2, 1],
      }),
    ).toBe("cubic-bezier(0.4, 0, 0.2, 1)");

    expect(
      formatCssValue("shadow", {
        kind: "concrete",
        selector: null,
        type: "shadow",
        value: {
          color: "rgba(0, 0, 0, 0.1)",
          offsetX: "0",
          offsetY: "1px",
          blur: "2px",
          spread: "0",
          inset: true,
        },
      }),
    ).toBe("inset 0 1px 2px 0 rgba(0, 0, 0, 0.1)");

    expect(
      formatCssValue("shadow", {
        kind: "concrete",
        selector: null,
        type: "shadow",
        value: [
          {
            color: "rgba(0, 0, 0, 0.1)",
            offsetX: "0",
            offsetY: "1px",
            blur: "2px",
            spread: "0",
          },
          {
            color: "rgba(0, 0, 0, 0.05)",
            offsetX: "0",
            offsetY: "0",
            blur: "1px",
            spread: "0",
          },
        ],
      }),
    ).toBe("0 1px 2px 0 rgba(0, 0, 0, 0.1), 0 0 1px 0 rgba(0, 0, 0, 0.05)");
  });
});

describe("attributeSelector", () => {
  it("returns :root when there are no attribute conditions", () => {
    expect(attributeSelector([])).toBe(":root");
  });

  it("builds compound attribute selectors", () => {
    const selector = parseScopeSelector("color-mode:dark & feature-promo:on");
    expect(attributeSelector(selector.attributes)).toBe(
      '[data-willow-color-mode="dark"][data-willow-feature-promo="on"]',
    );
  });
});

describe("scopeEmitRank", () => {
  it("orders attribute-only color-mode before feature and breakpoint tiers", () => {
    expect(scopeEmitRank(parseScopeSelector("color-mode:dark"))).toBeLessThan(
      scopeEmitRank(parseScopeSelector("feature-promo:on")),
    );
    expect(scopeEmitRank(parseScopeSelector("feature-promo:on"))).toBeLessThan(
      scopeEmitRank(parseScopeSelector("breakpoint:sm")),
    );
    expect(scopeEmitRank(parseScopeSelector("breakpoint:sm"))).toBeLessThan(
      scopeEmitRank(parseScopeSelector("color-mode:dark & breakpoint:lg")),
    );
    expect(
      scopeEmitRank(
        parseScopeSelector(
          "color-mode:dark & feature-promo:on & breakpoint:lg",
        ),
      ),
    ).toBe(4);
  });
});

describe("mediaBlock", () => {
  it("wraps inner CSS in a min-width media query", () => {
    expect(mediaBlock(640, ":root {\n  --x: 1;\n}")).toBe(
      "@media (min-width: 640px) {\n  :root {\n    --x: 1;\n  }\n}",
    );
    expect(mediaBlock(640, "a {\n\n  --x: 1;\n}")).toBe(
      "@media (min-width: 640px) {\n  a {\n\n    --x: 1;\n  }\n}",
    );
  });
});

describe("emitCss", () => {
  it("emits a :root base layer with willow-prefixed vars and alias var()", () => {
    const css = emitCss(buildModel(precedenceFixture));

    expect(css).toMatch(/^:root \{/);
    expect(css).toContain("--willow-color-neutral-0: #ffffff;");
    expect(css).toContain(
      "--willow-color-background-primary: var(--willow-color-neutral-0);",
    );
  });

  it("emits color-mode attribute overrides", () => {
    const css = emitCss(buildModel(scopeTypesFixture));
    expect(css).toContain('[data-willow-color-mode="dark"] {');
    expect(css).toContain("  --willow-color-surface: #111111;");
  });

  it("emits feature attribute overrides", () => {
    const css = emitCss(buildModel(scopeTypesFixture));
    expect(css).toContain('[data-willow-feature-promo="on"] {');
    expect(css).toContain("  --willow-color-surface: #222222;");
  });

  it("emits breakpoint-only overrides on :root inside media queries", () => {
    const css = emitCss(buildModel(scopeTypesFixture));
    expect(css).toContain("@media (min-width: 640px) {");
    expect(css).toMatch(
      /@media \(min-width: 640px\) \{\n {2}:root \{\n {4}--willow-color-surface: #333333;\n {2}\}\n\}/,
    );
  });

  it("wraps compound breakpoint scopes around attribute selectors", () => {
    const css = emitCss(buildModel(scopeTypesFixture));
    expect(css).toContain("@media (min-width: 1024px) {");
    expect(css).toMatch(
      /@media \(min-width: 1024px\) \{\n {2}\[data-willow-color-mode="dark"\] \{/,
    );
    expect(css).not.toMatch(
      /@media \(min-width: 1024px\) \{\n {2}:root \{\n {4}--willow-color-surface: #444444;/,
    );
  });

  it("emits color-mode rules before feature rules for same-element tie-breaks", () => {
    const css = emitCss(buildModel(precedenceFixture));
    const colorModeIndex = css.indexOf('[data-willow-color-mode="dark"]');
    const featureIndex = css.indexOf('[data-willow-feature-promo="on"]');
    expect(colorModeIndex).toBeGreaterThan(-1);
    expect(featureIndex).toBeGreaterThan(colorModeIndex);
  });

  it("prefixes every custom property with --willow-", () => {
    const css = emitCss(buildModel(loadTokens()));
    const vars = css.match(/--[\w-]+/g) ?? [];
    expect(vars.length).toBeGreaterThan(0);
    for (const name of vars) {
      expect(name.startsWith("--willow-")).toBe(true);
    }
  });

  it("produces non-empty CSS from the real token tree", () => {
    const css = emitCss(buildModel(loadTokens()));
    expect(css.length).toBeGreaterThan(100);
    expect(css).toContain("--willow-color-background-primary:");
    expect(css).toContain('[data-willow-color-mode="dark"]');
  });
});

describe("groupScopedRules", () => {
  it("merges declarations that share the same selector block", () => {
    const tree: TokenTree = {
      color: {
        a: {
          $type: "color",
          $value: "#111111",
          $scopes: { "color-mode:dark": "#aaaaaa" },
        },
        b: {
          $type: "color",
          $value: "#222222",
          $scopes: { "color-mode:dark": "#bbbbbb" },
        },
      },
    };

    const blocks = groupScopedRules(buildModel(tree));
    const darkBlock = blocks.find(
      (block) => block.selector === '[data-willow-color-mode="dark"]',
    );

    expect(darkBlock?.declarations.get("--willow-color-a")).toBe("#aaaaaa");
    expect(darkBlock?.declarations.get("--willow-color-b")).toBe("#bbbbbb");
  });

  it("sorts blocks by rank, media width, selector, and scope key", () => {
    const tree: TokenTree = {
      color: {
        z: {
          $type: "color",
          $value: "#000000",
          $scopes: {
            "feature-beta:on": "#bbbbbb",
            "feature-alpha:on": "#aaaaaa",
            "breakpoint:md": "#cccccc",
            "breakpoint:sm": "#dddddd",
            "color-mode:dark & breakpoint:lg": "#eeeeee",
            "color-mode:dark & breakpoint:md": "#ffffff",
          },
        },
      },
    };

    const blocks = groupScopedRules(buildModel(tree));
    const selectors = blocks.map((block) => block.sortKey);

    expect(selectors).toEqual([
      "feature-alpha:on",
      "feature-beta:on",
      "breakpoint:sm",
      "breakpoint:md",
      "color-mode:dark & breakpoint:md",
      "color-mode:dark & breakpoint:lg",
    ]);
  });

  it("skips scoped entries without a selector", () => {
    const model: TokenModel = {
      tokens: [
        {
          path: ["color", "surface"],
          cssVar: "--willow-color-surface",
          jsPath: "color.surface",
          type: "color",
          base: {
            kind: "concrete",
            selector: null,
            type: "color",
            value: "#ffffff",
          },
          scopes: [
            {
              kind: "concrete",
              selector: null,
              type: "color",
              value: "#111111",
            },
          ],
        },
      ],
    };

    expect(groupScopedRules(model)).toHaveLength(0);
  });
});

describe("nested scope precedence (simulated cascade)", () => {
  const css = emitCss(buildModel(precedenceFixture));
  const varName = "--willow-color-background-primary";

  it("resolves to the deepest dark scope when dark is nested inside feature", () => {
    const dom: DomNode = {
      tag: "html",
      attrs: { "data-willow-color-mode": "light" },
      children: [
        {
          tag: "section",
          attrs: { "data-willow-feature-promo": "on" },
          children: [
            {
              tag: "div",
              attrs: { "data-willow-color-mode": "dark" },
              children: [{ tag: "button", attrs: {}, children: [] }],
            },
          ],
        },
      ],
    };

    expect(resolveVar(dom, css, varName, 800)).toBe(
      "var(--willow-color-neutral-900)",
    );
  });

  it("resolves to the deepest feature scope when feature is nested inside dark", () => {
    const dom: DomNode = {
      tag: "html",
      attrs: {},
      children: [
        {
          tag: "div",
          attrs: { "data-willow-color-mode": "dark" },
          children: [
            {
              tag: "section",
              attrs: { "data-willow-feature-promo": "on" },
              children: [{ tag: "button", attrs: {}, children: [] }],
            },
          ],
        },
      ],
    };

    expect(resolveVar(dom, css, varName, 800)).toBe(
      "var(--willow-color-brand-500)",
    );
  });

  it("applies feature over color-mode on the same element via emit order", () => {
    const dom: DomNode = {
      tag: "html",
      attrs: {},
      children: [
        {
          tag: "div",
          attrs: {
            "data-willow-color-mode": "dark",
            "data-willow-feature-promo": "on",
          },
          children: [{ tag: "button", attrs: {}, children: [] }],
        },
      ],
    };

    expect(resolveVar(dom, css, varName, 800)).toBe(
      "var(--willow-color-brand-500)",
    );
  });

  it("applies compound breakpoint overrides at the matching element depth", () => {
    const compoundCss = emitCss(buildModel(scopeTypesFixture));
    const dom: DomNode = {
      tag: "html",
      attrs: {},
      children: [
        {
          tag: "div",
          attrs: { "data-willow-color-mode": "dark" },
          children: [{ tag: "button", attrs: {}, children: [] }],
        },
      ],
    };

    expect(resolveVar(dom, compoundCss, "--willow-color-surface", 800)).toBe(
      "#111111",
    );
    expect(resolveVar(dom, compoundCss, "--willow-color-surface", 1200)).toBe(
      "#444444",
    );
  });
});
