export { default as ControlsOverlay } from './game/controls/ControlsOverlay.svelte'
export { default as FloorCredits } from './game/scene/FloorCredits.svelte'
export { default as FpsDisplay } from './game/display/FpsDisplay.svelte'
export { default as GameScene } from './game/GameScene.svelte'
export { default as JumpIcon } from './game/controls/JumpIcon.svelte'
export { default as KeyboardDiagram } from './game/controls/KeyboardDiagram.svelte'
export { default as MouseDiagram } from './game/controls/MouseDiagram.svelte'
export { default as Room } from './game/scene/Room.svelte'
export { default as SceneObjects } from './game/scene/SceneObjects.svelte'
export { default as ScoreDisplay } from './game/display/ScoreDisplay.svelte'
export { default as Switch } from './game/switch/Switch.svelte'
export { default as TouchDiagram } from './game/controls/TouchDiagram.svelte'
export { default as VirtualJoystick } from './game/controls/VirtualJoystick.svelte'
export { default as Player } from './game/player/Player.svelte'

export { session, create_session, type SessionInstance } from './game/session.svelte'
export { game_state, create_game_state, type GameStateInstance } from './game/state.svelte'
export { input, create_input, type InputInstance } from './game/input/input.svelte'
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
export { fps, create_fps, type FpsInstance } from './game/display/fps.svelte'
export { device, create_device, type DeviceInstance } from './game/device.svelte'

export { camera_shake } from './game/player/camera-shake.svelte'
export { player_bounds } from './game/player/player-bounds'
export { player_jump } from './game/player/player-jump'
export { player_speed } from './game/player/player-speed'
export { player_step } from './game/player/player-step'
export { player_velocity } from './game/player/player-velocity'

export { alt_switch_input } from './game/switch/alt-switch-input'
export { fps_switch_input } from './game/switch/fps-switch-input'
export { fullscreen_switch_input } from './game/switch/fullscreen-switch-input'

export { audio } from './game/audio'
export { switch_audio } from './game/switch/switch-audio'
export { fonts } from './game/fonts'
export { lighting } from './game/scene/lighting'

export { credits_scroll } from './game/scene/credits-config'

export { type ScoreData } from './game/display/score-display-types'
export { type SceneObjectsMessages } from './game/scene/scene-objects-messages'
export {
	type SwitchColors,
	type ResolvedSwitchColors,
	CYBER_SWITCH_COLORS,
	FPS_SWITCH_COLORS,
	FULLSCREEN_SWITCH_COLORS,
	resolve_switch_colors,
} from './game/switch/switch-colors'
export {
	type SwitchIconType,
	type SwitchGeometry,
	SWITCH_ICON_TYPES,
	DEFAULT_SWITCH_GEOMETRY,
} from './game/switch/switch-config'

export { base_messages } from './messages/en'
