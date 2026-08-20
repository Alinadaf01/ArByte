import { describe, expect, it } from "vitest";
import { validateEnv } from "./env.validation";

const validEnv = {
  NODE_ENV: "development",
  APP_URL: "http://localhost:4000",
  DATABASE_URL: "postgres://arbyte:arbyte@localhost:5432/arbyte",
  REDIS_HOST: "localhost",
  S3_ENDPOINT: "http://localhost:9000",
  S3_BUCKET: "arbyte-media",
  S3_ACCESS_KEY_ID: "arbyte",
  S3_SECRET_ACCESS_KEY: "a-real-secret-value",
  JWT_ACCESS_SECRET: "a".repeat(32),
  JWT_REFRESH_SECRET: "b".repeat(32),
  KAVENEGAR_API_KEY: "a-real-kavenegar-key",
};

describe("validateEnv", () => {
  it("accepts a fully-populated, non-placeholder environment", () => {
    expect(() => validateEnv(validEnv)).not.toThrow();
  });

  it("throws when a required variable is missing", () => {
    const { DATABASE_URL: _omit, ...rest } = validEnv;
    expect(() => validateEnv(rest)).toThrow();
  });

  it("throws when a secret still has its .env.example placeholder value", () => {
    expect(() =>
      validateEnv({
        ...validEnv,
        JWT_ACCESS_SECRET: "replace-with-a-random-32-plus-character-secret",
      }),
    ).toThrow();
  });
});
