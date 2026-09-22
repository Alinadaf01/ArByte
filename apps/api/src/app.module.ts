import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { RequestIdMiddleware } from "./common/middleware/request-id.middleware";
import { AuditLogModule } from "./common/audit/audit-log.module";
import { validateEnv } from "./config/env.validation";
import { DiagnosticsModule } from "./diagnostics/diagnostics.module";
import { FeatureFlagsModule } from "./feature-flags/feature-flags.module";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { CategoryModule } from "./modules/category/category.module";
import { BrandModule } from "./modules/brand/brand.module";
import { SpecificationModule } from "./modules/specification/specification.module";
import { CatalogModule } from "./modules/catalog/catalog.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    AuditLogModule,
    FeatureFlagsModule,
    HealthModule,
    DiagnosticsModule,
    // T-101 — اولین ماژول‌های کسب‌وکاری واقعی (بند ۷.۲ و ۱۱.۱۱۸).
    CategoryModule,
    BrandModule,
    SpecificationModule,
    // T-200 — اولین ماژول عمومی (بدون PermissionGuard)، مصرف‌شده توسط apps/web.
    CatalogModule,
    // بقیه‌ی ماژول‌های کسب‌وکاری (Product, Order, ...) در تسک‌های بعدی فاز ۱.
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}
