import { describe, expect, it } from "vitest";
import {
  activeStep,
  bandAt,
  easeStep,
  fitTransform,
  frameUrl,
  nearestAvailableFrame,
} from "./hero-engine";

describe("frameUrl", () => {
  it("الگوی دسکتاپ/موبایل را با شماره‌ی فریم جایگزین می‌کند", () => {
    const manifest = {
      count: 220,
      width: 1400,
      height: 900,
      pattern: "/hero/frames/f_{i}.webp",
      mobilePattern: "/hero/frames/m/f_{i}.webp",
      bands: [] as [number, number, number][],
    };
    expect(frameUrl(manifest, 42, false)).toBe("/hero/frames/f_42.webp");
    expect(frameUrl(manifest, 42, true)).toBe("/hero/frames/m/f_42.webp");
  });
});

describe("activeStep", () => {
  it("پیشرفت را به یکی از چهار بازه‌ی گام نگاشت می‌کند", () => {
    expect(activeStep(0)).toBe(0);
    expect(activeStep(0.1)).toBe(0);
    expect(activeStep(0.3)).toBe(1);
    expect(activeStep(0.6)).toBe(2);
    expect(activeStep(0.9)).toBe(3);
    expect(activeStep(1)).toBe(3);
  });
});

describe("bandAt", () => {
  const bands: [number, number, number][] = [
    [0, 40, 100],
    [100, 20, 80],
    [219, 25, 50],
  ];

  it("قبل از اولین نقطه، همان اولین بند را برمی‌گرداند", () => {
    expect(bandAt(bands, 0)).toEqual([0, 40, 100]);
  });

  it("بین دو نقطه خطی درون‌یابی می‌کند", () => {
    const [, top, bottom] = bandAt(bands, 50);
    expect(top).toBeCloseTo(30, 0);
    expect(bottom).toBeCloseTo(90, 0);
  });

  it("بعد از آخرین نقطه، همان آخرین بند را برمی‌گرداند", () => {
    expect(bandAt(bands, 219)).toEqual([219, 25, 50]);
  });

  it("آرایه‌ی خالی را بدون خطا قورت می‌دهد", () => {
    expect(bandAt([], 10)).toEqual([10, 0, 100]);
  });
});

describe("fitTransform", () => {
  it("مقیاس حداقل ۱ و انتقال منفی/مثبت معتبر تولید می‌کند", () => {
    const css = fitTransform({
      band: [0, 30, 90],
      panelHeight: 600,
      panelWidth: 500,
      frameWidth: 1400,
      frameHeight: 2164,
    });
    expect(css).toMatch(
      /^translate\(-50%, -?\d+(\.\d+)?%\) scale\(\d+(\.\d+)?\)$/,
    );
    const scaleMatch = css.match(/scale\(([\d.]+)\)/);
    expect(Number(scaleMatch?.[1])).toBeGreaterThanOrEqual(1);
  });

  it("مقیاس هرگز از ۲٫۷ بیشتر نمی‌شود (سقف طراحی)", () => {
    const css = fitTransform({
      band: [0, 49, 51],
      panelHeight: 2000,
      panelWidth: 2000,
      frameWidth: 1400,
      frameHeight: 2164,
    });
    const scaleMatch = css.match(/scale\(([\d.]+)\)/);
    expect(Number(scaleMatch?.[1])).toBeLessThanOrEqual(2.7);
  });
});

describe("easeStep", () => {
  it("وقتی فاصله کم شد، مستقیم به target می‌رسد", () => {
    expect(easeStep(9.98, 10)).toBe(10);
  });

  it("در غیر این صورت با ضریب ۰٫۱۲ به target نزدیک می‌شود (E-01 §۴)", () => {
    expect(easeStep(0, 10)).toBeCloseTo(1.2, 5);
  });
});

describe("nearestAvailableFrame", () => {
  it("اگر خودِ فریم موجود باشد، همان را برمی‌گرداند", () => {
    const available = new Set([10, 20, 30]);
    expect(nearestAvailableFrame(available, 20, 219)).toBe(20);
  });

  it("نزدیک‌ترین فریمِ بارگذاری‌شده را برمی‌گرداند، نه جای خالی", () => {
    const available = new Set([0, 42, 50]);
    expect(nearestAvailableFrame(available, 45, 219)).toBe(42);
    expect(nearestAvailableFrame(available, 48, 219)).toBe(50);
  });

  it("در فاصله‌ی مساوی، سمت پایین‌تر برنده است (اولویت به قبل)", () => {
    const available = new Set([40, 44]);
    expect(nearestAvailableFrame(available, 42, 219)).toBe(40);
  });

  it("وقتی available خالی است، همان target را برمی‌گرداند (نگهبان)", () => {
    expect(nearestAvailableFrame(new Set(), 42, 219)).toBe(42);
  });
});
