export const base_messages = {
	press_start: 'PRESS START',
	cyber_switch_label: 'CYBER',
	fullscreen_switch_label: 'FULLSCREEN',
	fps_switch_label: 'FPS',
	click_to_start: 'CLICK TO START',
	tap_to_start: 'TAP TO START',
	sprint_button: 'SPRINT',
	jump_button: 'JUMP',
	loading_downloading: 'DOWNLOADING...',
	loading_initializing: 'INITIALIZING...',
	loading_loading_assets: 'LOADING ASSETS...',
	loading_ready: 'READY',
	score_high_score: 'HI',
	score_current: 'SCORE',
	score_round: 'RND',
	game_started_announcement: 'Game started',
	pause_button: 'Pause',
	controls_move: 'Move',
	controls_look: 'Look around',
	controls_action: 'Action',
	controls_jump: 'Jump',
	controls_return: 'Return to start',
} as const

export const simon_messages = {
	game_title: 'SIMON',
	simon_start: 'START',
	simon_round: 'ROUND',
	simon_gameover: 'GAME OVER',
	game_application_label: 'Simon game',
} as const

export const messages = { ...base_messages, ...simon_messages } as const
