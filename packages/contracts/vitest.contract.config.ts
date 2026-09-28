import { defineConfig } from "vitest/config";

/**
 * D-03 §4 — separate from vitest.config.ts on purpose: these tests hit a
 * live server (CONTRACT_API_URL) and must never run as part of the normal
 * `pnpm test` unit-test pass (which has no server up). Only `pnpm
 * contract:test` (root package.json) uses this config.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/contract/**/*.test.ts"],
    testTimeout: 20_000,
  },
});
