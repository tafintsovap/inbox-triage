import { defineConfig, loadEnv } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [tsconfigPaths()],
    test: {
      environment: 'node',
      testTimeout: 30000,
      env,
    },
  }
})
