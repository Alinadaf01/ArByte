import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { isOriginAllowed } from "./bff-shared";

/**
 * E-02 §۱/§۵ — واحد: BFF ضد CSRF. مقدار `env.NEXT_PUBLIC_APP_URL` در
 * vitest.config.ts's `test.env` ثابت `http://localhost:3000` است.
 */
function makeRequest(origin: string | null): NextRequest {
  const headers = new Headers();
  if (origin) headers.set("origin", origin);
  return new NextRequest("http://localhost:3000/api/auth/otp/verify", {
    method: "POST",
    headers,
  });
}

describe("isOriginAllowed", () => {
  it("هم‌مبدأ دقیق → مجاز", () => {
    expect(isOriginAllowed(makeRequest("http://localhost:3000"))).toBe(true);
  });

  it("بدون هدر Origin → رد (curl/اسکریپت مستقیم، نه مرورگر واقعی)", () => {
    expect(isOriginAllowed(makeRequest(null))).toBe(false);
  });

  it("مبدأ دیگر → رد", () => {
    expect(isOriginAllowed(makeRequest("http://evil.example"))).toBe(false);
  });

  it("همان دامنه با پورت متفاوت → رد (origin شامل پورت است)", () => {
    expect(isOriginAllowed(makeRequest("http://localhost:4000"))).toBe(false);
  });

  it("هدر Origin نامعتبر (URL غیرقابل‌پارس) → رد", () => {
    expect(isOriginAllowed(makeRequest("not-a-url"))).toBe(false);
  });
});
