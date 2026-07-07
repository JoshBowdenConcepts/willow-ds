#!/usr/bin/env node
// Single source of truth for deciding whether a set of changes requires a
// changeset. Consumed by both the Husky pre-push hook and the CI workflow.
//
// A changeset is only required when the *published export* actually changes.
// Infrastructure changes (build refactors, source reorganisation, tooling,
// docs) that produce a byte-identical package do NOT require a changeset.
//
// How it works, deterministically and with no manual steps:
//   1. Build + `pnpm pack` HEAD, then fingerprint the packed files.
//   2. Check the base ref out into a throwaway git worktree, build + pack it
//      there, and fingerprint that too. `dist/` is never committed.
//   3. If the fingerprints differ, the export changed -> a changeset is
//      required.
// The package.json `version` field is excluded from the fingerprint because
// version bumps are the *output* of changesets, not a reason to require one.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function git(args, { cwd = repoRoot } = {}) {
  return execFileSync("git", args, { cwd, encoding: "utf8" });
}

function gitLines(args, opts) {
  return git(args, opts)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function run(cmd, args, cwd) {
  execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: "pipe" });
}

/** Recursively list every file under `dir`. */
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(abs));
    else out.push(abs);
  }
  return out;
}

/** Strip fields that do not affect the consumer-facing published export. */
function normalizePackageJson(buffer) {
  const pkg = JSON.parse(buffer.toString("utf8"));
  return Buffer.from(
    JSON.stringify({
      exports: pkg.exports,
      files: pkg.files,
      sideEffects: pkg.sideEffects,
    }),
  );
}

/**
 * Build the package at `cwd`, pack it, and return a content hash of every file
 * that would be published. Uses each checkout's *own* build + pack scripts, so
 * the fingerprint reflects that revision's actual export.
 */
export function exportFingerprint(cwd) {
  run("pnpm", ["run", "build"], cwd);

  const workDir = mkdtempSync(join(tmpdir(), "willow-pack-"));
  try {
    run("pnpm", ["pack", "--pack-destination", workDir], cwd);
    const tarball = readdirSync(workDir).find((f) => f.endsWith(".tgz"));
    if (!tarball) throw new Error("pnpm pack produced no tarball");

    const unpacked = join(workDir, "unpacked");
    mkdirSync(unpacked);
    run("tar", ["-xzf", join(workDir, tarball), "-C", unpacked], cwd);

    // npm/pnpm always nest packed contents under a top-level `package/` dir.
    const pkgDir = join(unpacked, "package");
    const hash = createHash("sha256");
    for (const abs of walk(pkgDir).sort()) {
      const rel = relative(pkgDir, abs);
      if (rel === "package.json") {
        hash.update(rel);
        hash.update("\0");
        hash.update(normalizePackageJson(readFileSync(abs)));
        hash.update("\0");
        continue;
      }
      if (!rel.startsWith("dist/")) continue;
      hash.update(rel);
      hash.update("\0");
      hash.update(readFileSync(abs));
      hash.update("\0");
    }
    return hash.digest("hex");
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

/** Fingerprint the export of `baseRef` via an isolated, disposable worktree. */
export function baseExportFingerprint(baseRef) {
  const tmp = mkdtempSync(join(tmpdir(), "willow-base-"));
  const checkout = join(tmp, "checkout");
  git(["worktree", "add", "--detach", checkout, baseRef]);
  try {
    // Reuse the already-installed toolchain instead of a fresh (slow) install.
    symlinkSync(join(repoRoot, "node_modules"), join(checkout, "node_modules"));
    return exportFingerprint(checkout);
  } finally {
    try {
      git(["worktree", "remove", "--force", checkout]);
    } catch {
      // Worktree bookkeeping is best-effort; the tmp dir removal is what matters.
    }
    rmSync(tmp, { recursive: true, force: true });
  }
}

/**
 * Evaluate whether the diff between `baseRef` and HEAD requires a changeset.
 * @param {{ baseRef?: string }} [options]
 * @returns {{ required: boolean, hasChangeset: boolean, changedFiles: string[], reason: string }}
 */
export function evaluate({ baseRef = "origin/main" } = {}) {
  const range = `${baseRef}...HEAD`;
  const changedFiles = gitLines(["diff", "--name-only", range]);

  // A changeset is present if this branch newly adds a `.changeset/*.md` file
  // that is not the boilerplate README.
  const hasChangeset =
    gitLines([
      "diff",
      "--diff-filter=A",
      "--name-only",
      range,
      "--",
      ".changeset",
    ]).filter(
      (file) => file.endsWith(".md") && !file.endsWith(".changeset/README.md"),
    ).length > 0;

  // Fast paths that avoid the (relatively) expensive double build.
  if (changedFiles.length === 0) {
    return {
      required: false,
      hasChangeset,
      changedFiles,
      reason: "no changes",
    };
  }
  if (hasChangeset) {
    // A changeset already satisfies the gate; no need to compute the export.
    return {
      required: true,
      hasChangeset,
      changedFiles,
      reason: "changeset present",
    };
  }

  const headFingerprint = exportFingerprint(repoRoot);

  let baseFingerprint;
  try {
    baseFingerprint = baseExportFingerprint(baseRef);
  } catch (error) {
    // If we can't build the base (missing ref, broken build, etc.) fail safe by
    // requiring a changeset rather than silently letting a change through.
    console.warn(
      `changeset-required: could not fingerprint base "${baseRef}": ${error.message}`,
    );
    return {
      required: true,
      hasChangeset,
      changedFiles,
      reason: "base export could not be determined",
    };
  }

  const required = headFingerprint !== baseFingerprint;
  return {
    required,
    hasChangeset,
    changedFiles,
    reason: required ? "export changed" : "export unchanged",
  };
}

function main() {
  const baseRef =
    process.argv[2] || process.env.CHANGESET_BASE_REF || "origin/main";

  let result;
  try {
    result = evaluate({ baseRef });
  } catch (error) {
    console.error(
      `changeset-required: failed to evaluate against "${baseRef}".`,
    );
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
        `The published export changed relative to ${baseRef} ` +
        `(${result.reason}).\n\n` +
        "Run `pnpm changeset` to describe your change, then commit the " +
        "generated file.\n",
    );
    process.exit(1);
  }

  console.log(
    result.required
      ? "\u2705 Changeset found for the export change in this branch."
      : `\u2705 No changeset required (${result.reason}).`,
  );
}

// `import.meta.main` is not yet universal, so compare argv instead.
const isCli =
  process.argv[1] && process.argv[1].endsWith("changeset-required.mjs");
if (isCli) {
  main();
}
