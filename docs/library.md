# Library usage

Use `@joshuafolkken/game-kit` as a Svelte component library inside an existing SvelteKit + Threlte project.

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

Add both lines:

```ini
@joshuafolkken:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

## 3. Install

```bash
pnpm add @joshuafolkken/game-kit
```

## 4. Use

`GameScene` wraps the Threlte canvas, controls overlay, and lifecycle. Its `children` snippet receives 3D components (Threlte primitives plus the kit's `Room`, `Player`, etc.) rendered inside the canvas as siblings — not as parent / child of each other.

```svelte
<script lang="ts">
	import { device, GameScene, Player, Room } from '@joshuafolkken/game-kit'

	const hint_text = device.is_touch_primary ? 'Tap to start' : 'Click to start'
</script>

<GameScene {hint_text}>
	<Room />
	<Player />
</GameScene>
```

For a full game (score display, credits, gameover overlay, switches), use `SceneObjects` and provide your game board via the `game_board` snippet. See [`templates/src/lib/simon/SimonScene.svelte`](../templates/src/lib/simon/SimonScene.svelte) for a complete reference.

## Exports

### Scene components

| Export         | Purpose                                               |
| -------------- | ----------------------------------------------------- |
| `GameScene`    | Root scene container with canvas, controls, lifecycle |
| `Room`         | 3D room boundary                                      |
| `SceneObjects` | Helper for placing interactive objects                |
| `FloorCredits` | In-scene scrolling credits                            |

### Player & controls

| Export                                            | Purpose                               |
| ------------------------------------------------- | ------------------------------------- |
| `Player`                                          | First-person player with input wiring |
| `ControlsScene`                                   | On-screen controls overlay            |
| `KeyboardDiagram`, `MouseDiagram`, `TouchDiagram` | Per-input-mode hint diagrams          |
| `VirtualJoystick`, `JumpIcon`                     | Touch UI primitives                   |

### Display & UI

| Export         | Purpose                            |
| -------------- | ---------------------------------- |
| `FpsDisplay`   | Frame-rate overlay                 |
| `ScoreDisplay` | Score counter                      |
| `Switch`       | Toggle / interactive switch object |

### Reactive state primitives

| Export                             | Purpose                                                 |
| ---------------------------------- | ------------------------------------------------------- |
| `session` / `create_session`       | Per-session state (start, end, paused)                  |
| `game_state` / `create_game_state` | Generic game state container                            |
| `input` / `create_input`           | Unified pointer + keyboard + touch input                |
| `loading` / `create_loading`       | Asset / scene loading orchestration                     |
| `fullscreen` / `create_fullscreen` | Fullscreen toggle helper                                |
| `fps` / `create_fps`               | Frame-rate measurement                                  |
| `crt` / `create_crt`               | CRT post-processing toggle                              |
| `device` / `create_device`         | Reactive device capability detection (touch vs desktop) |

### Player helpers

`camera_shake`, `player_bounds`, `player_jump`, `player_speed`, `player_step`, `player_velocity`.

### Switch inputs & configuration

Pre-wired switch inputs: `alt_switch_input`, `crt_switch_input`, `fps_switch_input`, `fullscreen_switch_input`.

Switch styling: `SwitchColors`, `ResolvedSwitchColors`, `CRT_SWITCH_COLORS`, `CYBER_SWITCH_COLORS`, `FPS_SWITCH_COLORS`, `FULLSCREEN_SWITCH_COLORS`, `resolve_switch_colors`.

Switch geometry: `SwitchIconType`, `SwitchGeometry`, `SWITCH_ICON_TYPES`, `DEFAULT_SWITCH_GEOMETRY`.

### Scene constants

| Export                                           | Purpose                      |
| ------------------------------------------------ | ---------------------------- |
| `HALF_D`, `HALF_W`, `ROOM_D`, `ROOM_H`, `ROOM_W` | Room dimension constants     |
| `credits_scroll`                                 | Credits scroll configuration |

### Audio, fonts, lighting

`audio`, `switch_audio`, `fonts`, `lighting`.

### Input helpers

`pointer_button` — pointer button constants.

### Types

`SessionInstance`, `GameStateInstance`, `InputInstance`, `LoadingInstance`, `DefaultLoadingStep`, `FullscreenInstance`, `FpsInstance`, `CrtInstance`, `DeviceInstance`, `ScoreData`, `SceneObjectsMessages`.

### Messages

`base_messages` — default English string table that consumer games can extend.

## Reference implementation

The [`templates/`](../templates/) directory in this repository contains a complete working game (Simon) built on every export above. After running [`jgame init`](./install.md), your project starts from a copy of that template.

See [`src/lib/index.ts`](../src/lib/index.ts) for the canonical, always-up-to-date export list.
