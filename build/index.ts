import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "dist");

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
