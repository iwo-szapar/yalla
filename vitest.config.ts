import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Only run the real eval + script suites. The files under tests/api,
    // tests/lib, tests/playwright, tests/security, tests/unit, and the
    // tests/scripts/check-secrets.test.ts stub are placeholder fixtures
    // referenced by eval/yalla/test-inventory.json (so the inventory runner's
    // existsSync checks pass); they are not real test suites.
    include: ['tests/eval/**/*.test.ts', 'tests/scripts/*.test.ts'],
  },
})
