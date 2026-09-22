import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

/** `@Global()` — هر ماژول کسب‌وکاری بدون import دوباره به `PrismaService` دسترسی دارد. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
