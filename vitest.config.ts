import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

// Fast, offline unit tests. The live-database checks run separately: npm run test:smoke.
export default defineConfig({
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
