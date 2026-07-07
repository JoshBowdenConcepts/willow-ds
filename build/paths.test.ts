import { defineTokens } from "../src/tokens/schema.js";
import {
  flatten,
  isToken,
  isValidSegment,
  toCssVar,
  toJsPath,
} from "./paths.js";

describe("isValidSegment", () => {
  it("accepts kebab-case, camelCase, and numeric scale steps", () => {
    expect(isValidSegment("neutral")).toBe(true);
    expect(isValidSegment("500")).toBe(true);
    expect(isValidSegment("font-family")).toBe(true);
    expect(isValidSegment("fontFamily")).toBe(true);
    expect(isValidSegment("primaryHover")).toBe(true);
  });

  it("rejects invalid segment characters", () => {
    expect(isValidSegment("")).toBe(false);
    expect(isValidSegment("Bad")).toBe(false);
    expect(isValidSegment("foo_bar")).toBe(false);
  });
});

describe("flatten", () => {
  it("collects every leaf with its path", () => {
    const tree = defineTokens({
      color: {
        brand: {
          500: { $type: "color", $value: "#000000" },
        },
      },
    });
    expect(flatten(tree)).toEqual([
      {
        path: ["color", "brand", "500"],
        token: { $type: "color", $value: "#000000" },
      },
    ]);
  });
});

describe("isToken", () => {
  it("distinguishes leaves from groups", () => {
    expect(isToken({ $type: "color", $value: "#000" })).toBe(true);
    expect(isToken({ nested: { $type: "color", $value: "#000" } })).toBe(false);
  });
});

describe("naming helpers", () => {
  it("derives CSS and JS paths from token paths", () => {
    const path = ["color", "background", "primary"];
    expect(toCssVar(path)).toBe("--willow-color-background-primary");
    expect(toJsPath(path)).toBe("color.background.primary");
  });
});
