import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "prisma/**/*.test.ts"],
    testTimeout: 20000,
    // T-210 §۰ — دیتابیس `arbyte_test` را قبل از هر فایل تست بار می‌کند،
    // نه دیتابیس dev را (ر.ک. src/test/setup-env.ts).
    setupFiles: ["src/test/setup-env.ts"],
  },
});
