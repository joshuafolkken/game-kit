# Scaffold a new game project

Create a new SvelteKit + Threlte game from the `@joshuafolkken/game-kit` template.

## 1. Authenticate with GitHub Packages

`@joshuafolkken/game-kit` lives on GitHub Packages, which needs auth even for public packages. Follow the one-time setup in **[authentication.md](./authentication.md)** (get a `gh` token → persist `NODE_AUTH_TOKEN` → configure `.npmrc`), then return here.

For a global `josh-game` install, write the `.npmrc` to your home directory (`~/.npmrc`) as described in that guide.

## 2. Install `josh-game` globally

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

This installs the `josh-game` binary into your pnpm global bin directory. Verify with `which josh-game`.

Update later with:

```bash
pnpm remove -g @joshuafolkken/game-kit; pnpm add -g @joshuafolkken/game-kit
```

The removal is not optional. `@joshuafolkken/app-kit` (and `@joshuafolkken/kit` behind it) ride along as auto-installed peers, and pnpm resolves them once into the global install's own lockfile. Upgrading in place therefore bumps `@joshuafolkken/game-kit` alone and leaves both upstreams on whatever version they were first pinned at; only a fresh global root re-resolves the whole chain. From inside a game project, `josh-game v` reports the versions actually in effect and `josh-game vu` prints this same command.

## 3. Scaffold

```bash
josh-game init my-game
```

Replace `my-game` with your game name. Input is normalized to kebab-case automatically.

This copies the template into `./my-game/`, runs `pnpm install`, and syncs managed config files.

## 4. Develop

```bash
cd my-game
pnpm dev
```

Open the URL `pnpm dev` prints — http://localhost:5173 unless a personal `PORT_SEED` in `.env` shifts it (`5173 + PORT_SEED`, so several kit projects can run at once).

To publish the project to a private GitHub repo right away:

```bash
gh repo create my-game --private --source=. --push
```

## Other commands

The `josh-game` binary exposes:

| Subcommand                                   | Description                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `josh-game init <name>`                      | Scaffold a new game project                                                                                                                                                                                                                                                                                                                             |
| `josh-game sync`                             | Sync managed config files from the latest published kit                                                                                                                                                                                                                                                                                                 |
| `josh-game version` (`josh-game v`)          | Show the global, project (node_modules), latest published, and running versions, plus the upstream `@joshuafolkken/app-kit` and `@joshuafolkken/kit` versions — project, latest, and the effective global (running-relative) version the invoked `josh-game` actually runs, each with a staleness marker                                                |
| `josh-game version:upgrade` (`josh-game vu`) | Upgrade whichever of the global / project install is behind latest (repairs the lockfile after a project upgrade), upgrade stale `@joshuafolkken/app-kit` / `@joshuafolkken/kit` project dependencies, and when a stale effective global upstream is detected, upgrade the global `@joshuafolkken/game-kit` (which re-bundles the whole upstream chain) |

### tsconfig normalization on `josh-game sync`

`josh-game sync` keeps your project's `tsconfig.json` lean. It delegates to the underlying
`josh sync`, which ensures the kit base preset is in `extends` and then strips every
`compilerOptions` key whose value already equals that base — so per-project drift does
not accumulate. Genuine overrides (a value that differs from the base, e.g.
`"noEmitOnError": false`), project-specific keys, and `include` / `exclude` are always
preserved. Game projects extend the kit base preset directly, so the redundancy check
runs against that base.
