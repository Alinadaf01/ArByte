import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { FeatureFlagsService } from "./feature-flags.service";

@ApiTags("feature-flags")
@Controller("feature-flags")
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get()
  @ApiOkResponse({ description: "وضعیت فعلی همه‌ی Feature Flag ها" })
  getAll() {
    return this.featureFlagsService.getAll();
  }
}
