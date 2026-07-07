# Create PR

## Overview

Create a well-structured pull request for **front-end / design-system** work,
using the repo's PR template at `.github/pull_request_template.md`.

## Steps

1. **Prepare branch**
   - Ensure all changes are committed
   - Add a changeset if required (`pnpm changeset`) for any non-docs change
   - Ensure tests, lint, and format pass (`pnpm test`)
   - Push branch to remote and verify it's up to date with `main`
2. **Gather PR context**
   - Diff against `main` to understand the full scope of changes
   - Capture before/after screenshots for any visual or UI change
3. **Write the description**
   - Fill out every section of `.github/pull_request_template.md`
   - Write a title that is short and imperative (e.g. "Add dark mode color tokens")
   - Delete template checklist items that don't apply; check the ones that do
   - Flag breaking changes and include a migration path for consumers
   - Link related issues and the relevant milestone (e.g. "Token System")
4. **Create the PR**
   - Use `gh pr create` with the body populated from the template
   - Add appropriate labels and assign reviewers
   - Return the PR URL

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
