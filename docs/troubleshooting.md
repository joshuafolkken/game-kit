# Troubleshooting

Common errors when installing or using `@joshuafolkken/game-kit`, and how to fix them. Most install-time failures trace back to the [authentication setup](./authentication.md).

## `pnpm install` fails with `401 Unauthorized` / `403 Forbidden`

`pnpm` reached GitHub Packages but the token was missing or expired.

1. Confirm the env var is set in the current shell:
   ```bash
   echo $NODE_AUTH_TOKEN
   ```
   If it is empty, your shell rc hasn't run §1 of [authentication.md](./authentication.md) yet — open a new shell or run `exec $SHELL`.
2. The `gh` token may have expired or lost the `read:packages` scope. Refresh it:
   ```bash
   gh auth refresh --scopes read:packages
   exec $SHELL   # re-evaluates export NODE_AUTH_TOKEN=$(gh auth token)
   ```
3. Verify the token is live: `gh auth token` should print a non-empty value.

## `ERR_PNPM_FETCH_404` — package not found

`pnpm` tried the **public npm registry** instead of GitHub Packages. The scoped registry line is missing from `.npmrc`.

- Re-run §2 of [authentication.md](./authentication.md) in the right location (project root for a dependency, `~/.npmrc` for a global `jgame` install).
- Confirm the file contains both lines:
  ```ini
  @joshuafolkken:registry=https://npm.pkg.github.com
  //npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
  ```
- A project `.npmrc` shadows `~/.npmrc`. If you have both, make sure the project one also carries the scoped registry line.

## `jgame: command not found` after `pnpm add -g`

The pnpm global bin directory isn't on your `PATH`.

```bash
pnpm setup
exec $SHELL
which jgame   # should now print a path
```

`pnpm setup` registers `PNPM_HOME` and appends it to `PATH` via your shell rc. If `which jgame` is still empty, open a new terminal so the updated `PATH` takes effect.

## `jgame init` fails on `pnpm install`

`jgame init` copies the template, then runs `pnpm install` inside it. If that install step hits a `401`/`404`, it's the same auth issue above — the new project needs `NODE_AUTH_TOKEN` and a scoped `.npmrc` too. `jgame init` writes a project `.npmrc`, so usually only the env var is missing. Fix the token, then from inside the generated project:

```bash
cd my-game
pnpm install
```

## Wrong Node or pnpm version

The kit targets **pnpm ≥ 11** (see `devEngines` in `package.json`). Check:

```bash
node -v
pnpm -v
```

If pnpm is older than 11, upgrade with `pnpm self-update` (or via Corepack: `corepack prepare pnpm@latest --activate`).

## `jgame sync` reports config drift

`jgame sync` overwrites managed config files (e.g. `playwright.config.ts`, CI workflow, `eslint.config.js`) with the latest published versions. The synced `eslint.config.js` relaxes a few lint rules for `src/lib/game/**` (game/Three.js/Web-Audio code legitimately uses `null` contracts, definition-site exports, and longer/branchier functions); the rest of the app keeps the strict defaults. If you intentionally customized one of these files, your change will be reverted. Keep local-only config in files **not** managed by the kit, or re-apply the change after syncing.

## Still stuck?

- Re-read [authentication.md](./authentication.md) end to end — the ordering (token → env var → `.npmrc`) matters.
- Check installed vs. latest version: `jgame version`.
- Open an issue: <https://github.com/joshuafolkken/game-kit/issues>.
