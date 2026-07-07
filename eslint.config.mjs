import { createConfig } from "./tooling/eslint/index.mjs";

export default createConfig({
  files: [
    "src/**/*.ts",
    "build/**/*.ts",
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/__tests__/**/*.ts",
  ],
});
