import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
    },
  },
  define: {
    // Mock the build-time constants that are normally injected by Vite
    __ROOT_PATH__: JSON.stringify('Document AI [TEST_ENV]'),
    __ENVIRONMENT__: JSON.stringify('test'),
  },
})
