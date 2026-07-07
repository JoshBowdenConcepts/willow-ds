# Build Issue

## Overview

Take a GitHub issue (the number provided after the command, e.g.
`/build-issue 5`), pull its full context from GitHub, and produce an
implementation plan for **front-end / design-system** work before writing any
code. On approval, implement, commit (via `/commit`), and open a PR (via `/pr`).

**Input:** an issue number (e.g. `5` or `#5`).
**Repository:** resolve from `git remote get-url origin`
(fallback: `JoshBowdenConcepts/willow-ds`).

## Steps

1. **Fetch issue context**
   - `gh issue view <N> --repo <owner>/<repo> --json number,title,body,state,labels,assignees`
   - Read comments when the body references prior discussion:
     `gh issue view <N> --repo <owner>/<repo> --comments`
   - Fallback if `gh` fails: GitHub MCP `issue_read` (`method: get`, `get_comments`)
2. **Check gates — stop and ask before planning**
   - Issue is `CLOSED` → ask whether to proceed
   - Body contains `Blocked by: #X` → surface the blocker; ask whether to continue
   - Requirements unclear → ask 1–2 targeted questions before planning
3. **Read project context**
   - `.cursor/rules/token-system.mdc` (token prefix, build pipeline, scope model)
   - Any files/areas the issue points at
4. **Create the plan (mandatory stop)**
   - Switch to Plan mode
   - Summary tied to the issue's acceptance criteria
   - Concrete file paths and essential snippets
   - Implementation todos
   - Deliverables: branch name, PR title, test/verify commands, whether a
     changeset is needed
   - **Do not edit files, commit, or create branches until the plan is approved**
5. **Implement (after approval)**
   - Switch to Agent mode
   - Create a branch from `origin/main`:
     `git fetch origin main && git checkout -b "<branch>" origin/main`
   - Implement per the approved plan; respect token/scope conventions
   - Add a changeset if required (`pnpm changeset`) for any non-docs change
   - Run verification (tests, lint, format) and fix failures
6. **Commit and open the PR**
   - Commit using the `/commit` conventions; reference the issue in the body
     with `Refs #<N>`
   - Open the PR using the `/pr` command and `.github/pull_request_template.md`
   - Title: `[<N>] <short imperative summary>`
   - Put `Closes #<N>` in the PR **Related** section (auto-closes on merge)
   - Return the PR URL

## Branch naming

- **Format:** `joshbowdenconcepts/Issue<N>-<slug>`
- **Slug:** lowercase the issue title, drop parenthetical segments, replace
  non-alphanumeric runs with a single hyphen, collapse/trim hyphens, truncate to
  ~50 chars at a word boundary. If the branch exists, append `-2`, `-3`, etc.
- Example: `#5 Add dark mode color tokens` →
  `joshbowdenconcepts/Issue5-add-dark-mode-color-tokens`

## Rules

- **Never skip the plan gate** — planning happens before any file edits
- **Never close the issue directly** — closure happens on PR merge via `Closes #<N>`
- **Requires** an authenticated `gh` CLI and push access to the repo
- Keep the issue number consistent across branch, commits (`Refs #<N>`), PR
  title (`[<N>]`), and PR body (`Closes #<N>`)
