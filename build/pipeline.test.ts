import { ref, type TokenTree } from "../src/tokens/schema.js";
import { buildModel, loadTokens } from "./pipeline.js";

describe("loadTokens", () => {
  it("returns the authored token tree", () => {
    expect(loadTokens().color).toBeDefined();
  });
});

describe("buildModel", () => {
  it("resolves the real token tree without error", () => {
    const model = buildModel(loadTokens());
    expect(model.tokens.length).toBeGreaterThan(0);
  });

  it("skips undefined scope entries", () => {
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
    const model = buildModel(tree);
    const token = model.tokens.find(
      (entry) => entry.jsPath === "color.surface",
    );
    expect(token?.scopes).toHaveLength(0);
  });

  it("merges base and scoped values for color-mode:dark", () => {
    const tree: TokenTree = {
      color: {
        neutral: {
          0: { $type: "color", $value: "#ffffff" },
          900: { $type: "color", $value: "#17171b" },
        },
        background: {
          primary: {
            $type: "color",
            $value: ref("color.neutral.0"),
            $scopes: {
              "color-mode:dark": ref("color.neutral.900"),
            },
          },
        },
      },
    };

    const model = buildModel(tree);
    const token = model.tokens.find(
      (entry) => entry.jsPath === "color.background.primary",
    );

    expect(token).toBeDefined();
    expect(token?.base).toMatchObject({
      kind: "alias",
      selector: null,
      targetPath: "color.neutral.0",
      value: "#ffffff",
    });
    expect(token?.scopes).toHaveLength(1);
    expect(token?.scopes[0]).toMatchObject({
      kind: "alias",
      targetPath: "color.neutral.900",
      value: "#17171b",
      selector: { key: "color-mode:dark" },
    });
    expect(token?.cssVar).toBe("--willow-color-background-primary");
  });
});
