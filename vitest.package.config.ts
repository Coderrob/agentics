import { defineConfig } from 'vitest/config';

/** Minimum coverage percentage required across all dimensions. */
const COVERAGE_THRESHOLD = 95;

export default defineConfig({
  test: {
    coverage: {
      exclude: ['src/**/*.test.ts', '**/dist/**'],
      include: ['src/**/*.ts'],
      provider: 'v8',
      thresholds: {
        branches: COVERAGE_THRESHOLD,
        functions: COVERAGE_THRESHOLD,
        lines: COVERAGE_THRESHOLD,
        statements: COVERAGE_THRESHOLD
      }
    },
    include: ['src/**/*.test.ts']
  }
});
