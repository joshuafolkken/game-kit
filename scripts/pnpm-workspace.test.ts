import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const ROOT_WORKSPACE_PATH = path.join(REPO_ROOT, 'pnpm-workspace.yaml')
const TEMPLATE_WORKSPACE_PATH = path.join(REPO_ROOT, 'templates', 'pnpm-workspace.yaml')

const root_workspace = readFileSync(ROOT_WORKSPACE_PATH, 'utf8')
const template_workspace = readFileSync(TEMPLATE_WORKSPACE_PATH, 'utf8')

describe('pnpm-workspace.yaml (game-kit root)', () => {
	it('declares an overrides section', () => {
		expect(root_workspace).toMatch(/^overrides:/mu)
	})

	it('pins ws to the security-patched line (GHSA-58qx-3vcg-4xpx)', () => {
		expect(root_workspace).toMatch(/ws:\s*['"]?>=8\.20\.1['"]?/u)
	})

	it('pins serialize-javascript to the security-patched line', () => {
		expect(root_workspace).toMatch(/serialize-javascript:\s*['"]?>=7\.0\.5['"]?/u)
	})

	it('declares an allowBuilds section', () => {
		expect(root_workspace).toMatch(/^allowBuilds:/mu)
	})
})

describe('templates/pnpm-workspace.yaml (consumer scaffold)', () => {
	it('declares an overrides section', () => {
		expect(template_workspace).toMatch(/^overrides:/mu)
	})

	it('mirrors the ws security pin so scaffolded projects inherit it', () => {
		expect(template_workspace).toMatch(/ws:\s*['"]?>=8\.20\.1['"]?/u)
	})

	it('mirrors the serialize-javascript security pin so scaffolded projects inherit it', () => {
		expect(template_workspace).toMatch(/serialize-javascript:\s*['"]?>=7\.0\.5['"]?/u)
	})

	it('declares allowBuilds including @joshuafolkken/game-kit so scaffolds can run its build script', () => {
		expect(template_workspace).toMatch(/^allowBuilds:/mu)
		expect(template_workspace).toMatch(/'@joshuafolkken\/game-kit':\s*true/u)
	})
})
