import { Global, Module } from "@nestjs/common";
import { FEATURE_FLAGS_REPOSITORY } from "./feature-flags.constants";
import { FeatureFlagsController } from "./feature-flags.controller";
import { FeatureFlagsService } from "./feature-flags.service";
import { InMemoryFeatureFlagsRepository } from "./in-memory-feature-flags.repository";

@Global()
@Module({
  controllers: [FeatureFlagsController],
  providers: [
    FeatureFlagsService,
    {
      provide: FEATURE_FLAGS_REPOSITORY,
      useClass: InMemoryFeatureFlagsRepository,
    },
  ],
  exports: [FeatureFlagsService],
})
export class FeatureFlagsModule {}
