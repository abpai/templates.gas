// vite.config.ts
import gasPlugin from 'rollup-plugin-google-apps-script'
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => {
  const environment = mode === 'test' ? 'test' : 'production'

  return {
    define: {
      __ENVIRONMENT__: JSON.stringify(environment),
      __ROOT_PATH__: JSON.stringify(
        environment === 'test' ? 'Document AI [TEST_ENV]' : 'Document AI',
      ),
    },
    build: {
      outDir: 'dist',
      assetsDir: '.', // keep outputs at root
      rollupOptions: {
        input: 'src/ui.ts', // single entry that imports the rest
        plugins: [
          gasPlugin({
            manifest: {
              copy: true,
            },
          }),
        ],
        output: {
          entryFileNames: 'Code.js', // final Apps Script file name
          format: 'cjs',
          inlineDynamicImports: true, // collapse everything into one file
        },
      },
      target: 'es2020', // keep in sync with tsconfig
      minify: false, // As recommended, Apps Script handles minification if needed
      sourcemap: false, // Sourcemaps are generally not useful in GAS environment
    },
  }
})
