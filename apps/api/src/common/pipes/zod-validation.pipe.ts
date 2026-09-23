import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from "@nestjs/common";
import type { ZodType } from "zod";

interface MaybeZodDto {
  schema?: ZodType;
}

/**
 * Pipe سراسری اعتبارسنجی — بند ۱۱.۹۹.
 *
 * T-150 — کشف مهم: تشخیص متاتایپ از `ArgumentMetadata.metatype` به
 * `emitDecoratorMetadata` وابسته است، که `tsx` (موتور dev/start این پروژه،
 * ر.ک. یادداشت SKILL درباره‌ی DI) اصلاً پیاده نمی‌کند — یعنی این مسیر
 * (پیش‌فرض سراسری، بدون schema صریح) در عمل **هرگز چیزی را اعتبارسنجی
 * نمی‌کرد**، نه فقط برای Query جدید این تسک، برای همه‌ی `@Body()` قبلی هم
 * (تأیید شد: POST /admin/categories با بدنه‌ی خالی به‌جای ۴۰۰
 * VALIDATION_ERROR، ۵۰۰ INTERNAL_ERROR داد). راه‌حل: `schema` را می‌شود
 * مستقیم به سازنده‌ی pipe داد (`new ZodValidationPipe(Schema)` روی
 * پارامتر) — دیگر به متاتایپ وابسته نیست. فال‌بک روی متاتایپ برای سازگاری
 * عقب‌رو حفظ شده. اصلاح تمام Endpointهای قدیمی خارج از محدوده‌ی این تسک
 * است (نه CRUD ادمین) — در گزارش پرچم زده شده.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly explicitSchema?: ZodType) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    const metatype = metadata.metatype as unknown as MaybeZodDto | undefined;
    const schema = this.explicitSchema ?? metatype?.schema;
    if (!schema) {
      return value;
    }

    const result = schema.safeParse(value);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join(".") || "_";
        if (!fieldErrors[path]) {
          fieldErrors[path] = issue.message;
        }
      }
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "اطلاعات ارسالی معتبر نیست. لطفاً موارد مشخص‌شده را اصلاح کن.",
        fieldErrors,
      });
    }

    return result.data;
  }
}
