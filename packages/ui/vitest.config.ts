import { defineConfig } from "vitest/config";

export default defineConfig({
  // tsconfig این پکیج عمداً jsx:"preserve" دارد (اپ‌های Next مصرف‌کننده با
  // SWC خودشان JSX را ترنسفورم می‌کنند)؛ Vitest/esbuild برای اجرای مستقیم
  // تست‌ها اینجا به transform واقعی نیاز دارد.
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.tsx", "src/**/*.test.ts"],
  },
});
