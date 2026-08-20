import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";
import type { Env } from "../../config/env.validation";
import type { HealthIndicatorResult } from "../health.types";

@Injectable()
export class RedisHealthIndicator {
  constructor(private readonly configService: ConfigService<Env, true>) {}

  async check(): Promise<HealthIndicatorResult> {
    const redis = new Redis({
      host: this.configService.get("REDIS_HOST", { infer: true }),
      port: this.configService.get("REDIS_PORT", { infer: true }),
      password:
        this.configService.get("REDIS_PASSWORD", { infer: true }) || undefined,
      lazyConnect: true,
      connectTimeout: 2000,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });

    try {
      await redis.connect();
      await redis.ping();
      return { status: "up" };
    } catch (error) {
      return { status: "down", message: (error as Error).message };
    } finally {
      redis.disconnect();
    }
  }
}
