import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { build } from "./index.js";

describe("build pipeline", () => {
  let outDir: string;

  beforeAll(() => {
    outDir = mkdtempSync(join(tmpdir(), "willow-build-"));
    build(outDir);
  });

  afterAll(() => {
    rmSync(outDir, { recursive: true, force: true });
  });

  it("writes tokens.css with a :root block and real token declarations", () => {
    const cssPath = join(outDir, "tokens.css");
    expect(existsSync(cssPath)).toBe(true);
    const css = readFileSync(cssPath, "utf8");
    expect(css).toContain(":root");
    expect(css).toContain("--willow-color-background-primary:");
    expect(css).toContain('[data-willow-color-mode="dark"]');
    expect(css).toMatch(
      /\[data-willow-color-mode="dark"\][\s\S]*--willow-color-background-primary: var\(--willow-color-neutral-900\);/,
    );
  });

  it("writes tokens.js exporting an empty tokens object", () => {
    const jsPath = join(outDir, "tokens.js");
    expect(existsSync(jsPath)).toBe(true);
    expect(readFileSync(jsPath, "utf8")).toContain("export const tokens");
  });

  it("writes tokens.d.ts with a tokens type declaration", () => {
    const dtsPath = join(outDir, "tokens.d.ts");
    expect(existsSync(dtsPath)).toBe(true);
    expect(readFileSync(dtsPath, "utf8")).toContain(
      "export declare const tokens",
    );
  });
});
