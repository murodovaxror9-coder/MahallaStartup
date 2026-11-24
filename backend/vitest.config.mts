import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    setupFiles: ['./test/setup-env.ts'],
    // Har fayl o'z xotiradagi PGlite'ini yaratadi: xotirani tejash uchun parallelizm cheklangan
    maxWorkers: 3,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Har fayl o'z in-memory bazasini yaratadi (PGlite), shuning uchun fayllar parallel ishlay oladi
  },
});
