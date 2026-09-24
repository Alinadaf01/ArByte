import { describe, expect, it } from "vitest";
import { computeCardTransform, computeMorphProgress } from "./journal-arc";

describe("computeMorphProgress", () => {
  it("قبل از رسیدن قوس به دید، m و rp صفرند", () => {
    const { m, rp } = computeMorphProgress(2000, 900);
    expect(m).toBe(0);
    expect(rp).toBe(0);
  });

  it("وقتی قوس کامل داخل viewport بالا آمده، m به ۱ می‌رسد", () => {
    const { m } = computeMorphProgress(-200, 900);
    expect(m).toBe(1);
  });

  it("بین این دو حالت مقداری بینابین می‌دهد", () => {
    const { m } = computeMorphProgress(500, 900);
    expect(m).toBeGreaterThan(0);
    expect(m).toBeLessThan(1);
  });
});

describe("computeCardTransform", () => {
  it("در m=0 کارت‌ها روی یک حلقه‌ی کوچک‌اند (شعاع ثابت از مرکز)", () => {
    const t0 = computeCardTransform(0, 1200, 400, 0, 0.5);
    const t4 = computeCardTransform(4, 1200, 400, 0, 0.5);
    const r0 = Math.hypot(t0.x, t0.y);
    const r4 = Math.hypot(t4.x, t4.y);
    expect(r0).toBeCloseTo(r4, 1);
  });

  it("در m=1 هر کارت z-index و opacity کامل دارد", () => {
    const t = computeCardTransform(2, 1200, 400, 1, 0.5);
    expect(t.opacity).toBeCloseTo(1, 2);
    expect(t.zIndex).toBe(12);
  });

  it("کارت‌های متوالی زاویه‌ی متفاوت دارند (قوس واقعی، نه هم‌پوشان)", () => {
    const a = computeCardTransform(0, 1200, 400, 1, 0.5);
    const b = computeCardTransform(1, 1200, 400, 1, 0.5);
    expect(a.x).not.toBeCloseTo(b.x, 0);
  });
});
