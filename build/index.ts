import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildModel, loadTokens } from "./pipeline.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const defaultDistDir = join(root, "dist");

/** Write the token artifacts to `distDir`. Returns the directory written to. */
export function build(distDir: string): string {
  // Load, validate, and resolve the token model. This surfaces alias, scope,
  // and value errors up front (issue #6). Emitting the real CSS/JS artifacts
  // from this model is handled by the emit tickets (#7/#8); until then we write
  // placeholder artifacts so the package shape stays stable.
  buildModel(loadTokens());

  mkdirSync(distDir, { recursive: true });
  writeFileSync(
    join(distDir, "tokens.css"),
    ":root {\n  /* willow tokens */\n}\n",
  );
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
