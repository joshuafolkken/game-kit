import type { Page } from '@playwright/test'

const TOUCH_PRIMARY_QUERY = '(hover: none) and (pointer: coarse)'

export async function stub_touch_primary(page: Page, is_touch: boolean): Promise<void> {
	await page.addInitScript(
		([query, matches]) => {
			const original = globalThis.matchMedia.bind(globalThis)

			globalThis.matchMedia = function patched(input: string): MediaQueryList {
				if (input === query) {
					return {
						matches: matches as boolean,
						media: input,
						onchange: null,
						addEventListener() {},
						removeEventListener() {},
						addListener() {},
						removeListener() {},
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
