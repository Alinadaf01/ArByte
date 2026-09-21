import { describe, expect, it } from "vitest";
import { dictionary } from "./dictionary";

describe("dictionary", () => {
  it("exposes the dashboard strings", () => {
    expect(dictionary.dashboard.title).toBe("داشبورد");
  });

  it("exposes all nav items referenced by the sidebar groups", () => {
    expect(Object.keys(dictionary.nav.items).length).toBeGreaterThan(0);
    expect(dictionary.nav.groups.catalog).toBe("کاتالوگ");
  });
});
