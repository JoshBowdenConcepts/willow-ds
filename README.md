# willow-ds

Willow is a themable design system. This repository hosts its packages.

## `@willow-ds/tokens`

Design tokens are the source of truth for styling. They are built into CSS custom properties and a typed JS object for consumers.

### Folder layout

| Path | Purpose |
|------|---------|
| `src/tokens/` | Token source files |
| `build/` | Custom TypeScript build pipeline |
| `dist/` | Generated output (CSS + JS/TS); gitignored |

### Requirements

- Node.js 22+ (see `.nvmrc` and `engines` in `package.json`)

### Scripts

| Script | Description |
|--------|-------------|
| `pnpm run build` | Run the token build pipeline |
| `pnpm run clean` | Remove generated `dist/` output |
| `pnpm run typecheck` | Type-check `src/` and `build/` |

Test and lint tooling will be added in separate tickets.
