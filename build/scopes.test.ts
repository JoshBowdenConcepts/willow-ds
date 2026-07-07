import {
  BREAKPOINTS,
  breakpointMinWidth,
  parseScopeSelector,
} from "./scopes.js";

describe("breakpointMinWidth", () => {
  it("returns the v1 min-width for known breakpoints", () => {
    expect(breakpointMinWidth("sm")).toBe(BREAKPOINTS.sm);
    expect(breakpointMinWidth("md")).toBe(BREAKPOINTS.md);
    expect(breakpointMinWidth("lg")).toBe(BREAKPOINTS.lg);
  });

  it("returns undefined for unknown breakpoints", () => {
    expect(breakpointMinWidth("xl")).toBeUndefined();
  });
});

describe("parseScopeSelector", () => {
  it("parses a single color-mode condition", () => {
    const selector = parseScopeSelector("color-mode:dark");
    expect(selector.key).toBe("color-mode:dark");
    expect(selector.conditions).toEqual([
      { type: "color-mode", value: "dark" },
    ]);
    expect(selector.attributes).toEqual(selector.conditions);
    expect(selector.breakpoint).toBeUndefined();
  });

  it("parses a named feature condition", () => {
    const selector = parseScopeSelector("feature-promo:on");
    expect(selector.conditions).toEqual([
      { type: "feature", name: "promo", value: "on" },
    ]);
    expect(selector.attributes).toEqual(selector.conditions);
  });

  it("parses a compound selector with breakpoint and color mode", () => {
    const selector = parseScopeSelector("color-mode:dark & breakpoint:lg");
    expect(selector.conditions).toHaveLength(2);
    expect(selector.attributes).toEqual([
      { type: "color-mode", value: "dark" },
    ]);
    expect(selector.breakpoint).toEqual({ type: "breakpoint", value: "lg" });
  });

  it("accepts compound keys in either order", () => {
    const a = parseScopeSelector("color-mode:dark & breakpoint:lg");
    const b = parseScopeSelector("breakpoint:lg & color-mode:dark");
    expect(a.conditions).toHaveLength(2);
    expect(b.conditions).toHaveLength(2);
    expect(a.breakpoint?.value).toBe("lg");
    expect(b.breakpoint?.value).toBe("lg");
  });

  it("rejects empty keys", () => {
    expect(() => parseScopeSelector("")).toThrow(/must not be empty/);
    expect(() => parseScopeSelector("   ")).toThrow(/must not be empty/);
    expect(() => parseScopeSelector("&")).toThrow(/must not be empty/);
  });

  it("rejects conditions without a colon", () => {
    expect(() => parseScopeSelector("color-mode-dark")).toThrow(
      /must be of the form "scope-type:value"/,
    );
  });

  it("rejects unknown scope types", () => {
    expect(() => parseScopeSelector("theme:dark")).toThrow(
      /unknown scope type/,
    );
  });

  it("rejects unknown breakpoint values", () => {
    expect(() => parseScopeSelector("breakpoint:xl")).toThrow(
      /unknown breakpoint/,
    );
  });

  it("rejects invalid feature names", () => {
    expect(() => parseScopeSelector("feature-Promo:on")).toThrow(
      /feature name "Promo"/,
    );
  });

  it("rejects invalid scope values", () => {
    expect(() => parseScopeSelector("color-mode:Dark")).toThrow(/value "Dark"/);
  });

  it("rejects multiple breakpoint conditions", () => {
    expect(() => parseScopeSelector("breakpoint:sm & breakpoint:lg")).toThrow(
      /at most one breakpoint/,
    );
  });
});
