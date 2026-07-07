import { ref, type TokenTree } from "../src/tokens/schema.js";
import { flatten } from "./paths.js";
import {
  aliasTargetPath,
  indexByPath,
  isAlias,
  resolveValue,
} from "./resolve.js";

const tree: TokenTree = {
  color: {
    base: { $type: "color", $value: "#ffffff" },
    brand: { $type: "color", $value: ref("color.base") },
    accent: { $type: "color", $value: ref("color.brand") },
    wrong: { $type: "color", $value: ref("spacing.small") },
    missing: { $type: "color", $value: ref("color.ghost") },
    cycleA: { $type: "color", $value: ref("color.cycleB") },
    cycleB: { $type: "color", $value: ref("color.cycleA") },
  },
  spacing: {
    small: { $type: "dimension", $value: "0.5rem" },
  },
};

describe("isAlias", () => {
  it("detects curly-brace references", () => {
    expect(isAlias("{color.base}")).toBe(true);
    expect(isAlias("#ffffff")).toBe(false);
  });
});

describe("aliasTargetPath", () => {
  it("strips the braces", () => {
    expect(aliasTargetPath("{color.base}")).toBe("color.base");
  });
});

describe("resolveValue", () => {
  const flat = flatten(tree);
  const index = indexByPath(flat);

  it("returns concrete values unchanged", () => {
    expect(resolveValue("#ffffff", "color", index, "ctx")).toEqual({
      kind: "concrete",
      value: "#ffffff",
    });
  });

  it("resolves a direct alias", () => {
    expect(resolveValue(ref("color.base"), "color", index, "ctx")).toEqual({
      kind: "alias",
      targetPath: "color.base",
      value: "#ffffff",
    });
  });

  it("follows chained aliases to the concrete value", () => {
    expect(resolveValue(ref("color.accent"), "color", index, "ctx")).toEqual({
      kind: "alias",
      targetPath: "color.accent",
      value: "#ffffff",
    });
  });

  it("throws when the alias target is missing", () => {
    expect(() =>
      resolveValue(ref("color.ghost"), "color", index, 'token "color.missing"'),
    ).toThrow(/does not resolve to a known token/);
  });

  it("throws on type mismatch", () => {
    expect(() =>
      resolveValue(ref("spacing.small"), "color", index, 'token "color.wrong"'),
    ).toThrow(/type "dimension", but "color" was expected/);
  });

  it("throws on alias cycles", () => {
    expect(() =>
      resolveValue(ref("color.cycleB"), "color", index, 'token "color.cycleA"'),
    ).toThrow(/alias cycle detected/);
  });
});
