import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const WORKFLOWS_DIR = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	'..',
	'.github',
	'workflows',
)
// Captures the 40-char commit SHA every `pnpm/action-setup@` use is pinned to.
// Matching the SHA (not the trailing `# vX.Y.Z` comment) is what determines the
// installed pnpm, and stays robust when a pin omits the version comment.
const ACTION_SETUP_PATTERN = /pnpm\/action-setup@(?<pin>[\da-f]{40})\b/gu

function collect_action_setup_pins(): Array<string> {
	const files = readdirSync(WORKFLOWS_DIR).filter((name) => name.endsWith('.yml'))

	return files.flatMap((file) => {
		const content = readFileSync(path.join(WORKFLOWS_DIR, file), 'utf8')

		return content
			.matchAll(ACTION_SETUP_PATTERN)
			.map((match) => match.groups?.pin ?? '')
			.toArray()
	})
}

describe('GitHub workflows pnpm/action-setup pinning', () => {
	// Regression for #281: publish.yml lagged ci.yml on pnpm/action-setup, so it
	// installed a pnpm that did not satisfy devEngines (11.5.0) and the Publish job
	// aborted at `pnpm install`. Pinning every workflow to the same version keeps the
	// devEngines-aware resolution consistent across CI and Publish.
	it('pins pnpm/action-setup to a single version across all workflows (#281)', () => {
		const pins = collect_action_setup_pins()

		expect(pins.length).toBeGreaterThan(0)
		expect(new Set(pins).size).toBe(1)
	})
})
