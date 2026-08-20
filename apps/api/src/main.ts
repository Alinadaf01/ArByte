import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { ZodValidationPipe } from "./common/pipes/zod-validation.pipe";
import type { Env } from "./config/env.validation";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<Env, true>);

  // بند ۸.۹۴ / ۱۱.۶ — پیشوند سراسری Versioning.
  app.setGlobalPrefix("api/v1");

  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());

  // بند ۱۲.۱۵ — Swagger فقط در محیط توسعه.
  if (configService.get("NODE_ENV", { infer: true }) !== "production") {
    const config = new DocumentBuilder()
      .setTitle("ArByte API")
      .setDescription("مستندات API فروشگاه ArByte")
      .setVersion("1.0")
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document);
  }

  const port = configService.get("APP_PORT", { infer: true });
  await app.listen(port);
}

bootstrap();
