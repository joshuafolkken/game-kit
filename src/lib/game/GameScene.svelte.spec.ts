import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { flushSync } from 'svelte';
import GameScene from './GameScene.svelte';
import { audio } from '$lib/game/audio';
import { device } from '$lib/game/device.svelte';
import { fullscreen } from '$lib/game/fullscreen.svelte';
import { fullscreen_switch_input } from '$lib/game/fullscreen-switch-input';
import { session } from '$lib/game/session.svelte';
import { game_state } from '$lib/game/state.svelte';

const HINT = 'Click to play';
const LABEL_JUMP = 'JUMP';
const LABEL_MOVE = 'Move';
const LABEL_LOOK = 'Look';
const LABEL_ACTION = 'Action';
const LABEL_RETURN = 'Return';
const LABEL_GAME = 'Simon game';
const LABEL_GAME_STARTED = 'Game started';
const LABEL_PAUSE = 'Pause';

function render_scene(extra: Record<string, unknown> = {}) {
	return render(GameScene, {
		props: {
			label_jump: LABEL_JUMP,
			label_move: LABEL_MOVE,
			label_look: LABEL_LOOK,
			label_action: LABEL_ACTION,
			label_return: LABEL_RETURN,
			label_game: LABEL_GAME,
			label_game_started: LABEL_GAME_STARTED,
			label_pause: LABEL_PAUSE,
			...extra
		}
	});
}

