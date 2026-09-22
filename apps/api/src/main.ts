import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { SwaggerModule, type OpenAPIObject } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { ZodValidationPipe } from "./common/pipes/zod-validation.pipe";
import type { Env } from "./config/env.validation";
import { buildOpenApiDocument } from "./openapi/registry";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<Env, true>);

  // بند ۸.۹۴ / ۱۱.۶ — پیشوند سراسری Versioning.
  app.setGlobalPrefix("api/v1");

  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());

  // بند ۱۲.۱۵ — Swagger فقط در محیط توسعه؛ از همان اسکیماهای Zod تولید
  // می‌شود (T-004 §۷)، نه از `DocumentBuilder`/`createDocument` که روی
  // متادیتای `@ApiProperty()` دستی تکیه دارد.
  if (configService.get("NODE_ENV", { infer: true }) !== "production") {
    // openapi3-ts (zod-to-openapi) و @nestjs/swagger هر کدام نوع OpenAPIObject
    // خودشان را دارند — ساختاراً یکی‌اند (هر دو سند OpenAPI 3.1)، فقط
    // `paths` در یکی اختیاری تایپ شده؛ همین یک‌جا cast لازم است.
    const document = buildOpenApiDocument();
    SwaggerModule.setup("api/docs", app, document as unknown as OpenAPIObject);
  }

  const port = configService.get("APP_PORT", { infer: true });
  await app.listen(port);
}

bootstrap();
