import { describe, expect, it } from "vitest";
import { normalizeSearchText } from "./search-text";

describe("normalizeSearchText", () => {
  it("نیم‌فاصله را حذف می‌کند — «لپتاپ» با «لپ‌تاپ» یکی می‌شود", () => {
    expect(normalizeSearchText("لپتاپ")).toBe(normalizeSearchText("لپ‌تاپ"));
  });

  it("ي عربی را به ی فارسی تبدیل می‌کند", () => {
    expect(normalizeSearchText("علي")).toBe(normalizeSearchText("علی"));
  });

  it("ك عربی را به ک فارسی تبدیل می‌کند", () => {
    expect(normalizeSearchText("كيس")).toBe(normalizeSearchText("کیس"));
  });

  it("ارقام فارسی/عربی به لاتین — «۶۴» با «64» یکی می‌شود", () => {
    expect(normalizeSearchText("۶۴GB")).toBe(normalizeSearchText("64GB"));
    expect(normalizeSearchText("٦٤GB")).toBe(normalizeSearchText("64GB"));
  });

  it("حروف لاتین lower-case می‌شوند", () => {
    expect(normalizeSearchText("MSI")).toBe(normalizeSearchText("msi"));
  });

  it("اعراب حذف می‌شود", () => {
    expect(normalizeSearchText("مُحَصَّل")).toBe(normalizeSearchText("محصل"));
  });

  it("فاصله‌ی معمولی هم حذف می‌شود", () => {
    expect(normalizeSearchText("کیس گیمینگ")).toBe(
      normalizeSearchText("کیسگیمینگ"),
    );
  });
});
