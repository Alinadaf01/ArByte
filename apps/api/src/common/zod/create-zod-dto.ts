import type { ZodType, z } from "zod";

export interface ZodDto<T> {
  new (): T;
  schema: ZodType<T>;
}

/**
 * تبدیل یک Zod schema به یک "DTO class" که NestJS به‌عنوان metatype پارامتر
 * می‌شناسد. ZodValidationPipe سراسری این را پیدا می‌کند و برای Validate کردن
 * Body/Query/Params استفاده می‌کند — طبق بند ۱۱.۹۹ (API Validation سمت سرور)
 * و ADR-001 (Zod مشترک بین فرانت و بک).
 */
export function createZodDto<T extends ZodType>(schema: T): ZodDto<z.infer<T>> {
  class GeneratedZodDto {
    static schema = schema;
  }
  return GeneratedZodDto as unknown as ZodDto<z.infer<T>>;
}
