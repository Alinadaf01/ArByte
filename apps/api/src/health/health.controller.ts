import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger";
import { DatabaseHealthIndicator } from "./indicators/database.health-indicator";
import { RedisHealthIndicator } from "./indicators/redis.health-indicator";
import { StorageHealthIndicator } from "./indicators/storage.health-indicator";

/**
 * بند ۱۱.۱۱۶ برند بوک — Backend باید Health Check Endpoint داشته باشد که
 * وضعیت سرویس‌های اصلی (DB، Redis، Storage) را بررسی کند.
 */
@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(
    private readonly database: DatabaseHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly storage: StorageHealthIndicator,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: "همه‌ی سرویس‌های اصلی سالم هستند" })
  @ApiServiceUnavailableResponse({
    description: "حداقل یکی از سرویس‌های اصلی در دسترس نیست",
  })
  async check() {
    const [database, redis, storage] = await Promise.all([
      this.database.check(),
      this.redis.check(),
      this.storage.check(),
    ]);

    const services = { database, redis, storage };
    const isHealthy = Object.values(services).every((s) => s.status === "up");

    if (!isHealthy) {
      throw new ServiceUnavailableException({
        code: "SERVICE_UNAVAILABLE",
        message: "حداقل یکی از سرویس‌های زیرساختی در دسترس نیست.",
        services,
      });
    }

    return { status: "ok", services };
  }
}
