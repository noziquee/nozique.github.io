import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

// Live security checks against your real Supabase project (needs .env.local and internet).
export default defineConfig({
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
  test: { environment: 'node', include: ['tests/**/*.smoke.test.ts'], testTimeout: 20000 },
});
