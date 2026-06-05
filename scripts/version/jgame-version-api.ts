import { execFileSync } from 'node:child_process'

const GH_API_PATH = '/users/joshuafolkken/packages/npm/game-kit/versions?per_page=1'

function fetch_latest_version(): string | undefined {
	try {
		const output = execFileSync('gh', ['api', GH_API_PATH, '--jq', '.[0].name'])

		return output.toString().trim()
	} catch {
		return undefined
	}
}

const jgame_version_api = { fetch_latest_version, GH_API_PATH }

export { jgame_version_api }
