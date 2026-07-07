# Willow scope model

Tokens take different values depending on **scope**. A scope is a condition
under which a token resolves to an alternate value: a color mode, a viewport
breakpoint, or a feature. This document defines the v1 scope taxonomy, the
`data-willow-*` attribute contract the application uses to activate scopes, how
a token declares scope-specific values in the source, and — most importantly —
the precedence model that makes resolution deterministic when scopes nest in
any order.

This is a design specification. Authoring the `$scopes` shape and emitting the
CSS/JS artifacts are implemented by later tickets (the build pipeline, #6, and
the CSS/JS emit tickets, #7 and #8); the emitted CSS shown here is illustrative.
The companion authoring contract is [`docs/token-schema.md`](./token-schema.md).

## Scope taxonomy (v1)

| Scope type     | Values (v1)                                       | Activation         |
| -------------- | ------------------------------------------------- | ------------------ |
| **Color mode** | `light`, `dark`                                   | Attribute selector |
| **Breakpoint** | `sm`, `md`, `lg`                                  | Media query        |
| **Feature**    | Named flag/theme (`on`/`off` or a variant string) | Attribute selector |

- **Color mode** switches the palette. `light` is the base; `dark` (and any
  future modes) are overrides.
- **Breakpoints** are min-width thresholds. The base (unscoped) value applies
  below `sm`; each breakpoint widens from there. v1 thresholds:

  | Breakpoint | Min width |
  | ---------- | --------- |
  | `sm`       | `640px`   |
  | `md`       | `768px`   |
  | `lg`       | `1024px`  |

- **Features** are named, independently-togglable scopes for feature flags or
  sub-themes. Each feature has its own attribute so multiple features can be
  active at once. A feature value is either a boolean (`on`/`off`) or a named
  variant (e.g. `data-willow-feature-density="compact"`).

### Two axes

The three scope types fall on two independent axes, and **any scope may nest
inside any other** — the combinations are what make the model expressive:

- **DOM axis** — color mode and features. These are DOM state (attributes), so
  they nest inside one another in any order and to any depth.
- **Viewport axis** — breakpoints. A breakpoint is a viewport condition, not DOM
  state, so it is orthogonal: it can hold _together with_ any DOM-axis nesting
  (e.g. "at `lg`, inside a `dark` subtree, inside a feature").

Because the axes are independent, every combination is reachable: nest DOM
scopes freely, and a breakpoint layers on top of whatever DOM scope is active.
[Precedence](#precedence-nesting-and-the-cascade) defines how the axes interact.

## The `data-willow-*` attribute contract

The application activates attribute-driven scopes by setting `data-willow-*`
attributes on any element. A scope applies to that element and everything it
contains (see [Precedence](#precedence-nesting-and-the-cascade)).

| Scope      | Attribute                    | Example                                 |
| ---------- | ---------------------------- | --------------------------------------- |
| Color mode | `data-willow-color-mode`     | `data-willow-color-mode="dark"`         |
| Feature    | `data-willow-feature-<name>` | `data-willow-feature-promo="on"`        |
| Feature    | `data-willow-feature-<name>` | `data-willow-feature-density="compact"` |

Rules:

- `<name>` is a lowercase, hyphenated segment (matching the token-path segment
  rules in the schema).
- Breakpoints intentionally have **no attribute** — they are viewport
  conditions, expressed as media queries, not DOM state.
- An attribute with no matching scoped tokens is inert (no error); it simply
  matches no override rules.
- Setting `data-willow-color-mode="light"` explicitly re-asserts the base mode,
  which is how a subtree opts back out of an ancestor's `dark`.

## Declaring scope-specific values in the source

A leaf token keeps its unscoped `$value` as the base and adds an optional
`$scopes` map. Each key is a **scope selector** — a `scope-type:value` string —
and each entry is a value (or [alias](./token-schema.md#aliases-references)) of
the same `$type` as the base token.

```ts
// Extends the leaf shape in `src/tokens/schema.ts`.
{
  $type: "color",
  $value: ref("color.neutral.0"),        // base (light)
  $scopes: {
    "color-mode:dark": ref("color.neutral.900"),
    "breakpoint:lg": "#ffffff",
    "feature-promo:on": ref("color.brand.500"),
  },
}
```

Scope selector grammar:

| Scope type | Selector key form        | Example            |
| ---------- | ------------------------ | ------------------ |
| Color mode | `color-mode:<value>`     | `color-mode:dark`  |
| Breakpoint | `breakpoint:<value>`     | `breakpoint:md`    |
| Feature    | `feature-<name>:<value>` | `feature-promo:on` |

**Compound keys (cross-axis combinations).** A key may combine conditions with
`&` to declare a value that applies only when _all_ of them hold. This is how
a token varies by a breakpoint _and_ a DOM scope at the same time (the case a
single-condition key cannot express). Conditions are an unordered set, so
`"color-mode:dark & breakpoint:lg"` and `"breakpoint:lg & color-mode:dark"` mean
the same thing.

```ts
$scopes: {
  "color-mode:dark": ref("color.neutral.900"),        // dark at any width
  "color-mode:dark & breakpoint:lg": "#f5f5f5",        // dark, only at >= lg
}
```

Constraints (enforced by the build, alongside the existing schema validations):

- A scoped value's `$type` matches the base token's `$type`.
- Aliases in `$scopes` resolve and type-match exactly like base aliases.
- Scope selector keys reference known scope types and use permitted segment
  characters.
- A compound key holds **at most one breakpoint** condition (breakpoints are
  mutually exclusive viewport bands). Its attribute conditions (color mode /
  features) must be satisfiable on a single element, since they compile to one
  compound attribute selector.

Because the base value stays on the token, a token is **fully defined without
any scope** — scopes are purely additive overrides. This keeps the tree
serialization-agnostic for the planned iOS export.

## How scopes map to CSS

Each scope type maps to the CSS construct that best expresses its activation
condition:

| Scope type | CSS construct      | Why                                          |
| ---------- | ------------------ | -------------------------------------------- |
| Color mode | Attribute selector | DOM state, can nest per-subtree              |
| Feature    | Attribute selector | DOM state, independently togglable, can nest |
| Breakpoint | Media query        | Viewport condition, not DOM state            |

The build emits a `:root` base layer plus one override rule per scoped value.
Attribute conditions become the selector (`:root` when there are none);
a breakpoint condition wraps that rule in a `@media (min-width: …)` block. A
breakpoint therefore wraps **any** selector, not just `:root` — that is what
lets it combine with a DOM scope at depth. For a token with the compound key
above:

```css
:root {
  --willow-color-background-primary: var(--willow-color-neutral-0);
}

/* DOM axis: attribute selectors, active at any width */
[data-willow-color-mode="dark"] {
  --willow-color-background-primary: var(--willow-color-neutral-900);
}

[data-willow-feature-promo="on"] {
  --willow-color-background-primary: var(--willow-color-brand-500);
}

/* Viewport axis over :root: a plain breakpoint value */
@media (min-width: 1024px) {
  :root {
    --willow-color-background-primary: #ffffff;
  }
}

/* Cross-axis: the breakpoint wraps the attribute selector, so it applies
   at the dark element's depth and only at >= lg */
@media (min-width: 1024px) {
  [data-willow-color-mode="dark"] {
    --willow-color-background-primary: #f5f5f5;
  }
}
```

## Precedence: nesting and the cascade

**Requirement:** scopes may nest in any DOM order, and the most-nested (deepest)
applicable scope wins — deterministically, regardless of the order the scopes
are nested in.

**Mechanism: custom-property inheritance, not selector specificity.** Each scope
override re-declares the affected `--willow-*` custom property _on the scoping
element itself_. CSS custom properties inherit, so any element resolves a
variable to the value set by its **nearest ancestor** that declared it. The
deepest scope in the DOM is, by definition, the nearest ancestor — so it wins
automatically. This is ordinary inheritance and does not depend on the
specificity or source order of the scope selectors, which is exactly what makes
nesting order-independent.

```mermaid
flowchart TD
  root[":root — base: neutral-0 (viewport axis sets :root here)"]
  feat["div[data-willow-feature-promo=on] — brand-500"]
  mode["div[data-willow-color-mode=dark] — neutral-900"]
  leaf["button — resolves to neutral-900 (nearest ancestor that set the var)"]
  root --> feat --> mode --> leaf
```

Contrast with specificity: if precedence relied on selector specificity,
`[data-willow-color-mode="dark"]` and `[data-willow-feature-promo="on"]` have
_equal_ specificity, so the winner would depend on source order in the
stylesheet — not on which is deeper in the DOM. Inheritance sidesteps this
entirely: the value that reaches a node is always the one from the closest
enclosing scope element.

### Same-element conflicts

Inheritance resolves _across_ elements (depth). When two attribute scopes set
the **same** variable on the **same** element (e.g. one `<div>` carries both
`data-willow-color-mode="dark"` and `data-willow-feature-promo="on"`), there is
no depth to distinguish them. This is the one case decided by the normal
cascade: equal-specificity attribute selectors resolve by **source order**, and
the build emits scope rules in a **fixed, documented order** so the outcome is
still deterministic.

v1 same-element order (later rule wins): **color mode → feature**. A feature
override therefore beats a color-mode override on the same element. To force the
opposite, place the scopes on separate nested elements, where depth (not order)
decides.

### The viewport axis (breakpoints)

Breakpoints do not nest in the DOM — they are a viewport condition. They
interact with the DOM axis by **wrapping** it:

- A **plain** breakpoint value targets `:root`, so it sits at the top of the
  inheritance chain. Any DOM scope on a deeper element therefore overrides it.
  This is intentional: a subtree that opts into `dark` keeps its dark value
  regardless of viewport, unless it also declares a breakpoint-specific value.
- A **compound** value (breakpoint + attribute) is emitted as the media query
  wrapping that attribute selector. It lands on the same element as the plain
  attribute rule, at the same specificity, but later in source order, so when
  the media query matches it wins for that element — and it inherits down from
  that element's depth. When the viewport no longer matches, the plain
  attribute value takes over again. Both outcomes are deterministic.

In short: the DOM axis decides _which element's_ value an node inherits (by
depth); the viewport axis decides _which of that element's_ candidate values is
active (by media match). The two never contend for the same slot.

## Worked examples

### 1. Dark inside a feature inside a breakpoint

```html
<html data-willow-color-mode="light">
  <!-- viewport ≥ 1024px, so breakpoint:lg is active -->
  <body>
    <section data-willow-feature-promo="on">
      <div data-willow-color-mode="dark">
        <button>Buy</button>
      </div>
    </section>
  </body>
</html>
```

Resolving `--willow-color-background-primary` on `<button>`, using the token
defined above:

| Ancestor (outer → inner)           | Sets var to             |
| ---------------------------------- | ----------------------- |
| `:root` (base) + `@media lg`       | `neutral-0` / `#ffffff` |
| `[data-willow-feature-promo="on"]` | `brand-500`             |
| `[data-willow-color-mode="dark"]`  | `neutral-900`           |

The nearest ancestor that sets the variable is the `dark` `<div>`, so the button
resolves to **`neutral-900`**.

### 2. Order-independence

Swap the nesting so the feature is the deepest scope:

```html
<div data-willow-color-mode="dark">
  <section data-willow-feature-promo="on">
    <button>Buy</button>
  </section>
</div>
```

Now the nearest ancestor setting the variable is the `feature-promo` `<section>`,
so the button resolves to **`brand-500`**. Only the DOM depth changed — no
stylesheet edit, no specificity tweak — and the result flips accordingly. This
is the deterministic "deepest wins" behavior.

### 3. Same-element tie-break

```html
<div data-willow-color-mode="dark" data-willow-feature-promo="on">
  <button>Buy</button>
</div>
```

Both scopes are on one element, so there is no depth to compare. The fixed emit
order (color mode → feature, feature last) means the **feature** value wins:
the button resolves to **`brand-500`**. Splitting the attributes onto nested
elements (example 1 vs 2) is how an author chooses a different winner.

### 4. A breakpoint combined with a nested DOM scope

Using the compound token (`color-mode:dark` → `neutral-900`,
`color-mode:dark & breakpoint:lg` → `#f5f5f5`):

```html
<div data-willow-color-mode="dark">
  <button>Buy</button>
</div>
```

- **Below `lg`:** only `[data-willow-color-mode="dark"]` matches, so the button
  resolves to **`neutral-900`**.
- **At `lg` and up:** the media-wrapped rule
  `@media (min-width:1024px) [data-willow-color-mode="dark"]` also matches. It
  targets the same `dark` element at equal specificity but comes later, so it
  wins and the button resolves to **`#f5f5f5`**.

The breakpoint applies _at the dark element's depth_, not globally at `:root` —
that is the viewport axis nesting with the DOM axis. Resizing across `lg` flips
the value deterministically, with no change to the DOM.

## Determinism summary

- Across elements, precedence is decided by **DOM depth** via custom-property
  inheritance: the deepest applicable scope always wins, independent of nesting
  order or stylesheet source order.
- On a single element, precedence is decided by a **fixed, documented emit
  order** (color mode → feature), so the result is still deterministic.
- Breakpoints are an **orthogonal viewport axis**: a plain breakpoint value sets
  `:root`, and a compound value wraps its attribute selector so it applies at
  that element's depth. The media query only selects _which_ of an element's
  candidate values is active; DOM depth still decides which element is
  inherited from.

Given a DOM and a viewport, every `--willow-*` variable resolves to exactly one
value with no ordering ambiguity.

## Considered and rejected: CSS `light-dark()`

CSS `light-dark()` expresses a light/dark pair inside a single value
(`color: light-dark(black, white)`), switched by the `color-scheme` property. It
was evaluated and **rejected** as the scope mechanism because:

- **Color-mode only.** It cannot express breakpoints or features, so it would
  cover just one of three scope types and force a second, different mechanism
  for the rest — the opposite of a uniform model.
- **No depth-based precedence.** It resolves per value, not per scope element,
  so it does not provide the "deepest-nested scope wins in any order" behavior
  the attribute + inheritance model gives.
- **Opt-in coupling.** It requires the page to set `color-scheme`, coupling
  token resolution to a property consumers must manage separately.

Standardizing every scope type on the attribute-selector + custom-property
inheritance model keeps one consistent, order-independent precedence rule for
color modes, breakpoints, and features alike.
