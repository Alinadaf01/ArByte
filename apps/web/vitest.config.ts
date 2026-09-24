import path from "node:path";
import { defineConfig } from "vitest/config";

// T-215 — «@/» را مثل tsconfig.json map می‌کند؛ بدون این، هر تستی که فایلی
// با import مسیر «@/...» را (مستقیم یا غیرمستقیم) بارگذاری کند، شکست
// می‌خورد (Vite این مسیر مستعار را خودش نمی‌شناسد، فقط از tsconfig خوانده
// نمی‌شود).
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
