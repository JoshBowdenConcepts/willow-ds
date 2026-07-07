import { ref, type TokenTree } from "../src/tokens/schema.js";
import { flatten } from "./paths.js";
import { indexByPath } from "./resolve.js";
import { BuildError, validateTokens } from "./validate.js";

function validateTree(tree: TokenTree): void {
  const flat = flatten(tree);
  validateTokens(flat, indexByPath(flat));
}

function expectBuildError(tree: TokenTree, ...messages: RegExp[]): void {
  try {
    validateTree(tree);
    throw new Error("expected BuildError");
  } catch (error) {
    expect(error).toBeInstanceOf(BuildError);
    const buildError = error as BuildError;
    expect(buildError.errors.length).toBeGreaterThanOrEqual(messages.length);
    for (const pattern of messages) {
      expect(buildError.errors.some((msg) => pattern.test(msg))).toBe(true);
    }
  }
}

describe("validateTokens", () => {
  it("passes a valid tree", () => {
    const tree: TokenTree = {
      color: {
        base: { $type: "color", $value: "#ffffff" },
        brand: { $type: "color", $value: ref("color.base") },
      },
    };
    expect(() => validateTree(tree)).not.toThrow();
  });

  it("aggregates multiple errors", () => {
    const tree: TokenTree = {
      color: {
        badSegment: {
          Invalid: { $type: "color", $value: "not-a-color" },
        },
        missing: { $type: "color", $value: ref("color.ghost") },
      },
    };
    expectBuildError(
      tree,
      /path segment "Invalid"/,
      /not a valid color/,
      /does not resolve to a known token/,
    );
  });

  it("rejects invalid colors", () => {
    const tree: TokenTree = {
      color: { bad: { $type: "color", $value: "not-a-color" } },
    };
    expectBuildError(tree, /not a valid color/);
  });

  it("rejects invalid dimensions", () => {
    const tree: TokenTree = {
      space: { bad: { $type: "dimension", $value: "12" } },
    };
    expectBuildError(tree, /not a valid dimension/);
  });

  it("rejects invalid durations", () => {
    const tree: TokenTree = {
      motion: { bad: { $type: "duration", $value: "fast" } },
    };
    expectBuildError(tree, /not a valid duration/);
  });

  it("rejects invalid scope keys and scoped values", () => {
    const tree: TokenTree = {
      color: {
        surface: {
          $type: "color",
          $value: "#ffffff",
          $scopes: {
            "theme:dark": ref("color.neutral.900"),
            "color-mode:dark": "not-a-color",
          },
        },
      },
    };
    expectBuildError(tree, /unknown scope type/, /not a valid color/);
  });

  it("skips undefined scope entries during validation", () => {
    const tree: TokenTree = {
      color: {
        surface: {
          $type: "color",
          $value: "#ffffff",
          $scopes: {
            "color-mode:dark": undefined as unknown as string,
          },
        },
      },
    };
    expect(() => validateTree(tree)).not.toThrow();
  });

  it("reports alias resolution failures from scoped values", () => {
    const tree: TokenTree = {
      color: {
        surface: {
          $type: "color",
          $value: "#ffffff",
          $scopes: {
            "color-mode:dark": ref("color.ghost"),
          },
        },
      },
    };
    expectBuildError(tree, /does not resolve to a known token/);
  });
});
