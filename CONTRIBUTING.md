# Contributing to game-kit

Thanks for your interest in improving `@joshuafolkken/game-kit`! This guide covers the local setup, the conventions the codebase enforces, and the checks your change must pass.

By participating you agree to abide by the [Code of Conduct](./CODE_OF_CONDUCT.md). For security issues, follow [SECURITY.md](./SECURITY.md) instead of opening a public issue.

## Prerequisites

- [Node.js](https://nodejs.org/) with [pnpm](https://pnpm.io/) ≥ 11
- [gh CLI](https://cli.github.com/), authenticated for GitHub Packages — see [docs/authentication.md](./docs/authentication.md)

## Local setup

```bash
gh repo fork joshuafolkken/game-kit --clone
cd game-kit
pnpm install
pnpm dev          # dev server at http://localhost:5173
```

The repository ships a complete reference game (a Simon-style memory game) under [`templates/`](./templates/), built on every library export. Running the dev server exercises it.

## Coding conventions

This project uses **non-standard conventions enforced by ESLint** — match them or lint will fail:

- **Naming**: variables / functions / params are `snake_case`; types / classes / interfaces / enums are `PascalCase`; booleans are prefixed `is_` / `has_` / `should_` / `can_` / `will_` / `did_`; constants are `UPPER_CASE`.
- **Functions**: use `function` syntax, not arrow functions. Group multiple functions in a file into a namespace object and `export { my_module }`. No `export default`.
- **Files**: Svelte components are `PascalCase.svelte` / `PascalCase.svelte.ts`; TypeScript files are `kebab-case.ts`.
- **Quality limits**: function complexity ≤ 5, nesting ≤ 2, function ≤ 25 lines, file ≤ 300 lines, params ≤ 4. Extract magic numbers (everything except `0`, `1`, `-1`) to named `UPPER_CASE` constants.
- **No** `any`, no unused vars, no floating promises; all params and return types must be explicitly typed.
- **i18n**: every user-visible string must use a message key — never hardcode. Add new keys to all locale message files.
- **English only** in comments and test titles.

The authoritative, always-current rule set lives in [`CLAUDE.md`](./CLAUDE.md) (mirrored in [`AGENTS.md`](./AGENTS.md) and [`GEMINI.md`](./GEMINI.md)). If you use an AI assistant, point it at the file for your tool.

## Tests are required

**Every code change needs a test** — bug fixes, refactors, and timing/animation fixes included. Before writing implementation code, declare each change and the test that verifies it:

- Bug fix → a regression test that would have caught the bug
- Logic / utility change → a unit test (Vitest)
- UI / animation / timing change → an E2E test (Playwright) for the observable behavior

Docs-only or non-runtime config changes are exempt.

## Verification gate

Run these in order before opening a PR; fix everything before reporting done:

```bash
pnpm josh lint        # ESLint
pnpm exec tsc --noEmit # type check
pnpm josh cspell:dot  # spell check (add real project terms to cspell.config.yaml)
pnpm josh test:unit   # unit tests
pnpm josh test        # E2E (Playwright)
```

Do not edit `eslint.config.js` to silence a rule — fix the underlying code instead.

## Submitting a pull request

1. Branch off `main`.
2. Make your change with its test(s); keep commits focused.
3. Run the full verification gate above.
4. Open a PR against `main` with a clear description of what changed and why. Link any related issue (`closes #N`).

Maintainers self-review every diff before merge. Keeping your change small and well-tested gets it merged faster.
