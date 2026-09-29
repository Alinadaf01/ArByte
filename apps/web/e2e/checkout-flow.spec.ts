import { expect, test } from "@playwright/test";

// E-02 §۵ — مسیر شاد کامل روی Django dev واقعی: افزودن به سبد مهمان →
// /cart → کد تخفیف ARBYTE10 (content.0005_seed_dev_coupon، fixture dev) →
// /checkout → ورود با کد ثابت dev (OTP_DEV_FIXED_CODE، فقط DEBUG) → ادغام
// سبد → آدرس جدید → کارت‌به‌کارت → سفارش ساخته شد. نیازمند apps/backend
// در حال اجرا با OTP_DEV_MODE=True و OTP_DEV_FIXED_CODE تنظیم‌شده (پیش‌فرض
// این فایل: "1234")، وگرنه گام ورود شکست می‌خورد (کد واقعی فقط در لاگ
// سرور است، از این فرآیند Playwright قابل خواندن نیست).
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";
const OTP_DEV_FIXED_CODE = process.env.OTP_DEV_FIXED_CODE ?? "1234";
const MOBILE = "0912" + String(Math.floor(1000000 + Math.random() * 8999999));

test("مهمان → سبد → کوپن → ورود → ادغام → آدرس جدید → کارت‌به‌کارت → سفارش", async ({
  page,
  request,
}) => {
  const products = await request.get(`${API_BASE}/catalog/products?perPage=1`);
  const productsBody = (await products.json()) as {
    data: { defaultVariant: { id: string } }[];
  };
  const variantId = productsBody.data[0]!.defaultVariant.id;

  // ۱) افزودن به سبد مهمان — با page.evaluate (نه page.request) چون پراکسی
  // برای نوشتن هدر Origin واقعی مرورگر می‌خواهد (ضد CSRF، E-02 §۱)؛
  // request context مستقل پلی‌رایت آن را نمی‌فرستد.
  await page.goto("/");
  const addStatus = await page.evaluate(async (id) => {
    // هدر X-Cart-Session را باید دقیقاً مثل lib/cart-api.ts بخوانیم/بنویسیم،
    // وگرنه هر fetch خام یک سبد مهمان تازه و جدا می‌سازد.
    const key = window.localStorage.getItem("arbyte:cart-session:v1");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (key) headers["X-Cart-Session"] = key;
    const res = await fetch("/api/proxy/cart/items", {
      method: "POST",
      headers,
      body: JSON.stringify({ variantId: id, quantity: 1 }),
    });
    const returned = res.headers.get("x-cart-session");
    if (returned)
      window.localStorage.setItem("arbyte:cart-session:v1", returned);
    return res.status;
  }, variantId);
  expect(addStatus).toBe(201);

  // ۲) /cart — کد تخفیف
  await page.goto("/cart");
  await page.getByPlaceholder("کد تخفیف را وارد کنید").fill("ARBYTE10");
  await page.getByRole("button", { name: "اعمال", exact: true }).click();
  await expect(page.getByText("کد ARBYTE10 اعمال شد.")).toBeVisible();

  await page.getByRole("button", { name: "ادامه و پرداخت" }).click();
  await expect(page).toHaveURL(/\/login/);

  // ۳) ورود — کد ثابت dev
  const phoneDigits = MOBILE.slice(1); // بدون صفر ابتدایی، همان چیزی که فرم می‌گیرد
  await page.getByLabel("شماره موبایل").fill(phoneDigits);
  await page.getByRole("button", { name: "دریافت کد ورود" }).click();
  await page.getByLabel("کد تایید چهار رقمی").fill(OTP_DEV_FIXED_CODE);
  await page.getByRole("button", { name: "تایید و ورود" }).click();
  await expect(page.getByText("خوش آمدید")).toBeVisible();
  await page.getByRole("button", { name: "رفتن به پنل کاربری" }).click();

  // ۴) /checkout — آدرس جدید + کارت‌به‌کارت (SiteSettings باید از قبل پیکربندی شده باشد)
  await page.goto("/checkout");
  const newAddressButton = page.getByRole("button", { name: "آدرس جدید" });
  if (await newAddressButton.isVisible().catch(() => false)) {
    await newAddressButton.click();
  }
  await page.getByLabel("نام گیرنده").fill("کاربر تست");
  await page.getByLabel("شماره موبایل").fill(MOBILE);
  await page.getByLabel("استان").fill("تهران");
  await page.getByLabel("شهر").fill("تهران");
  await page.getByLabel("کد پستی").fill("1234567890");
  await page.getByLabel("نشانی کامل").fill("خیابان تست، پلاک ۱");
  await page.getByRole("button", { name: "ذخیره آدرس" }).click();

  const cardToCard = page.getByRole("button", { name: "کارت‌به‌کارت" });
  if (await cardToCard.isVisible().catch(() => false)) {
    await cardToCard.click();
  }

  await page.getByRole("button", { name: "پرداخت و ثبت سفارش" }).click();
  await expect(page).toHaveURL(/\/orders\/ARB-/, { timeout: 15_000 });

  // ۵) E-05 §۱ — صفحه‌ی وضعیت سفارش: بلوک کارت‌به‌کارت + آپلود رسید.
  await expect(
    page.getByRole("heading", { name: "اطلاعات حساب برای واریز" }),
  ).toBeVisible();
  await page.setInputFiles('input[type="file"]', {
    name: "receipt.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("fake-receipt-bytes"),
  });
  await page
    .getByRole("button", { name: "ثبت رسید و ارسال برای بررسی" })
    .click();
  await expect(page.getByText("رسید ثبت شد ✓")).toBeVisible();
});
