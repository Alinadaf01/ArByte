import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../prisma/generated/prisma/client";

/**
 * Prisma 7 دیگر query engine باینری پیش‌فرض ندارد — نیازمند Driver Adapter
 * صریح است (ر.ک. docs/data-model.md، «نکته‌ی فنی #۱»؛ همان الگویی که
 * `prisma/seed.ts` و تست‌های یکپارچگی T-003 استفاده می‌کنند).
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      adapter: new PrismaPg({ connectionString: process.env["DATABASE_URL"] }),
      log: process.env["PRISMA_LOG_QUERIES"] ? ["query"] : undefined,
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
