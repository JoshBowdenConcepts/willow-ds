# Create PR

## Overview

Create a well-structured pull request for **front-end / design-system** work,
using the repo's PR template at `.github/pull_request_template.md`.

## Steps

1. **Prepare branch**
   - Ensure work is on a correctly named branch (see **Branch naming** below)
   - Ensure all changes are committed
   - Add a changeset if required (`pnpm changeset`) for any non-docs change
   - Ensure tests, lint, and format pass (`pnpm test`)
   - Push branch to remote and verify it's up to date with `main`
2. **Gather PR context**
   - Diff against `main` to understand the full scope of changes
   - Capture before/after screenshots for any visual or UI change
3. **Write the description**
   - Fill out every section of `.github/pull_request_template.md`
   - Write the title as `[<issue #>] <short imperative summary>`
     (e.g. `[42] Add dark mode color tokens`). If the work does not fix or
     relate to an issue, use `[No Issue]` instead (e.g.
     `[No Issue] Add dark mode color tokens`)
   - In the **Related** section, link the issue this PR fixes with a closing
     keyword when applicable (e.g. `Closes #42`). Omit if there is no issue
   - Delete template checklist items that don't apply; check the ones that do
   - Flag breaking changes and include a migration path for consumers
   - Link the relevant milestone (e.g. "Token System")
4. **Create the PR**
   - Use `gh pr create` with the body populated from the template
   - Add appropriate labels and assign reviewers
   - Return the PR URL

## Branch naming

- **With an issue:** `joshbowdenconcepts/Issue<N>-<slug>`
- **Without an issue:** `joshbowdenconcepts/<slug>`
- **Slug:** lowercase the title/summary, drop parenthetical segments, replace
  non-alphanumeric runs with a single hyphen, collapse/trim hyphens, truncate to
  ~50 chars at a word boundary. If the branch exists, append `-2`, `-3`, etc.
- Example: `#5 Add dark mode color tokens` →
  `joshbowdenconcepts/Issue5-add-dark-mode-color-tokens`

## Template

The canonical PR body lives in `.github/pull_request_template.md`. Always base
the PR description on that file so GitHub and this command stay in sync. Key
sections to complete:

- **Summary** — the "why" in 1-3 sentences
- **Type of change** — feature / fix / refactor / style / build / docs / chore
- **Changes** — bulleted list of what changed
- **Testing** — Jest, lint/format, cross-breakpoint, manual
- **Changeset** — confirm one is added (or docs-only)
- **Screenshots / recordings** — required for visual changes (before/after)
- **Related** — linked issues/milestones
