import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { SvelteKitPWA } from '@vite-pwa/sveltekit'
import { defineConfig } from 'vite'

const BRAND_COLOR = '#0d0d12'

const PWA_MANIFEST = {
	name: 'Simon',
	short_name: 'Simon',
	description: 'A Simon memory game',
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
			workbox: { globPatterns: ['**/*.{js,css,html,ico,png,svg,opus,woff2}'] },
		}),
	],
	server: {
		allowedHosts: ['.trycloudflare.com'],
	},
})
