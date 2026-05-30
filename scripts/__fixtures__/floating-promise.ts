// Intentional lint fixture for eslint-scripts-type-aware.test.ts. It floats a Promise so
// the test can assert @typescript-eslint/no-floating-promises (a type-aware rule) actually
// fires for scripts/**/*.ts. Excluded from normal lint via FILE_IGNORES in eslint.config.js.
function leak_promise(): Promise<void> {
	return Promise.resolve()
}

leak_promise()
