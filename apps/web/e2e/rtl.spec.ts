import { expect, test } from "@playwright/test";

test("صفحه‌ی اصلی RTL و فارسی است", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "fa");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});
