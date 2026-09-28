import { expect, test } from "@playwright/test";

// D-03 — was hardcoded to Nest's port (4000); must follow whatever backend
// apps/web itself is actually configured against (see .env's
// NEXT_PUBLIC_API_BASE_URL), or this test fetches its expectations from a
// different database than the one rendering the page under test.
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

interface FilterOption {
  value: string;
  count: number;
}
interface FilterSpec {
  specDefId: string;
  options?: FilterOption[];
}
interface ProductCardData {
  slug: string;
  defaultVariant: { id: string; price: number };
}

/**
 * T-213 §۷ — وقتی فیلتر مشخصه‌ی محور (رم) روی «۳۲GB» فعال است، کارت
 * محصول باید واریانت *منطبق* را نشان دهد (نه پیش‌فرض واقعی محصول ۶۴GB) و
 * لینک صفحه‌ی محصول باید همان `?v=<variantId>` را داشته باشد — همان قاعده
 * که `catalog.service.integration.test.ts` در لایه‌ی سرویس پوشش می‌دهد،
 * اینجا سرتاسر تا رندر کارت واقعی در مرورگر تأیید می‌شود.
 */
test("فیلتر رم روی /category/laptop-new واریانت منطبق MSI Titan را در کارت و لینک نشان می‌دهد", async ({
  page,
  request,
}) => {
  const filtersRes = await request.get(
    `${API_BASE}/catalog/filters?category=laptop-new`,
  );
  const filtersBody = (await filtersRes.json()) as {
    data: { specs: FilterSpec[] };
  };
  const ramSpec = filtersBody.data.specs.find((s) =>
    s.options?.some((o) => o.value === "۳۲GB"),
  );
  expect(ramSpec).toBeTruthy();

  const specParam = `spec[${ramSpec!.specDefId}]`;
  const filteredRes = await request.get(
    `${API_BASE}/catalog/products?category=laptop-new&${specParam}=${encodeURIComponent("۳۲GB")}`,
  );
  const filteredBody = (await filteredRes.json()) as {
    data: ProductCardData[];
  };
  const expectedCard = filteredBody.data.find(
    (p) => p.slug === "msi-titan-18-hx",
  );
  expect(expectedCard).toBeTruthy();
  // واریانت پیش‌فرض واقعی محصول ۶۴GB/۲۸۹,۵۰۰,۰۰۰ است — فیلتر باید ۳۲GB/۲۶۱,۰۰۰,۰۰۰ بدهد.
  expect(expectedCard!.defaultVariant.price).toBe(261_000_000);

  const params = new URLSearchParams();
  params.set(specParam, "۳۲GB");
  await page.goto(`/category/laptop-new?${params.toString()}`);

  const link = page.getByRole("link", { name: "MSI Titan 18 HX A2W" });
  await expect(link).toHaveAttribute(
    "href",
    `/products/msi-titan-18-hx?v=${expectedCard!.defaultVariant.id}`,
  );
});
