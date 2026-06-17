import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { SvelteKitPWA } from '@vite-pwa/sveltekit'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'
import { game_config } from './src/lib/game-config'

const BRAND_COLOR = '#0d0d12'

const PWA_MANIFEST = {
	name: game_config.GAME_NAME_DISPLAY,
	short_name: game_config.GAME_NAME_DISPLAY,
	description: game_config.GAME_DESCRIPTION,
	start_url: '/',
	display: 'standalone' as const,
	background_color: BRAND_COLOR,
	theme_color: BRAND_COLOR,
	icons: [
		{ src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
		{ src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
		{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
	],
}

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			injectRegister: null,
			manifest: PWA_MANIFEST,
			workbox: { globPatterns: ['**/*.{js,css,html,ico,png,svg,opus,woff2,woff,ttf,otf}'] },
		}),
	],
	server: {
		allowedHosts: ['.trycloudflare.com'],
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }],
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**'],
				},
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
				},
			},
		],
	},
})
