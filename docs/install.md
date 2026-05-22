# Scaffold a new game project

Create a new SvelteKit + Threlte game from the `@joshuafolkken/game-kit` template.

## 1. Authenticate

GitHub Packages requires auth even for public packages.

**bash / zsh (macOS, Linux):**

```bash
export NODE_AUTH_TOKEN=$(gh auth token)
```

**PowerShell (Windows):**

```powershell
$env:NODE_AUTH_TOKEN = (gh auth token)
```

If you get a 401, run `gh auth login --scopes read:packages`.

## 2. Configure `.npmrc`

Add both lines to your user-level `~/.npmrc` (or to a project-level `.npmrc` if you prefer not to set this globally):

```ini
@joshuafolkken:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Without this, `pnpm` will try the public npm registry for `@joshuafolkken/*` packages and fail.

## 3. Scaffold

```bash
pnpm dlx @joshuafolkken/game-kit init my-game
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

## Optional: install `jgame` locally

To call `jgame` directly without `pnpm dlx`:

```bash
pnpm dlx @joshuafolkken/game-kit install
```

Installs a `jgame` wrapper into `~/.local/bin/jgame`. Make sure `~/.local/bin` is in your `PATH`.

## Other commands

After installing, the `jgame` binary exposes:

| Subcommand                | Description                                             |
| ------------------------- | ------------------------------------------------------- |
| `jgame init <name>`       | Scaffold a new game project                             |
| `jgame sync`              | Sync managed config files from the latest published kit |
| `jgame install [--force]` | Install the `jgame` wrapper into `~/.local/bin`         |

Pass `--force` to `jgame install` to overwrite an existing file at the target path.
