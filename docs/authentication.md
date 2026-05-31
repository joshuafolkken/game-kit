# Authenticate with GitHub Packages

`@joshuafolkken/game-kit` is published to GitHub Packages, which requires authentication **even for public packages**. Both [install.md](./install.md) (scaffolding with `jgame`) and [library.md](./library.md) (using the kit as a dependency) link here for this one-time setup.

## 1. Get a token from the `gh` CLI

The token comes from the [gh CLI](https://cli.github.com/). If you haven't already:

```bash
gh auth login --scopes read:packages
```

Persist `NODE_AUTH_TOKEN` so every shell session picks up a fresh token automatically. The following snippet is idempotent — re-running it does not duplicate the line:

```bash
LINE='export NODE_AUTH_TOKEN=$(gh auth token)'
grep -qxF "$LINE" ~/.zshrc 2>/dev/null || echo "$LINE" >> ~/.zshrc
exec $SHELL
```

Single quotes around `$LINE` keep `$(gh auth token)` literal, so the token is re-evaluated on each shell startup and gh's rotation is picked up automatically.

> Using bash instead of zsh? Swap `~/.zshrc` for `~/.bashrc`.

## 2. Configure `.npmrc`

Tell `pnpm` to resolve `@joshuafolkken/*` against GitHub Packages with the token from §1. The snippet is idempotent:

```bash
REGISTRY='@joshuafolkken:registry=https://npm.pkg.github.com'
TOKEN='//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}'
grep -qxF "$REGISTRY" .npmrc 2>/dev/null || echo "$REGISTRY" >> .npmrc
grep -qxF "$TOKEN"    .npmrc 2>/dev/null || echo "$TOKEN"    >> .npmrc
```

`${NODE_AUTH_TOKEN}` is intentionally written as a literal placeholder — `pnpm` expands it from the env var at install time (which is why §1 must come first). Without this, `pnpm` tries the public npm registry for `@joshuafolkken/*` and fails.

### Where to write `.npmrc` — project vs. global

| Use case                                                         | Target     | Commit it?                                                                                                                                                                  |
| ---------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Library in a shared project** (per [library.md](./library.md)) | `./.npmrc` | **Yes.** It contains only a literal placeholder, no secret — committing unlocks `pnpm install` for the whole team and CI, each of which supplies its own `NODE_AUTH_TOKEN`. |
| **Scoped to your machine only**                                  | `~/.npmrc` | N/A (lives in your home dir)                                                                                                                                                |

The command above writes to `./.npmrc`. To make it machine-global instead, swap `.npmrc` for `~/.npmrc` in both `grep`/`echo` lines.

## Next

- Scaffolding a new game? Return to [install.md §2](./install.md#2-install-jgame-globally).
- Adding the library to an existing project? Return to [library.md §2](./library.md#2-install).
- Hitting `401`/`403` or `ERR_PNPM_FETCH`? See [troubleshooting.md](./troubleshooting.md).
