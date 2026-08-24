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

- Re-run §2 of [authentication.md](./authentication.md) in the right location (project root for a dependency, `~/.npmrc` for a global `josh-game` install).
- Confirm the file contains both lines:
  ```ini
  @joshuafolkken:registry=https://npm.pkg.github.com
  //npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
  ```
- A project `.npmrc` shadows `~/.npmrc`. If you have both, make sure the project one also carries the scoped registry line.

## `josh-game: command not found` after `pnpm add -g`

The pnpm global bin directory isn't on your `PATH`.

```bash
pnpm setup
exec $SHELL
which josh-game   # should now print a path
```

`pnpm setup` registers `PNPM_HOME` and appends it to `PATH` via your shell rc. If `which josh-game` is still empty, open a new terminal so the updated `PATH` takes effect.

## `josh-game init` fails on `pnpm install`

`josh-game init` copies the template, then runs `pnpm install` inside it. If that install step hits a `401`/`404`, it's the same auth issue above — the new project needs `NODE_AUTH_TOKEN` and a scoped `.npmrc` too. `josh-game init` writes a project `.npmrc`, so usually only the env var is missing. Fix the token, then from inside the generated project:

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

## `josh-game sync` reports config drift

`josh-game sync` overwrites managed config files (e.g. `playwright.config.ts`, CI workflow, `eslint.config.js`) with the latest published versions. The synced `eslint.config.js` relaxes a few lint rules for `src/lib/game/**` (game/Three.js/Web-Audio code legitimately uses `null` contracts, definition-site exports, and longer/branchier functions); the rest of the app keeps the strict defaults. If you intentionally customized one of these files, your change will be reverted. Keep local-only config in files **not** managed by the kit, or re-apply the change after syncing.

### Files that preserve your customizations

Some managed files are designed for you to extend, so `josh-game sync` never silently reverts them:

- **`project-words.txt`** — your project-specific cspell words (game nouns, character names) live here, not in `cspell.config.yaml`. The synced `cspell.config.yaml` references it as a dictionary, so it can be refreshed every bump while your words persist. A legacy inline `words:` list is migrated into `project-words.txt` automatically on the next sync.
- **`cspell.project.yaml`** — your project-specific cspell `ignorePaths` (e.g. generated/binary files that aren't natural-language text) live here, not in `cspell.config.yaml`. The synced `cspell.config.yaml` imports it, and cspell unions the ignore paths, so it can be refreshed every bump while your ignore entries persist. A legacy inline `ignorePaths:` list is migrated into `cspell.project.yaml` automatically on the next sync.
- **Free-form files (e.g. `src/routes/layout.css`)** — these are **3-way merged**, so an edited file keeps receiving baseline updates instead of freezing. `josh-game sync` records the baseline it shipped under `.josh-game/baselines/`, and on the next sync it merges that base, the new baseline and your edits with `git merge-file`:
  - **Clean merge** — the baseline update is applied and your edits are kept (`✔ merged`).
  - **Conflict** — the file is written with the usual `<<<<<<<` / `|||||||` / `>>>>>>>` markers naming `ours` / `base` / `theirs`, and the sync reports `⚠ conflict`. **Resolve them in place**, as you would any merge conflict — the baseline records the update as delivered, so reverting the file instead (`git checkout -- …`) discards a merge that will not be re-offered. Run `josh-game sync --force` to start over from the shipped baseline. A sync that finds markers still unresolved refuses to merge on top of them.
  - **Nothing to merge** — your file differs from the baseline only by your own edits, and the baseline is already applied. The sync reports `✔ checked … (local changes; baseline already applied)` and does nothing. This is the steady state of a customized project, and it deliberately does **not** suggest `--force`: there is no update to take, so forcing would only discard your edits.
  - **No baseline to merge from, or no `git` available** — the file is **skipped with a notice naming which case applies**: no base recorded yet, a recorded base that is empty or unreadable, or `git merge-file` unavailable. A baseline is recorded whenever your file matches the one game-kit ships, so a project that is in sync is merge-ready from the next update onward. A file already edited before this feature existed has no base that can be reconstructed after the fact; `josh-game sync --force` establishes one (re-apply your edits afterwards).
  - Run `josh-game sync --force` at any time to deliberately discard your edits and take the pristine baseline.

  A conflicted merge makes `josh-game sync` **exit non-zero** — the project does not build with markers in it, so a scripted upgrade must not record that run as a success.

  **Commit `.josh-game/baselines/`.** It is the merge base: gitignored, it would be missing after a fresh clone and every sync would fall back to skip-with-notice. The files are stored with a `.baseline` extension so formatters leave the recorded bytes untouched.

- **CRT/RETRO initial mode** — start with the effect off via the `crt_initial="off"` prop on `<GameScene>` in your own `+page.svelte`, instead of editing the synced `src/routes/+layout.svelte` shell.

## Still stuck?

- Re-read [authentication.md](./authentication.md) end to end — the ordering (token → env var → `.npmrc`) matters.
- Check installed vs. latest version: `josh-game version`.
- Open an issue: <https://github.com/joshuafolkken/game-kit/issues>.
