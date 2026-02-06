import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.{test,spec}.{js,mjs}'],
    setupFiles: ['./tests/setup.js'],
    exclude: ['node_modules/', 'dist/', 'tests/unit/butter-connector.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'tests/']
    }
  }
});
