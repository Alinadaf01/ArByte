import { describe, expect, it } from "vitest";
import {
  activeStep,
  bandAt,
  easeStep,
  fitTransform,
  frameToTime,
} from "./hero-engine";

describe("frameToTime", () => {
  it("maps a frame to the middle of its slot at the manifest fps", () => {
    expect(frameToTime(0, 30, 7.33)).toBeCloseTo(0.5 / 30);
    expect(frameToTime(30, 30, 7.33)).toBeCloseTo(30.5 / 30);
  });

  it("never seeks past the end or before the start", () => {
    expect(frameToTime(219, 30, 7.333)).toBeLessThan(7.333);
    expect(frameToTime(-5, 30, 7.333)).toBeCloseTo(0.5 / 30);
    expect(frameToTime(10, 30, Number.NaN)).toBeCloseTo(10.5 / 30);
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
