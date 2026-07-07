#!/usr/bin/env node
// Parse Jest coverage output and format an updating PR comment that lists
// new/changed source files with per-file coverage percentages.
//
// Consumed by the coverage-check GitHub Actions workflow and usable locally:
//   node scripts/coverage-report.mjs origin/main

import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { COVERAGE_THRESHOLD } from "../tooling/jest/index.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const MARKER = "<!-- coverage-check -->";

function git(args, { cwd = repoRoot } = {}) {
  return execFileSync("git", args, { cwd, encoding: "utf8" });
}

function gitLines(args, opts) {
  return git(args, opts)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/** @param {string} file */
function isSourceFile(file) {
  if (!file.endsWith(".ts")) return false;
  // Declaration files carry no executable code and never appear in coverage.
  if (file.endsWith(".d.ts")) return false;
  if (file.endsWith(".test.ts") || file.endsWith(".spec.ts")) return false;
  if (file.includes("/__tests__/")) return false;
  return true;
}

/**
 * @param {string} baseRef
 * @param {string} diffFilter
 */
function changedSourceFiles(baseRef, diffFilter) {
  const range = `${baseRef}...HEAD`;
  return gitLines([
    "diff",
    "--name-only",
    `--diff-filter=${diffFilter}`,
    range,
    "--",
    "src",
    "build",
  ]).filter(isSourceFile);
}

/** @param {string} summaryPath */
function readCoverageSummary(summaryPath) {
  const raw = readFileSync(summaryPath, "utf8");
  return JSON.parse(raw);
}

/**
 * @param {Record<string, unknown>} summary
 * @param {string} file
 */
function lookupFileCoverage(summary, file) {
  const absKey = join(repoRoot, file);
  const entry = summary[absKey] ?? summary[file];
  if (!entry || typeof entry !== "object") {
    return null;
  }
  return /** @type {{ lines: { pct: number }, branches: { pct: number }, functions: { pct: number }, statements: { pct: number } }} */ (
    entry
  );
}

/** @param {number | undefined} pct */
function formatPct(pct) {
  if (pct === undefined || Number.isNaN(pct)) return "—";
  return `${pct}%`;
}

/** @param {{ lines: { pct: number }, branches: { pct: number }, functions: { pct: number }, statements: { pct: number } } | null} stats */
function isBelowThreshold(stats) {
  // No coverage entry means the file is not instrumented (e.g. a type-only
  // file with no runtime code). Treat as neutral rather than a failure so it
  // does not block the PR with a false positive.
  if (!stats) return false;
  return (
    stats.lines.pct < COVERAGE_THRESHOLD ||
    stats.branches.pct < COVERAGE_THRESHOLD ||
    stats.functions.pct < COVERAGE_THRESHOLD ||
    stats.statements.pct < COVERAGE_THRESHOLD
  );
}

/**
 * @param {string[]} files
 * @param {Record<string, unknown>} summary
 */
function renderFileTable(files, summary) {
  if (files.length === 0) {
    return "_None._";
  }

  const rows = files.map((file) => {
    const stats = lookupFileCoverage(summary, file);
    const below = isBelowThreshold(stats);
    const suffix = below ? " ❌" : "";
    return `| \`${file}\` | ${formatPct(stats?.lines.pct)} | ${formatPct(stats?.branches.pct)} | ${formatPct(stats?.functions.pct)} | ${formatPct(stats?.statements.pct)} |${suffix}`;
  });

  return [
    "| File | Lines | Branches | Functions | Statements |",
    "|------|------:|--------:|----------:|-----------:|",
    ...rows,
  ].join("\n");
}

/**
 * @param {{ baseRef?: string, summaryPath?: string }} [options]
 */
export function evaluate({
  baseRef = "origin/main",
  summaryPath = join(repoRoot, "coverage", "coverage-summary.json"),
} = {}) {
  const summary = readCoverageSummary(summaryPath);
  const globalStats = summary.total;

  const globalPassed =
    globalStats.lines.pct >= COVERAGE_THRESHOLD &&
    globalStats.branches.pct >= COVERAGE_THRESHOLD &&
    globalStats.functions.pct >= COVERAGE_THRESHOLD &&
    globalStats.statements.pct >= COVERAGE_THRESHOLD;

  const addedFiles = changedSourceFiles(baseRef, "A");
  // Modified, renamed, and copied files all count as "changed" for the report.
  const modifiedFiles = changedSourceFiles(baseRef, "MRC");

  const fileIssues = [...addedFiles, ...modifiedFiles].filter((file) =>
    isBelowThreshold(lookupFileCoverage(summary, file)),
  );

  const passed = globalPassed && fileIssues.length === 0;
  const status = passed ? "✅" : "❌";

  const commentBody = [
    MARKER,
    "### Coverage report",
    "",
    `**Global:** ${formatPct(globalStats.lines.pct)} lines · ${formatPct(globalStats.branches.pct)} branches · ${formatPct(globalStats.functions.pct)} functions · ${formatPct(globalStats.statements.pct)} statements (threshold: ${COVERAGE_THRESHOLD}%) ${status}`,
    "",
    "**New source files in this PR** (need tests):",
    "",
    renderFileTable(addedFiles, summary),
    "",
    "**Changed source files in this PR:**",
    "",
    renderFileTable(modifiedFiles, summary),
    "",
    "Run `pnpm run test:coverage` locally to reproduce.",
  ].join("\n");

  return {
    passed,
    globalPassed,
    fileIssues,
    addedFiles,
    modifiedFiles,
    commentBody,
    globalStats,
  };
}

function main() {
  const baseRef =
    process.argv[2] || process.env.COVERAGE_BASE_REF || "origin/main";

  let result;
  try {
    result = evaluate({ baseRef });
  } catch (error) {
    console.error(`coverage-report: failed to evaluate against "${baseRef}".`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  if (process.env.GITHUB_OUTPUT) {
    const delimiter = `cov_${Date.now()}`;
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `passed=${result.passed}\n` +
        `comment_body<<${delimiter}\n` +
        `${result.commentBody}\n` +
        `${delimiter}\n`,
    );
  } else {
    console.log(result.commentBody);
  }

  if (!result.passed) {
    if (!result.globalPassed) {
      console.error(
        `\n❌ Global coverage is below the ${COVERAGE_THRESHOLD}% threshold.`,
      );
    }
    if (result.fileIssues.length > 0) {
      console.error(
        `\n❌ The following PR files are below ${COVERAGE_THRESHOLD}% coverage:`,
      );
      for (const file of result.fileIssues) {
        console.error(`  - ${file}`);
      }
    }
    process.exit(1);
  }

  console.log(`\n✅ Coverage meets the ${COVERAGE_THRESHOLD}% threshold.`);
}

const isCli =
  process.argv[1] && process.argv[1].endsWith("coverage-report.mjs");
if (isCli) {
  main();
}
