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
    // D-04 §۴ — wishlist-store.ts حالا مستقیم `@/lib/env` را ایمپورت می‌کند
    // (syncAfterLogin). `.env` واقعی در gitignore است، پس تست نباید به
    // وجودش تکیه کند؛ این مقادیر دقیقاً همان‌های .env.example هستند.
    env: {
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_API_BASE_URL: "http://localhost:8000/api/v1",
    },
  },
});
