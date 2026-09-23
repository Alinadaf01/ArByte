import { config } from "dotenv";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

// T-210 §۰ — قبل از `vitest run`، مایگریشن‌ها را روی دیتابیس تست
// (`.env.test` → `arbyte_test`) اعمال می‌کند، نه دیتابیس dev را.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../.env.test") });

const cwd = path.resolve(__dirname, "..");
execSync("npx prisma migrate deploy", { stdio: "inherit", cwd, env: process.env });
// چند تست یکپارچگی (catalog/content) به دسته‌ها/محصولات seed تکیه می‌کنند
// (مثل slug «gaming-laptop») — بدون seed روی arbyte_test رد می‌شوند.
execSync("npx prisma db seed", { stdio: "inherit", cwd, env: process.env });
