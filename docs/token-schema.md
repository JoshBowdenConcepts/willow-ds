# Willow token schema

This is the authoring contract for Willow design tokens. The build pipeline
reads the token tree exported from [`src/tokens/`](../src/tokens/) and generates
two artifacts from this single source of truth:

1. CSS custom properties (`--willow-*`), the primary output.
2. A typed JS/TS object (with `.d.ts`) for CSS-in-JS consumers.

This document defines how tokens are authored. Alias resolution, value
validation, and artifact emission are implemented by the build pipeline
(tracked separately); this ticket defines the schema and expectations only.

## Authoring format: TypeScript modules

Tokens are authored as `.ts` modules and composed into a single exported
`tokens` object via the [`defineTokens`](../src/tokens/schema.ts) helper.

**Why TypeScript over JSON:**

| Concern              | TypeScript (chosen)                              | JSON                                     |
| -------------------- | ------------------------------------------------ | ---------------------------------------- |
| Authoring safety     | Compile-time type checking of `$type` / `$value` | None without a separate validator        |
| Editor experience    | Autocomplete, go-to-definition, inline JSDoc     | Limited                                  |
| Aliases              | `ref()` helper produces the reference form       | Hand-written strings, easy to mistype    |
| Comments / rationale | Inline comments allowed                          | Not supported                            |
| Tooling neutrality   | Requires a TS/JS reader                          | Language-neutral, easiest for iOS export |

The schema is intentionally **serialization-agnostic**: the leaf shape mirrors
the [DTCG format](https://tr.designtokens.org/format/), so the tree can be
emitted as JSON later (e.g. for the planned iOS export) without changing the
authoring model.

## Leaf token shape

Every leaf token is an object with a DTCG-inspired shape:

```ts
{
  $type: TokenType,        // the value kind
  $value: <value> | Alias, // a concrete value or a reference to another token
  $description?: string,   // optional human-readable note
}
```

Groups are plain nested objects; any object without a `$value` is a group.

```ts
export const primitives = defineTokens({
  color: {
    brand: {
      500: { $type: "color", $value: "#3b5bdb", $description: "Brand base." },
    },
  },
});
```

## Categories (v1)

| Category     | Purpose                                                | Example type(s)                                   |
| ------------ | ------------------------------------------------------ | ------------------------------------------------- |
| `color`      | Palette + semantic colors                              | `color`                                           |
| `spacing`    | Primitive spacing scale (4px grid)                     | `dimension`                                       |
| `space`      | Semantic spacing (inline / stack / section)            | `dimension`                                       |
| `sizing`     | Component/container widths and heights                 | `dimension`                                       |
| `radius`     | Corner radii                                           | `dimension`                                       |
| `border`     | Border widths (`border.width.*`)                       | `dimension`                                       |
| `shadow`     | Primitive box-shadow definitions                       | `shadow`                                          |
| `elevation`  | Semantic shadows (raised / overlay)                    | `shadow`                                          |
| `zIndex`     | Stacking order                                         | `number`                                          |
| `motion`     | Durations and easing curves                            | `duration`, `cubicBezier`                         |
| `typography` | Font family, size, weight, line height, letter spacing | `fontFamily`, `dimension`, `fontWeight`, `number` |

## Value types

| `$type`       | Accepted `$value`                                    |
| ------------- | ---------------------------------------------------- |
| `color`       | CSS color string (`#rrggbb`, `rgb(...)`, `hsl(...)`) |
| `dimension`   | Length string with unit (`16px`, `1rem`) or `"0"`    |
| `number`      | Unitless number (e.g. line-height, z-index)          |
| `fontFamily`  | String or array of family names                      |
| `fontWeight`  | Numeric weight (`400`) or keyword (`"bold"`)         |
| `duration`    | Time string (`200ms`)                                |
| `cubicBezier` | Tuple `[x1, y1, x2, y2]`                             |
| `shadow`      | Composite object (or array of them) — see below      |
| `string`      | Arbitrary string escape hatch                        |

A `shadow` value is `{ color, offsetX, offsetY, blur, spread, inset? }`, or an
array of those for layered shadows.

## Naming convention

All tokens are namespaced under the `willow` prefix. A token's identity is its
**path** — the sequence of object keys from the root to the leaf.

- **Segment keys:** lowercase alphanumeric; multi-word segments use hyphens;
  numeric scale steps are allowed (e.g. `500`).
- **CSS variable:** `--willow-` followed by the path segments joined with `-`.
- **JS object:** dot-notation mirror of the path.

| Token path                 | CSS variable                        | JS access                         |
| -------------------------- | ----------------------------------- | --------------------------------- |
| `color.background.primary` | `--willow-color-background-primary` | `tokens.color.background.primary` |
| `color.brand.500`          | `--willow-color-brand-500`          | `tokens.color.brand["500"]`       |
| `space.section`            | `--willow-space-section`            | `tokens.space.section`            |

## Aliases (references)

Semantic tokens reference primitives instead of duplicating values. A reference
is a string in DTCG curly-brace form pointing at another token's path:

```ts
import { ref } from "./schema.js";

export const semantic = defineTokens({
  color: {
    background: {
      primary: { $type: "color", $value: ref("color.neutral.0") }, // "{color.neutral.0}"
    },
  },
});
```

Primitive and semantic tokens live in the **same tree** (composed in
[`src/tokens/index.ts`](../src/tokens/index.ts)) so every alias path resolves
within it. Within a category the two layers occupy distinct groups (e.g.
`color.neutral.*` primitives vs `color.background.*` semantics), so they merge
without collisions.

## Validation expectations (enforced by the build)

The authoring types catch most mistakes at compile time. The build pipeline is
expected to additionally verify:

- Every alias path resolves to an existing token.
- No alias cycles exist.
- An alias's `$type` matches the `$type` of the token it references.
- `color`, `dimension`, and `duration` values are well-formed for their type.
- Token paths are unique and use only permitted segment characters.
