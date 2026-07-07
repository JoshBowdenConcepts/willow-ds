# willow-ds

Willow is a themable design system. This repository hosts its packages.

## `@willow-ds/tokens`

Design tokens are the source of truth for styling. They are built into CSS custom properties and a typed JS object for consumers.

The authoring contract (format, categories, naming rules, and aliases) is documented in [docs/token-schema.md](docs/token-schema.md).

### Folder layout

| Path          | Purpose                                    |
| ------------- | ------------------------------------------ |
| `src/tokens/` | Token source files                         |
| `build/`      | Custom TypeScript build pipeline           |
| `dist/`       | Generated output (CSS + JS/TS); gitignored |

### Requirements

- Node.js 22+ (see `.nvmrc` and `engines` in `package.json`)

### Scripts

| Script               | Description                     |
| -------------------- | ------------------------------- |
| `pnpm run build`     | Run the token build pipeline    |
| `pnpm run clean`     | Remove generated `dist/` output |
| `pnpm run typecheck` | Type-check `src/` and `build/`  |

### Linting & formatting

Shared configs live in `tooling/` so future packages can reuse them.

| Script                  | Description                                    |
| ----------------------- | ---------------------------------------------- |
| `pnpm run lint`         | Run ESLint on `src/`, `build/`, and test files |
| `pnpm run lint:fix`     | Auto-fix ESLint issues where possible          |
| `pnpm run format`       | Format the repo with Prettier                  |
| `pnpm run format:check` | Verify formatting without writing files        |

Husky runs `lint`, `format:check`, and `test:coverage` on every commit via `.husky/pre-commit`.

### Testing

| Script                   | Description                                    |
| ------------------------ | ---------------------------------------------- |
| `pnpm test`              | Run Jest test suite                            |
| `pnpm run test:watch`    | Run tests in watch mode                        |
| `pnpm run test:coverage` | Run tests with coverage report (90% threshold) |

**File conventions:** co-located `*.test.ts` or `*.spec.ts` next to source, or files under `__tests__/` directories. All patterns are included by `tsconfig.json` and ESLint.

**Coverage gate:** every source file **and** the overall total must stay at or above **90%** (branches, functions, lines, statements). The per-file and global thresholds are enforced by Jest on commit (Husky) and in CI. Pull requests also receive an auto-updating coverage comment listing new and changed source files with per-file percentages.

Coverage output is written to `coverage/` (gitignored).

### Releasing

Consumer-facing changes require a changeset (`pnpm changeset`) in the PR. After merge to `main`:

1. The **release** workflow opens a **Version Packages** PR with `package.json` version bumps and `CHANGELOG.md` updates.
2. Merging that PR creates a git tag and [GitHub release](https://github.com/JoshBowdenConcepts/willow-ds/releases). Packages are not published to npm yet.
