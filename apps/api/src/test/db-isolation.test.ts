import { describe, expect, it } from "vitest";

/**
 * T-210 §۰ — نگهبانِ جداسازی دیتابیس تست. اگر `setupFiles`/`.env.test`
 * (ر.ک. `vitest.config.ts`، `src/test/setup-env.ts`) به هر دلیلی از کار
 * بیفتد یا کسی آن را برگرداند، این تست با شکست بلند اعلام می‌کند —
 * ساکت روی دیتابیس dev ننویس.
 */
describe("جداسازی دیتابیس تست از dev", () => {
  it("DATABASE_URL هنگام تست به‌جای «arbyte» به «arbyte_test» اشاره می‌کند", () => {
    const url = process.env["DATABASE_URL"] ?? "";
    expect(url).toContain("/arbyte_test");
    expect(url.endsWith("/arbyte")).toBe(false);
  });
});
