import { defineTokens, ref, type TokenTree } from "./schema.js";

describe("ref", () => {
  it("wraps a dot-notation path in curly braces", () => {
    expect(ref("color.brand.500")).toBe("{color.brand.500}");
  });

  it("wraps an empty path", () => {
    expect(ref("")).toBe("{}");
  });
});

describe("defineTokens", () => {
  it("returns the same tree it is given", () => {
    const tree: TokenTree = {
      color: { primary: { $type: "color", $value: "#000000" } },
    };
    expect(defineTokens(tree)).toBe(tree);
  });
});
