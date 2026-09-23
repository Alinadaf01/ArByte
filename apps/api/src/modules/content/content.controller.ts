import { Controller, Get, Inject, Req } from "@nestjs/common";
import type { RequestWithId } from "../../common/middleware/request-id.middleware";
import { successResponse } from "../../common/http/success-response";
import { ContentService } from "./content.service";

/** T-150 §۲ — عمومی، بدون احراز هویت. الحاقیه T-004 §۸: محتوای حل‌شده، نه ارجاع. */
@Controller("content")
export class ContentController {
  constructor(
    @Inject(ContentService) private readonly contentService: ContentService,
  ) {}

  @Get("homepage")
  async homepage(@Req() req: RequestWithId) {
    const data = await this.contentService.getHomepage();
    return successResponse(data, req.requestId);
  }
}
