import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  resolve: {
    alias: {
      '@hockey-iq/simulation-core': fileURLToPath(
        new URL('./packages/simulation-core/src/index.ts', import.meta.url),
      ),
      '@hockey-iq/contracts': fileURLToPath(
        new URL('./packages/contracts/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'node',
    include: ['packages/**/test/**/*.test.ts', 'apps/**/test/**/*.test.ts'],
    clearMocks: true,
  },
});
