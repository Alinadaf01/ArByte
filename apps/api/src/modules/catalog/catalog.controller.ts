import { Controller, Get, Inject, Req } from "@nestjs/common";
import type { RequestWithId } from "../../common/middleware/request-id.middleware";
import { successResponse } from "../../common/http/success-response";
import { CatalogService } from "./catalog.service";

/** §۸.۱۸، T-200. `GET /catalog/categories` — بدون احراز هویت، بدون PermissionGuard. */
@Controller("catalog")
export class CatalogController {
  constructor(
    @Inject(CatalogService) private readonly catalogService: CatalogService,
  ) {}

  @Get("categories")
  async categories(@Req() req: RequestWithId) {
    const data = await this.catalogService.getCategoryTree();
    return successResponse(data, req.requestId);
  }
}
