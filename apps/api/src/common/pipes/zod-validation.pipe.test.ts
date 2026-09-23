/**
 * T-201 §۰ — تست رگرسیون باگ کشف‌شده در T-150: pipe سراسری زیر `tsx` روی
 * تشخیص خودکار متاتایپ هرگز کار نمی‌کرد (بدون schema صریح، مقدار خام رد
 * می‌شد). این تست دقیقاً همان مسیری را می‌زند که یکی از اندپوینت‌های ادمین
 * (`POST /admin/categories`) الان استفاده می‌کند: schema صریح به سازنده‌ی
 * pipe داده می‌شود، نه تکیه بر کلاس ZodDto.
 */
import { BadRequestException } from "@nestjs/common";
import type { ArgumentMetadata } from "@nestjs/common";
import { CreateCategoryBodySchema } from "@arbyte/contracts";
import { describe, expect, it } from "vitest";
import { ZodValidationPipe } from "./zod-validation.pipe";

const bodyMetadata: ArgumentMetadata = { type: "body" };

describe("ZodValidationPipe — schema صریح روی @Body ادمین", () => {
  it("بدنه‌ی خالی روی CreateCategoryBodySchema، VALIDATION_ERROR می‌دهد", () => {
    const pipe = new ZodValidationPipe(CreateCategoryBodySchema);

    expect(() => pipe.transform({}, bodyMetadata)).toThrow(BadRequestException);

    try {
      pipe.transform({}, bodyMetadata);
      expect.unreachable("باید BadRequestException پرتاب می‌شد");
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as {
        code: string;
        fieldErrors: Record<string, string>;
      };
      expect(response.code).toBe("VALIDATION_ERROR");
      expect(response.fieldErrors).toHaveProperty("name");
    }
  });

  it("بدنه‌ی معتبر بدون خطا رد می‌شود", () => {
    const pipe = new ZodValidationPipe(CreateCategoryBodySchema);
    const result = pipe.transform(
      { name: "دسته‌بندی تست", sortOrder: 0, isActive: true },
      bodyMetadata,
    );
    expect(result.name).toBe("دسته‌بندی تست");
  });

  it("بدون schema صریح و بدون متاتایپ واقعی (شبیه‌سازی حالت خراب قبلی)، مقدار خام را دست‌نخورده رد می‌کند", () => {
    // این دقیقاً همان چیزی است که قبلاً باعث نشتن ولیدیشن می‌شد — نگه
    // داشته شده تا رفتار fallback مستند/تست‌شده بماند، نه اینکه دوباره
    // تصادفی به همین حالت برگردیم بدون اینکه بدانیم.
    const pipe = new ZodValidationPipe();
    const raw = { anything: "goes" };
    expect(pipe.transform(raw, { type: "body", metatype: Object })).toBe(raw);
  });
});
