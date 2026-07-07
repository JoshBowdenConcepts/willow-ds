/** @typedef {import('jest').Config} JestConfig */

const COVERAGE_THRESHOLD = 90;

const defaultCollectCoverageFrom = [
  "src/**/*.ts",
  "build/**/*.ts",
  "!**/*.test.ts",
  "!**/*.spec.ts",
  "!**/__tests__/**",
];

/**
 * Shared Jest config for Willow packages (ESM + TypeScript).
 * @param {{ collectCoverageFrom?: string[] }} [options]
 * @returns {JestConfig}
 */
export function createConfig({
  collectCoverageFrom = defaultCollectCoverageFrom,
} = {}) {
  return {
    preset: "ts-jest/presets/default-esm",
    testEnvironment: "node",
    extensionsToTreatAsEsm: [".ts"],
    moduleNameMapper: {
      "^(\\.{1,2}/.*)\\.js$": "$1",
    },
    testMatch: ["**/*.test.ts", "**/*.spec.ts", "**/__tests__/**/*.ts"],
    collectCoverageFrom,
    coverageDirectory: "coverage",
    coverageReporters: ["text", "text-summary", "lcov", "json-summary"],
    coverageThreshold: {
      // `global` enforces the overall floor; the glob keys enforce the same
      // floor per individual file, so a single under-covered file fails the
      // run locally (pre-commit) and in CI, not just when the average dips.
      global: {
        branches: COVERAGE_THRESHOLD,
        functions: COVERAGE_THRESHOLD,
        lines: COVERAGE_THRESHOLD,
        statements: COVERAGE_THRESHOLD,
      },
      "src/**/*.ts": {
        branches: COVERAGE_THRESHOLD,
        functions: COVERAGE_THRESHOLD,
        lines: COVERAGE_THRESHOLD,
        statements: COVERAGE_THRESHOLD,
      },
      "build/**/*.ts": {
        branches: COVERAGE_THRESHOLD,
        functions: COVERAGE_THRESHOLD,
        lines: COVERAGE_THRESHOLD,
        statements: COVERAGE_THRESHOLD,
      },
    },
  };
}

export { COVERAGE_THRESHOLD };
