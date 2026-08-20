import { Inject, Injectable } from "@nestjs/common";
import {
  FEATURE_FLAGS_REPOSITORY,
  type FeatureFlagKey,
} from "./feature-flags.constants";
import type { FeatureFlagsRepository } from "./feature-flags.repository";

@Injectable()
export class FeatureFlagsService {
  constructor(
    @Inject(FEATURE_FLAGS_REPOSITORY)
    private readonly repository: FeatureFlagsRepository,
  ) {}

  async isEnabled(flag: FeatureFlagKey): Promise<boolean> {
    const flags = await this.repository.getAll();
    return flags[flag];
  }

  async getAll() {
    return this.repository.getAll();
  }
}
