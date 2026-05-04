export { default as ControlsOverlay } from './game/ControlsOverlay.svelte'
export { default as FloorCredits } from './game/FloorCredits.svelte'
export { default as FpsDisplay } from './game/FpsDisplay.svelte'
export { default as GameScene } from './game/GameScene.svelte'
export { default as JumpIcon } from './game/JumpIcon.svelte'
export { default as KeyboardDiagram } from './game/KeyboardDiagram.svelte'
export { default as MouseDiagram } from './game/MouseDiagram.svelte'
export { default as Room } from './game/Room.svelte'
export { default as SceneObjects } from './game/SceneObjects.svelte'
export { default as ScoreDisplay } from './game/ScoreDisplay.svelte'
export { default as Switch } from './game/Switch.svelte'
export { default as TouchDiagram } from './game/TouchDiagram.svelte'
export { default as VirtualJoystick } from './game/VirtualJoystick.svelte'
export { default as Player } from './game/player/Player.svelte'

export { session, create_session, type SessionInstance } from './game/session.svelte'
export { game_state, create_game_state, type GameStateInstance } from './game/state.svelte'
export { input, create_input, type InputInstance } from './game/input.svelte'
export {
	loading,
	create_loading,
	MIN_DISPLAY_MS,
	OVERLAY_ELEMENT_ID,
	OVERLAY_HIDDEN_CLASS,
	OBSERVER_GLOBAL_KEY,
	type DefaultLoadingStep,
	type LoadingInstance,
} from './game/loading.svelte'
export { fullscreen, create_fullscreen, type FullscreenInstance } from './game/fullscreen.svelte'
export { fps, create_fps, type FpsInstance } from './game/fps.svelte'
export { device, create_device, type DeviceInstance } from './game/device.svelte'

export { camera_shake } from './game/player/camera-shake.svelte'
export { player_bounds } from './game/player/player-bounds'
export { player_jump } from './game/player/player-jump'
export { player_speed } from './game/player/player-speed'
export { player_step } from './game/player/player-step'
export { player_velocity } from './game/player/player-velocity'

export { alt_switch_input } from './game/alt-switch-input'
export { fps_switch_input } from './game/fps-switch-input'
export { fullscreen_switch_input } from './game/fullscreen-switch-input'

export { audio } from './game/audio'
export { switch_audio } from './game/switch-audio'
export { fonts } from './game/fonts'
export { lighting } from './game/lighting'

export { credits_scroll } from './game/credits-config'

export { type ScoreData } from './game/score-display-types'
export { type SceneObjectsMessages } from './game/scene-objects-messages'
export {
	type SwitchColors,
	type ResolvedSwitchColors,
	CYBER_SWITCH_COLORS,
	FPS_SWITCH_COLORS,
	FULLSCREEN_SWITCH_COLORS,
	resolve_switch_colors,
} from './game/switch-colors'
export {
	type SwitchIconType,
	type SwitchGeometry,
	SWITCH_ICON_TYPES,
	DEFAULT_SWITCH_GEOMETRY,
} from './game/switch-config'

export { base_messages } from './messages/en'
