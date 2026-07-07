import { existsSync, readFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "dist");

describe("build pipeline", () => {
  beforeAll(async () => {
    rmSync(distDir, { recursive: true, force: true });
    await import("./index.js");
  });

  it("writes tokens.css with a :root block", () => {
    const cssPath = join(distDir, "tokens.css");
    expect(existsSync(cssPath)).toBe(true);
    expect(readFileSync(cssPath, "utf8")).toContain(":root");
  });

  it("writes tokens.js exporting an empty tokens object", () => {
    const jsPath = join(distDir, "tokens.js");
    expect(existsSync(jsPath)).toBe(true);
    expect(readFileSync(jsPath, "utf8")).toContain("export const tokens");
  });

  it("writes tokens.d.ts with a tokens type declaration", () => {
    const dtsPath = join(distDir, "tokens.d.ts");
    expect(existsSync(dtsPath)).toBe(true);
    expect(readFileSync(dtsPath, "utf8")).toContain(
      "export declare const tokens",
    );
  });
});
