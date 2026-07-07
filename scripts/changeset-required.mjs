#!/usr/bin/env node
// Single source of truth for deciding whether a set of changes requires a
// changeset. Consumed by both the Husky pre-push hook and the CI workflow so
// the exempt-file rules only ever need to change in one place.

import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import micromatch from "micromatch";

// Files matched here do NOT require a changeset (docs, config, tooling, etc.).
export const EXEMPT_PATTERNS = [
  "**/*.md",
  "LICENSE",
  ".changeset/**",
  ".github/**",
  ".husky/**",
  ".vscode/**",
  ".gitignore",
  ".npmrc",
  ".prettier*",
  ".eslint*",
  "eslint.config.*",
  "tsconfig*.json",
  "pnpm-lock.yaml",
];

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Evaluate whether the diff between `baseRef` and HEAD requires a changeset.
 * @param {{ baseRef?: string }} [options]
 * @returns {{ required: boolean, hasChangeset: boolean, changedFiles: string[], offendingFiles: string[] }}
 */
export function evaluate({ baseRef = "origin/main" } = {}) {
  const range = `${baseRef}...HEAD`;

  const changedFiles = git(["diff", "--name-only", range]);

  // A changeset is present if this branch newly adds a `.changeset/*.md`
  // file that is not the boilerplate README.
  const addedChangesetFiles = git([
    "diff",
    "--diff-filter=A",
    "--name-only",
    range,
    "--",
    ".changeset",
  ]).filter(
    (file) => file.endsWith(".md") && !file.endsWith(".changeset/README.md"),
  );

  const offendingFiles = changedFiles.filter(
    (file) => !micromatch.isMatch(file, EXEMPT_PATTERNS, { dot: true }),
  );

  return {
    required: offendingFiles.length > 0,
    hasChangeset: addedChangesetFiles.length > 0,
    changedFiles,
    offendingFiles,
  };
}

function main() {
  const baseRef = process.argv[2] || process.env.CHANGESET_BASE_REF || "origin/main";

  let result;
  try {
    result = evaluate({ baseRef });
  } catch (error) {
    console.error(`changeset-required: failed to diff against "${baseRef}".`);
    console.error(error.message);
    process.exit(1);
  }

  const missing = result.required && !result.hasChangeset;

  // Emit machine-readable outputs for GitHub Actions when available.
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `required=${result.required}\nhas_changeset=${result.hasChangeset}\nmissing=${missing}\n`,
    );
  }

  if (missing) {
    console.error(
      "\n\u274c A changeset is required but none was found.\n" +
        `The following non-exempt files changed since ${baseRef}:\n` +
        result.offendingFiles.map((f) => `  - ${f}`).join("\n") +
        "\n\nRun `pnpm changeset` to describe your change, then commit the generated file.\n",
    );
    process.exit(1);
  }

  console.log(
    result.required
      ? "\u2705 Changeset found for the changes in this branch."
      : "\u2705 No changeset required (only exempt files changed).",
  );
}

// `import.meta.main` is not yet universal, so compare argv instead.
const isCli =
  process.argv[1] && process.argv[1].endsWith("changeset-required.mjs");
if (isCli) {
  main();
}
