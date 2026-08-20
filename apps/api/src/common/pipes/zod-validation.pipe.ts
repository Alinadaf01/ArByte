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
 * فقط وقتی متاتایپ پارامتر یک ZodDto باشد (از createZodDto ساخته شده) اعتبارسنجی
 * می‌کند؛ در غیر این صورت مقدار را بدون تغییر عبور می‌دهد (مثلاً برای primitive ها).
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata) {
    const metatype = metadata.metatype as unknown as MaybeZodDto | undefined;
    if (!metatype?.schema) {
      return value;
    }

    const result = metatype.schema.safeParse(value);
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
