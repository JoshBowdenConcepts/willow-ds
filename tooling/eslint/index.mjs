import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

const defaultFiles = [
  "src/**/*.ts",
  "build/**/*.ts",
  "**/*.test.ts",
  "**/*.spec.ts",
  "**/__tests__/**/*.ts",
];

/**
 * Shared ESLint flat config for Willow packages.
 * @param {{ files?: string[] }} [options]
 */
export function createConfig({ files = defaultFiles } = {}) {
  return tseslint.config(
    {
      ignores: ["dist/**", "node_modules/**", "coverage/**"],
    },
    {
      files,
      extends: [eslint.configs.recommended, ...tseslint.configs.recommended],
      languageOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
    },
    eslintConfigPrettier,
  );
}
