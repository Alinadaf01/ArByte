import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";
import type { RequestWithId } from "../middleware/request-id.middleware";

interface StructuredErrorBody {
  code?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
}

const DEFAULT_CODE_BY_STATUS: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: "VALIDATION_ERROR",
  [HttpStatus.UNAUTHORIZED]: "UNAUTHORIZED",
  [HttpStatus.FORBIDDEN]: "FORBIDDEN",
  [HttpStatus.NOT_FOUND]: "NOT_FOUND",
  [HttpStatus.CONFLICT]: "CONFLICT",
  [HttpStatus.TOO_MANY_REQUESTS]: "RATE_LIMITED",
};

/**
 * فیلتر استثنای سراسری — همه‌ی خطاهای API را به ساختار بند ۸.۹۳ برند بوک تبدیل
 * می‌کند. لحن پیام‌ها باید مطابق بند ۲.۱۸ باشد: محترمانه، راه‌حل‌محور، بدون
 * سرزنش کاربر — این مسئولیت نویسنده‌ی هر Exception خاص است؛ این فیلتر فقط شکل
 * پاسخ را یکسان می‌کند.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();
    const requestId = request.requestId ?? "unknown";

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = this.normalize(exception.getResponse(), status);
      response.status(status).json({ ...body, requestId });
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack : exception);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: "INTERNAL_ERROR",
      message:
        "خطای غیرمنتظره‌ای رخ داد. تیم فنی مطلع شد؛ لطفاً کمی بعد دوباره تلاش کن.",
      requestId,
    });
  }

  private normalize(
    body: unknown,
    status: number,
  ): StructuredErrorBody & { code: string; message: string } {
    const fallbackCode = DEFAULT_CODE_BY_STATUS[status] ?? "ERROR";

    if (typeof body === "string") {
      return { code: fallbackCode, message: body };
    }

    if (body && typeof body === "object") {
      const b = body as StructuredErrorBody;
      return {
        code: b.code ?? fallbackCode,
        message: b.message ?? "خطایی رخ داد.",
        ...(b.fieldErrors ? { fieldErrors: b.fieldErrors } : {}),
      };
    }

    return { code: fallbackCode, message: "خطایی رخ داد." };
  }
}
