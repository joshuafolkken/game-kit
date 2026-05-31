# @joshuafolkken/game-kit

Svelte + [Threlte](https://threlte.xyz/) component library and CLI scaffold for building 3D mini-games.

- **`jgame` CLI** — scaffold a new SvelteKit + Threlte game project from a working template.
- **Library exports** — drop-in scenes, player, controls, switches, and reactive state primitives for use inside any SvelteKit app.

## Prerequisites

- [Node.js](https://nodejs.org/) with [pnpm](https://pnpm.io/) ≥ 11
- [gh CLI](https://cli.github.com/) — required for GitHub Packages authentication. Install via `brew install gh` (macOS), `winget install GitHub.cli` (Windows), or see the [gh installation docs](https://github.com/cli/cli#installation).

## Quick start

```bash
gh auth login --scopes read:packages   # see docs/authentication.md for the full setup
pnpm add -g @joshuafolkken/game-kit
jgame init my-game
cd my-game && pnpm dev                  # open http://localhost:5173
```

## Documentation

| Guide                                           | What it covers                                                                               |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [authentication.md](./docs/authentication.md)   | One-time GitHub Packages auth — `gh` token, `NODE_AUTH_TOKEN`, `.npmrc`                      |
| [install.md](./docs/install.md)                 | Scaffold a new game project with `jgame init`                                                |
| [library.md](./docs/library.md)                 | Use `@joshuafolkken/game-kit` as a library in an existing project, with the full export list |
| [troubleshooting.md](./docs/troubleshooting.md) | Fixes for `401`/`404` auth errors, `jgame: command not found`, and other common failures     |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the development workflow and coding conventions. Community standards live in [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md); security reports go through [SECURITY.md](./SECURITY.md).

## License

MIT
