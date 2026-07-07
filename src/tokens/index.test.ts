import { tokens, primitives, semantic } from "./index.js";
import type { Token } from "./index.js";

const V1_CATEGORIES = [
  "color",
  "spacing",
  "space",
  "sizing",
  "radius",
  "border",
  "shadow",
  "elevation",
  "zIndex",
  "motion",
  "typography",
] as const;

const isToken = (node: unknown): node is Token =>
  typeof node === "object" &&
  node !== null &&
  "$type" in node &&
  "$value" in node;

describe("tokens", () => {
  it("exposes every v1 category", () => {
    for (const category of V1_CATEGORIES) {
      expect(tokens).toHaveProperty(category);
    }
  });

  it("merges primitive and semantic groups under a shared category", () => {
    // primitive scale + semantic intent tokens coexist under `color`.
    expect(tokens.color).toHaveProperty("neutral");
    expect(tokens.color).toHaveProperty("background");
    expect(tokens.color.neutral).toBe(primitives.color.neutral);
    expect(tokens.color.background).toBe(semantic.color.background);
  });

  it("authors primitive leaves as concrete DTCG values", () => {
    const white = primitives.color.neutral[0];
    expect(white).toEqual({
      $type: "color",
      $value: "#ffffff",
      $description: "White.",
    });
  });

  it("authors semantic leaves as curly-brace aliases", () => {
    const bg = semantic.color.background.primary;
    expect(bg.$type).toBe("color");
    expect(bg.$value).toBe("{color.neutral.0}");
  });

  it("keeps every alias target resolvable within the tree", () => {
    const resolve = (path: string): unknown =>
      path.split(".").reduce<unknown>((node, segment) => {
        if (node && typeof node === "object" && segment in node) {
          return (node as Record<string, unknown>)[segment];
        }
        return undefined;
      }, tokens);

    const aliasTargets: string[] = [];
    const collect = (node: unknown): void => {
      if (isToken(node)) {
        if (typeof node.$value === "string" && node.$value.startsWith("{")) {
          aliasTargets.push(node.$value.slice(1, -1));
        }
        return;
      }
      if (node && typeof node === "object") {
        for (const child of Object.values(node)) collect(child);
      }
    };
    collect(tokens);

    expect(aliasTargets.length).toBeGreaterThan(0);
    for (const target of aliasTargets) {
      expect(isToken(resolve(target))).toBe(true);
    }
  });
});
