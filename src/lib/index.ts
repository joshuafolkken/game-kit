export { default as ControlsScene } from './game-kit/controls/ControlsScene.svelte'
export { default as FloorCredits } from './game-kit/scene/FloorCredits.svelte'
export { default as FpsDisplay } from './game-kit/display/FpsDisplay.svelte'
export { default as GameScene } from './game-kit/GameScene.svelte'
export { default as JumpIcon } from './game-kit/controls/JumpIcon.svelte'
export { default as KeyboardDiagram } from './game-kit/controls/KeyboardDiagram.svelte'
export { default as MouseDiagram } from './game-kit/controls/MouseDiagram.svelte'
export { default as Room } from './game-kit/scene/Room.svelte'
export { default as SceneObjects } from './game-kit/scene/SceneObjects.svelte'
export { default as ScoreDisplay } from './game-kit/display/ScoreDisplay.svelte'
export { default as Switch } from './game-kit/switch/Switch.svelte'
export { default as TouchDiagram } from './game-kit/controls/TouchDiagram.svelte'
export { default as VirtualJoystick } from './game-kit/controls/VirtualJoystick.svelte'
export { default as Player } from './game-kit/player/Player.svelte'

export { session, create_session, type SessionInstance } from './game-kit/session.svelte'
export { game_state, create_game_state, type GameStateInstance } from './game-kit/state.svelte'
export { input, create_input, type InputInstance } from './game-kit/input/input.svelte'
export {
	loading,
	create_loading,
	MIN_DISPLAY_MS,
	OVERLAY_ELEMENT_ID,
	OVERLAY_HIDDEN_CLASS,
	OBSERVER_GLOBAL_KEY,
	type DefaultLoadingStep,
	type LoadingInstance,
} from './game-kit/loading.svelte'
export {
	fullscreen,
	create_fullscreen,
	type FullscreenInstance,
} from './game-kit/fullscreen.svelte'
export { fps, create_fps, type FpsInstance } from './game-kit/display/fps.svelte'
export { crt, create_crt, type CrtInstance } from './game-kit/crt.svelte'
export { device, create_device, type DeviceInstance } from './game-kit/device.svelte'

export { camera_shake } from './game-kit/player/camera-shake.svelte'
export { player_bounds } from './game-kit/player/player-bounds'
export { player_jump } from './game-kit/player/player-jump'
export { player_speed } from './game-kit/player/player-speed'
export { player_step } from './game-kit/player/player-step'
export { player_velocity } from './game-kit/player/player-velocity'

export { alt_switch_input } from './game-kit/switch/alt-switch-input'
export { crt_switch_input } from './game-kit/switch/crt-switch-input'
export { fps_switch_input } from './game-kit/switch/fps-switch-input'
export { fullscreen_switch_input } from './game-kit/switch/fullscreen-switch-input'

export { audio } from './game-kit/audio'
export { switch_audio } from './game-kit/switch/switch-audio'
export { fonts } from './game-kit/fonts'
export { lighting } from './game-kit/scene/lighting'

export { credits_scroll } from './game-kit/scene/credits-config'
export { HALF_D, HALF_W, ROOM_D, ROOM_H, ROOM_W } from './game-kit/scene/room-config'
export { pointer_button } from './game-kit/input/pointer-button'

export { type ScoreData } from './game-kit/display/score-display-types'
export { type SceneObjectsMessages } from './game-kit/scene/scene-objects-messages'
export {
	type SwitchColors,
	type ResolvedSwitchColors,
	CRT_SWITCH_COLORS,
	CYBER_SWITCH_COLORS,
	FPS_SWITCH_COLORS,
	FULLSCREEN_SWITCH_COLORS,
	resolve_switch_colors,
} from './game-kit/switch/switch-colors'
export {
	type SwitchIconType,
	type SwitchGeometry,
	SWITCH_ICON_TYPES,
	DEFAULT_SWITCH_GEOMETRY,
} from './game-kit/switch/switch-config'

export { base_messages } from './messages/en'
