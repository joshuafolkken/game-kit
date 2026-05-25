# Scaffold a new game project

Create a new SvelteKit + Threlte game from the `@joshuafolkken/game-kit` template.

## 1. Authenticate

GitHub Packages requires auth even for public packages. The token comes from the [gh CLI](https://cli.github.com/); if you haven't already, run `gh auth login --scopes read:packages`.

Persist `NODE_AUTH_TOKEN` so every shell session picks up a fresh token automatically. The following snippet is idempotent — re-running it does not duplicate the line:

```bash
LINE='export NODE_AUTH_TOKEN=$(gh auth token)'
grep -qxF "$LINE" ~/.zshrc 2>/dev/null || echo "$LINE" >> ~/.zshrc
exec $SHELL
```

Single quotes around `$LINE` keep `$(gh auth token)` literal, so the token is re-evaluated on each shell startup and gh's rotation is picked up automatically.

## 2. Configure `.npmrc`

Tell `pnpm` to resolve `@joshuafolkken/*` against GitHub Packages with the token from §1. The following snippet is idempotent:

```bash
REGISTRY='@joshuafolkken:registry=https://npm.pkg.github.com'
TOKEN='//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}'
grep -qxF "$REGISTRY" ~/.npmrc 2>/dev/null || echo "$REGISTRY" >> ~/.npmrc
grep -qxF "$TOKEN"    ~/.npmrc 2>/dev/null || echo "$TOKEN"    >> ~/.npmrc
```

`${NODE_AUTH_TOKEN}` is intentionally written as a literal placeholder — `pnpm` expands it from the env var at install time (which is why §1 must come first). To scope this to a single project, swap `~/.npmrc` for `./.npmrc`.

Without this, `pnpm` will try the public npm registry for `@joshuafolkken/*` packages and fail.

## 3. Install `jgame` globally

### One-time pnpm setup

pnpm requires a one-time setup before any global install — it registers `PNPM_HOME` and appends it to your `PATH` via your shell rc file:

```bash
pnpm setup
exec $SHELL
```

If `pnpm setup` reports it is already configured, you can skip this step.

### Install

```bash
pnpm add -g @joshuafolkken/game-kit
```

This installs the `jgame` binary into your pnpm global bin directory. Verify with `which jgame`.

Update later with:

```bash
pnpm up -g @joshuafolkken/game-kit
```

## 4. Scaffold

```bash
jgame init my-game
```

Replace `my-game` with your game name. Input is normalized to kebab-case automatically.

This copies the template into `./my-game/`, runs `pnpm install`, and syncs managed config files.

## 5. Develop

```bash
cd my-game
pnpm dev
```

Open http://localhost:5173.

To publish the project to a private GitHub repo right away:

```bash
gh repo create my-game --private --source=. --push
```

## Other commands

The `jgame` binary exposes:

| Subcommand                           | Description                                             |
| ------------------------------------ | ------------------------------------------------------- |
| `jgame init <name>`                  | Scaffold a new game project                             |
| `jgame sync`                         | Sync managed config files from the latest published kit |
| `jgame version` (`jgame v`)          | Show installed and latest published versions            |
| `jgame version:upgrade` (`jgame vu`) | Upgrade `@joshuafolkken/game-kit` to the latest version |
