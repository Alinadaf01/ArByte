import { expect, test } from "@playwright/test";

test("ساختار خطا مطابق بند ۸.۹۳ برند بوک است", async ({ request }) => {
  const response = await request.post("/api/v1/_diagnostics/validate-mobile", {
    data: { mobile: "0000" },
  });
  expect(response.status()).toBe(400);

  const body = await response.json();
  expect(body).toHaveProperty("code", "VALIDATION_ERROR");
  expect(body).toHaveProperty("message");
  expect(body).toHaveProperty("fieldErrors.mobile");
  expect(body).toHaveProperty("requestId");
  expect(body.requestId).toMatch(/^req_/);
});
