import { describe, expect, it } from "vitest";
import { DEFAULT_FEATURE_FLAGS } from "./feature-flags.constants";
import { FeatureFlagsService } from "./feature-flags.service";
import { InMemoryFeatureFlagsRepository } from "./in-memory-feature-flags.repository";

describe("FeatureFlagsService", () => {
  it("seeds from DEFAULT_FEATURE_FLAGS via the repository", async () => {
    const service = new FeatureFlagsService(
      new InMemoryFeatureFlagsRepository(),
    );

    expect(await service.isEnabled("SMS_ENABLED")).toBe(
      DEFAULT_FEATURE_FLAGS.SMS_ENABLED,
    );
    expect(await service.isEnabled("PAYMENT_GATEWAY_ENABLED")).toBe(
      DEFAULT_FEATURE_FLAGS.PAYMENT_GATEWAY_ENABLED,
    );
  });

  it("reflects writes through the repository", async () => {
    const repository = new InMemoryFeatureFlagsRepository();
    const service = new FeatureFlagsService(repository);

    await repository.set("MAINTENANCE_MODE", true);

    expect(await service.isEnabled("MAINTENANCE_MODE")).toBe(true);
  });
});
