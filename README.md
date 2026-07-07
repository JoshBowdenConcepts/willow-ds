# willow-ds

Willow is a themable design system. This repository hosts its packages.

## `@willow-ds/tokens`

Design tokens are the source of truth for styling. They are built into CSS custom properties and a typed JS object for consumers.

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

Husky runs `lint` and `format:check` on every commit via `.husky/pre-commit`.

### Releasing

Consumer-facing changes require a changeset (`pnpm changeset`) in the PR. After merge to `main`:

1. The **release** workflow opens a **Version Packages** PR with `package.json` version bumps and `CHANGELOG.md` updates.
2. Merging that PR creates a git tag and [GitHub release](https://github.com/JoshBowdenConcepts/willow-ds/releases). Packages are not published to npm yet.
