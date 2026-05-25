# Scaffold a new game project

Create a new SvelteKit + Threlte game from the `@joshuafolkken/game-kit` template.

## 1. Authenticate

GitHub Packages requires auth even for public packages. The token comes from the [gh CLI](https://cli.github.com/); if you haven't already, run `gh auth login --scopes read:packages`.

Persist `NODE_AUTH_TOKEN` so every shell session picks up a fresh token automatically. Add the following line to `~/.zshrc`:

```bash
export NODE_AUTH_TOKEN=$(gh auth token)
```

Then reload:

```bash
exec $SHELL
```

The token is re-evaluated on each shell startup, so gh's token rotation is picked up automatically.

## 2. Configure `.npmrc`

Add both lines to your user-level `~/.npmrc` (or to a project-level `.npmrc` if you prefer not to set this globally):

```ini
@joshuafolkken:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

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

| Subcommand          | Description                                             |
| ------------------- | ------------------------------------------------------- |
| `jgame init <name>` | Scaffold a new game project                             |
| `jgame sync`        | Sync managed config files from the latest published kit |
