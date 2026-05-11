import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST_SCRIPTS_DIR = path.dirname(fileURLToPath(import.meta.url))
const PACKAGE_DIR = path.join(DIST_SCRIPTS_DIR, '..', '..')
const TEMPLATES_DIR = path.join(PACKAGE_DIR, 'templates')
const PROJECT_ROOT = process.cwd()

const gk_paths = { PACKAGE_DIR, TEMPLATES_DIR, PROJECT_ROOT }
export { gk_paths }