describe('GameScene', () => {
	beforeEach(() => {
		session.reset_session();
		game_state.reset_mode();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('renders game-scene container', () => {
		const { container } = render_scene();
		expect(container.querySelector('[data-testid="game-scene"]')).toBeTruthy();
	});

	it('hides jump button before the session starts', () => {
		const { container } = render_scene();
		expect(container.querySelector('[data-testid="jump-btn"]')).toBeNull();
	});

	it('shows jump button with aria-label after session starts', () => {
		const { container } = render_scene();
		const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]');
		expect(scene).toBeTruthy();
		if (!scene) return;
		scene.click();
		flushSync();
		const btn = container.querySelector<HTMLElement>('[data-testid="jump-btn"]');
		expect(btn).toBeTruthy();
		expect(btn?.getAttribute('aria-label')).toBe(LABEL_JUMP);
		expect(btn?.querySelector('svg')).toBeTruthy();
	});

	it('renders a canvas element', () => {
		const { container } = render_scene();
		expect(container.querySelector('canvas')).toBeTruthy();
	});

	it('shows controls-overlay with hint_text before the session starts', () => {
		const { container } = render_scene({ hint_text: HINT });
		expect(container.querySelector('[data-testid="start-hint"]')?.textContent?.trim()).toBe(HINT);
	});

	it('hides controls-overlay after the session starts', () => {
		const { container } = render_scene({ hint_text: HINT });
		const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]');
		expect(scene).toBeTruthy();
		if (!scene) return;
		expect(container.querySelector('[data-testid="controls-overlay"]')).toBeTruthy();
		scene.click();
		flushSync();
		expect(container.querySelector('[data-testid="controls-overlay"]')).toBeNull();
	});

	it('calls on_start callback when user first clicks', () => {
		let called = false;
		const { container } = render_scene({
			on_start: () => {
				called = true;
			}
		});
		const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]');
		expect(scene).toBeTruthy();
		if (!scene) return;
		scene.click();
		expect(called).toBe(true);
	});

	it('calls on_start only once across multiple clicks', () => {
		let call_count = 0;
		const { container } = render_scene({
			on_start: () => {
				call_count++;
			}
		});
		const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]');
		expect(scene).toBeTruthy();
		if (!scene) return;
		scene.click();
		scene.click();
		scene.click();
		expect(call_count).toBe(1);
	});

	it('start_game runs init_audio only once across multiple clicks', () => {
		const spy = vi.spyOn(audio, 'init_audio');
		const { container } = render_scene();
		const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]');
		expect(scene).toBeTruthy();
		if (!scene) return;
		scene.click();
		scene.click();
		scene.click();
		expect(spy).toHaveBeenCalledTimes(1);
	});

	it('start_game requests fullscreen on touch-primary devices', () => {
		vi.spyOn(device, 'is_touch_primary', 'get').mockReturnValue(true);
		const fullscreen_spy = vi.spyOn(fullscreen, 'request').mockResolvedValue();
		const { container } = render_scene();
		const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]');
		expect(scene).toBeTruthy();
		if (!scene) return;
		scene.click();
		expect(fullscreen_spy).toHaveBeenCalledTimes(1);
	});

	it('start_game does not request fullscreen on desktop devices but still inits audio', () => {
		vi.spyOn(device, 'is_touch_primary', 'get').mockReturnValue(false);
		const fullscreen_spy = vi.spyOn(fullscreen, 'request').mockResolvedValue();
		const audio_spy = vi.spyOn(audio, 'init_audio');
		const { container } = render_scene();
		const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]');
		expect(scene).toBeTruthy();
		if (!scene) return;
		scene.click();
		expect(fullscreen_spy).not.toHaveBeenCalled();
		expect(audio_spy).toHaveBeenCalledTimes(1);
	});

	it('registers the game-scene container with fullscreen_switch_input on mount', () => {
		const spy = vi.spyOn(fullscreen_switch_input, 'set_container');
		const { container } = render_scene();
		const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]');
		expect(scene).toBeTruthy();
		expect(spy).toHaveBeenCalledWith(scene);
	});

	it('sets session.is_session_started to true after first click', () => {
		const { container } = render_scene();
		const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]');
		expect(scene).toBeTruthy();
		if (!scene) return;
		expect(session.is_session_started).toBe(false);
		scene.click();
		expect(session.is_session_started).toBe(true);
	});

	it('does not render cyber-glow when game_state.is_alt is false', () => {
		const { container } = render_scene();
		expect(container.querySelector('[data-testid="cyber-glow"]')).toBeNull();
	});

	it('renders cyber-glow when game_state.is_alt is true', () => {
		game_state.toggle_alt();
		const { container } = render_scene();
		expect(container.querySelector('[data-testid="cyber-glow"]')).toBeTruthy();
	});

	describe('ESC / Z key — return to start', () => {
		it('pressing ESC while session is active calls reset_session', () => {
			const { container } = render_scene();
			const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]');
			expect(scene).toBeTruthy();
			if (!scene) return;
			scene.click();
			expect(session.is_session_started).toBe(true);
			scene.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
			expect(session.is_session_started).toBe(false);
		});

		it('pressing Z while session is active calls reset_session', () => {
			const { container } = render_scene();
			const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]');
			expect(scene).toBeTruthy();
			if (!scene) return;
			scene.click();
			expect(session.is_session_started).toBe(true);
			scene.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', bubbles: true }));
			expect(session.is_session_started).toBe(false);
		});

		it('pressing ESC while session is not active does not start the game', () => {
			const { container } = render_scene();
			const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]');
			expect(scene).toBeTruthy();
			if (!scene) return;
			expect(session.is_session_started).toBe(false);
			scene.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
			expect(session.is_session_started).toBe(false);
		});
	});

	describe('Enter / Space — start session', () => {
		it('pressing Enter starts the session', () => {
			const { container } = render_scene();
			const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]');
			expect(scene).toBeTruthy();
			if (!scene) return;
			expect(session.is_session_started).toBe(false);
			scene.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
			expect(session.is_session_started).toBe(true);
		});

		it('pressing Space does NOT start the session (reserved for jump input)', () => {
			const { container } = render_scene();
			const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]');
			expect(scene).toBeTruthy();
			if (!scene) return;
			expect(session.is_session_started).toBe(false);
			scene.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
			expect(session.is_session_started).toBe(false);
		});
	});

	describe('mobile move/look during controls overlay', () => {
		it('joystick zones are rendered before session starts so move/look work in overlay', () => {
			vi.spyOn(device, 'is_touch_primary', 'get').mockReturnValue(true);
			const { container } = render_scene();
			expect(container.querySelectorAll('.joystick-zone')).toHaveLength(2);
		});
	});

	describe('mobile pause button', () => {
		it('shows pause button when session is active on touch device', () => {
			vi.spyOn(device, 'is_touch_primary', 'get').mockReturnValue(true);
			vi.spyOn(fullscreen, 'request').mockResolvedValue();
			const { container } = render_scene();
			const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]');
			expect(scene).toBeTruthy();
			if (!scene) return;
			scene.click();
			flushSync();
			expect(container.querySelector('[data-testid="pause-btn"]')).toBeTruthy();
		});

		it('does not show pause button on desktop', () => {
			vi.spyOn(device, 'is_touch_primary', 'get').mockReturnValue(false);
			const { container } = render_scene();
			const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]');
			expect(scene).toBeTruthy();
			if (!scene) return;
			scene.click();
			flushSync();
			expect(container.querySelector('[data-testid="pause-btn"]')).toBeNull();
		});

		it('does not show pause button before session starts', () => {
			vi.spyOn(device, 'is_touch_primary', 'get').mockReturnValue(true);
			const { container } = render_scene();
			expect(container.querySelector('[data-testid="pause-btn"]')).toBeNull();
		});

		it('clicking pause button resets session', () => {
			vi.spyOn(device, 'is_touch_primary', 'get').mockReturnValue(true);
			vi.spyOn(fullscreen, 'request').mockResolvedValue();
			const { container } = render_scene();
			const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]');
			expect(scene).toBeTruthy();
			if (!scene) return;
			scene.click();
			flushSync();
			const pause_btn = container.querySelector<HTMLElement>('[data-testid="pause-btn"]');
			expect(pause_btn).toBeTruthy();
			if (!pause_btn) return;
			pause_btn.click();
			flushSync();
			expect(session.is_session_started).toBe(false);
		});

		it('pause button is positioned at bottom-right of the screen', () => {
			vi.spyOn(device, 'is_touch_primary', 'get').mockReturnValue(true);
			vi.spyOn(fullscreen, 'request').mockResolvedValue();
			const { container } = render_scene();
			const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]');
			expect(scene).toBeTruthy();
			if (!scene) return;
			scene.click();
			flushSync();
			const pause_btn = container.querySelector<HTMLElement>('[data-testid="pause-btn"]');
			expect(pause_btn).toBeTruthy();
			if (!pause_btn) return;
			const style = globalThis.getComputedStyle(pause_btn);
			expect(style.bottom).toBe('16px');
			expect(style.right).toBe('16px');
		});
	});
});
