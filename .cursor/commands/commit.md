# Create Commit

## Overview

Create a short, focused, conventional commit for **front-end / design-system**
work and commit the staged changes.

## Steps

1. **Review changes**
   - Check the diff: `git diff --cached` (staged) or `git diff` (unstaged)
   - Understand what changed and why
2. **Determine issue reference (optional)**
   - Check the branch name and chat context for a GitHub issue (e.g. `#42`)
   - Branches follow `joshbowdenconcepts/Issue<N>-<slug>`, so derive `#<N>` from
     the branch name when present
   - If one isn't already available, optionally ask whether to include it
   - This is optional — commits can be made without an issue reference
3. **Stage changes (if not already staged)**
   - `git add -A`
4. **Write the commit message**
   - Base it on the actual changes in the diff, describing the "why"
   - Example: `git commit -m "fix(tokens): handle missing dark mode value"`
   - With issue: `git commit -m "fix(tokens): handle missing dark mode value (#42)"`

## Template

The commit follows Conventional Commits so history stays consistent with the
`/pr` flow and changesets. Format:

- `git commit -m "<type>(<scope>): <short summary>"`
- With issue: `git commit -m "<type>(<scope>): <short summary> (#<issue>)"`

Common `<type>` values (mirror the PR "Type of change"): `feat`, `fix`,
`refactor`, `style`, `build`, `docs`, `chore`.

## Rules

- **Length** — subject line <= 72 characters
- **Imperative mood** — "fix", "add", "update" (not "fixed", "added")
- **Capitalize** — first letter of the summary
- **No period** — don't end the subject line with a period
- **Describe why** — not just what; "fix stuff" is meaningless
