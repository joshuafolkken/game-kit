# Scaffold a new game project

Create a new SvelteKit + Threlte game from the `@joshuafolkken/game-kit` template.

## 1. Authenticate with GitHub Packages

`@joshuafolkken/game-kit` lives on GitHub Packages, which needs auth even for public packages. Follow the one-time setup in **[authentication.md](./authentication.md)** (get a `gh` token → persist `NODE_AUTH_TOKEN` → configure `.npmrc`), then return here.

For a global `jgame` install, write the `.npmrc` to your home directory (`~/.npmrc`) as described in that guide.

## 2. Install `jgame` globally

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

## 3. Scaffold

```bash
jgame init my-game
```

Replace `my-game` with your game name. Input is normalized to kebab-case automatically.

This copies the template into `./my-game/`, runs `pnpm install`, and syncs managed config files.

## 4. Develop

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

| Subcommand                           | Description                                                                                                       |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `jgame init <name>`                  | Scaffold a new game project                                                                                       |
| `jgame sync`                         | Sync managed config files from the latest published kit                                                           |
| `jgame version` (`jgame v`)          | Show the global, project (node_modules), latest published, and running versions                                   |
| `jgame version:upgrade` (`jgame vu`) | Upgrade whichever of the global / project install is behind latest (repairs the lockfile after a project upgrade) |

### tsconfig normalization on `jgame sync`

`jgame sync` keeps your project's `tsconfig.json` lean. It delegates to the underlying
`josh sync`, which ensures the kit base preset is in `extends` and then strips every
`compilerOptions` key whose value already equals that base — so per-project drift does
not accumulate. Genuine overrides (a value that differs from the base, e.g.
`"noEmitOnError": false`), project-specific keys, and `include` / `exclude` are always
preserved. Game projects extend the kit base preset directly, so the redundancy check
runs against that base.
