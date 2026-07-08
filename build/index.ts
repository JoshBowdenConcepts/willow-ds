import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { emitCss } from "./emit-css.js";
import { buildModel, loadTokens } from "./pipeline.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const defaultDistDir = join(root, "dist");

/** Write the token artifacts to `distDir`. Returns the directory written to. */
export function build(distDir: string): string {
  const model = buildModel(loadTokens());

  mkdirSync(distDir, { recursive: true });
  writeFileSync(join(distDir, "tokens.css"), emitCss(model));
  writeFileSync(join(distDir, "tokens.js"), "export const tokens = {};\n");
  writeFileSync(
    join(distDir, "tokens.d.ts"),
    "export declare const tokens: Readonly<Record<string, never>>;\n",
  );
  return distDir;
}

/* istanbul ignore next -- CLI entry point, exercised via `tsx build/index.ts` */
if (process.argv[1]?.endsWith(join("build", "index.ts"))) {
  build(defaultDistDir);
}
