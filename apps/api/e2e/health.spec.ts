import { expect, test } from "@playwright/test";

test("GET /api/v1/health با وضعیت DB و Redis پاسخ 200 می‌دهد", async ({
  request,
}) => {
  const response = await request.get("/api/v1/health");
  expect(response.status()).toBe(200);

  const body = await response.json();
  expect(body.status).toBe("ok");
  expect(body.services.database.status).toBe("up");
  expect(body.services.redis.status).toBe("up");
  expect(body.services.storage.status).toBe("up");
});
