import type { Page } from '@playwright/test'

const TOUCH_PRIMARY_QUERY = '(hover: none) and (pointer: coarse)'

async function stub_touch_primary(page: Page, is_touch: boolean): Promise<void> {
	await page.addInitScript(
		([query, matches]) => {
			const original = matchMedia.bind(globalThis)

			// eslint-disable-next-line unicorn/no-global-object-property-assignment -- replacing the global is the point: this init script installs a matchMedia stub in the page context
			globalThis.matchMedia = function patched(input: string): MediaQueryList {
				if (input === query) {
					// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- partial-mock pattern; literal would need every MediaQueryList field
					return {
						matches,
						media: input,
						onchange: null,
						addEventListener() {
							/* no-op */
						},
						removeEventListener() {
							/* no-op */
						},
						addListener() {
							/* no-op */
						},
						removeListener() {
							/* no-op */
						},
						dispatchEvent() {
							return false
						},
					} as MediaQueryList
				}

				return original(input)
			}
		},
		[TOUCH_PRIMARY_QUERY, is_touch] as const,
	)
}

export { stub_touch_primary }
