import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../../config/env.validation";
import type { HealthIndicatorResult } from "../health.types";

@Injectable()
export class StorageHealthIndicator {
  constructor(private readonly configService: ConfigService<Env, true>) {}

  async check(): Promise<HealthIndicatorResult> {
    const client = new S3Client({
      endpoint: this.configService.get("S3_ENDPOINT", { infer: true }),
      region: this.configService.get("S3_REGION", { infer: true }),
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.configService.get("S3_ACCESS_KEY_ID", {
          infer: true,
        }),
        secretAccessKey: this.configService.get("S3_SECRET_ACCESS_KEY", {
          infer: true,
        }),
      },
    });

    try {
      await client.send(
        new HeadBucketCommand({
          Bucket: this.configService.get("S3_BUCKET", { infer: true }),
        }),
      );
      return { status: "up" };
    } catch (error) {
      return { status: "down", message: (error as Error).message };
    } finally {
      client.destroy();
    }
  }
}
