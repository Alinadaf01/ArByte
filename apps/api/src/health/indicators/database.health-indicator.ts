import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Pool } from "pg";
import type { Env } from "../../config/env.validation";
import type { HealthIndicatorResult } from "../health.types";

@Injectable()
export class DatabaseHealthIndicator {
  constructor(private readonly configService: ConfigService<Env, true>) {}

  async check(): Promise<HealthIndicatorResult> {
    const pool = new Pool({
      connectionString: this.configService.get("DATABASE_URL", { infer: true }),
      connectionTimeoutMillis: 2000,
      max: 1,
    });

    try {
      await pool.query("SELECT 1");
      return { status: "up" };
    } catch (error) {
      return { status: "down", message: (error as Error).message };
    } finally {
      await pool.end();
    }
  }
}
