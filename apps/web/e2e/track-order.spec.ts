import { expect, test } from "@playwright/test";

// E-05 §۲ — پیگیری مهمان. حالت «پیدا شد» با داده‌ی واقعی سفارش در
// checkout-flow.spec.ts (سفر کامل) و apps/backend's tests_e05_customer_journey.py
// (شکل دقیق پاسخ، حریم خصوصی) پوشش داده شده؛ اینجا فقط رفتار سمت مرورگر که
// به دیتای بک‌اند وابسته نیست — اعتبارسنجی خالی + سفارش ناموجود.
test("خالی → shake؛ سفارش ناموجود → پیام", async ({ page }) => {
  await page.goto("/track-order");

  await page.getByRole("button", { name: "پیگیری" }).click();
  await expect(page.getByText("هر دو فیلد لازم است.")).toBeVisible();

  await page.getByLabel("شماره سفارش").fill("ARB-00000000-NOT-A-REAL-ORDER");
  await page.getByLabel("شماره موبایل").fill("09120000000");
  await page.getByRole("button", { name: "پیگیری" }).click();

  await expect(page.getByText("سفارشی با این مشخصات پیدا نشد")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "پرسیدن از پشتیبانی" }),
  ).toBeVisible();
});

test("پیش‌پرکردن شماره سفارش از پارامتر ?code=", async ({ page }) => {
  await page.goto("/track-order?code=ARB-12345678");
  await expect(page.getByLabel("شماره سفارش")).toHaveValue("ARB-12345678");
});
