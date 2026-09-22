import { describe, expect, it } from "vitest";
import { PERMISSIONS_MAP } from "./permissions-map";

describe("PERMISSIONS_MAP", () => {
  it("هر مجوز غیر از public/authenticated الگوی domain.action دارد (§۸.۱۱)", () => {
    for (const entry of PERMISSIONS_MAP) {
      if (entry.access === "public" || entry.access === "authenticated")
        continue;
      const keys = Array.isArray(entry.access) ? entry.access : [entry.access];
      for (const key of keys) {
        expect(key, `${entry.method} ${entry.path} -> "${key}"`).toMatch(
          /^[a-z]+\.[a-z]+$/,
        );
      }
    }
  });

  it("هر endpoint ادمین (مسیر با /admin) مجوز دارد، نه public/authenticated خام", () => {
    for (const entry of PERMISSIONS_MAP) {
      if (!entry.path.startsWith("/admin")) continue;
      expect(entry.access, `${entry.method} ${entry.path}`).not.toBe("public");
      expect(entry.access, `${entry.method} ${entry.path}`).not.toBe(
        "authenticated",
      );
    }
  });

  it("users.impersonate روی endpoint صدور بلیت است، نه تبادلش (که عمومی/بلیت‌محور است)", () => {
    const issue = PERMISSIONS_MAP.find(
      (e) => e.path === "/admin/users/:id/impersonate",
    );
    const exchange = PERMISSIONS_MAP.find(
      (e) => e.path === "/auth/impersonate/exchange",
    );
    expect(issue?.access).toBe("users.impersonate");
    expect(exchange?.access).toBe("public");
  });
});
