<script lang="ts">
	import './layout.css'
	import {
		game_state,
		loading,
		OVERLAY_ELEMENT_ID,
		OVERLAY_HIDDEN_CLASS,
		switch_audio,
	} from '@joshuafolkken/game-kit'
	import { messages } from '$lib/messages'

	const CLICK_SOUND_URL = '/sounds/click.opus'
	const LOADING_STATUS_ID = 'loading-status'
	const LOADING_PROGRESS_SELECTOR = `#${OVERLAY_ELEMENT_ID} .progress`
	const LOADING_BAR_SELECTOR = `#${OVERLAY_ELEMENT_ID} .bar`

	loading.configure({
		downloading: messages.loading_downloading,
		initializing: messages.loading_initializing,
		loading_assets: messages.loading_loading_assets,
		ready: messages.loading_ready,
	})
	switch_audio.init(CLICK_SOUND_URL)
	game_state.set_alt(true)
	loading.set_step('initializing')

	$effect(() => {
		const el = document.getElementById(LOADING_STATUS_ID)
		if (el) el.textContent = loading.status_text
	})

	$effect(() => {
		const overlay = document.getElementById(OVERLAY_ELEMENT_ID)
		if (overlay) overlay.classList.toggle(OVERLAY_HIDDEN_CLASS, !loading.is_visible)
	})

	$effect(() => {
		const progress = document.querySelector<HTMLElement>(LOADING_PROGRESS_SELECTOR)
		if (progress) progress.textContent = loading.progress
		const bar = document.querySelector<HTMLProgressElement>(LOADING_BAR_SELECTOR)
		if (bar) bar.value = loading.progress_value
	})

	let { children } = $props()
</script>

<svelte:head>
	<title>{messages.game_title}</title>
</svelte:head>
{@render children()}
