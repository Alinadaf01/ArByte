import { defineConfig } from "@playwright/test";

// E2E سطح API — بدون مرورگر، فقط APIRequestContext (بند ۱۲.۱۱۱ / ۱۱.۱۱۲).
export default defineConfig({
  testDir: "./e2e",
  webServer: {
    command: "pnpm start",
    url: "http://localhost:4000/api/v1/health",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  use: {
    baseURL: "http://localhost:4000",
  },
});
