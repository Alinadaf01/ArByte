import { config } from "dotenv";
import path from "node:path";

/**
 * T-210 §۰ — تست‌های یکپارچگی را از دیتابیس dev جدا می‌کند. این فایل قبل از
 * هر فایل تست بار می‌شود (`vitest.config.ts`'s `setupFiles`) و `.env.test`
 * (دیتابیس `arbyte_test`) را زودتر از `import "dotenv/config"` خودِ هر
 * فایل تست می‌خواند — `dotenv.config()` به‌طور پیش‌فرض متغیر از پیش
 * تعریف‌شده را بازنویسی نمی‌کند، پس `DATABASE_URL` همان `arbyte_test`
 * می‌ماند حتی بعد از `import "dotenv/config"` در خودِ فایل تست.
 */
config({ path: path.resolve(__dirname, "../../.env.test") });
