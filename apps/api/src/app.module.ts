import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { RequestIdMiddleware } from "./common/middleware/request-id.middleware";
import { validateEnv } from "./config/env.validation";
import { DiagnosticsModule } from "./diagnostics/diagnostics.module";
import { FeatureFlagsModule } from "./feature-flags/feature-flags.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    FeatureFlagsModule,
    HealthModule,
    DiagnosticsModule,
    // ماژول‌های کسب‌وکاری آینده (Product, Order, ...) طبق بند ۷.۲ و ۱۱.۱۱۸
    // اینجا و در src/modules اضافه می‌شوند — این تسک هیچ‌کدام را نمی‌سازد.
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}
