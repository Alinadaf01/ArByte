import { Controller, Get, Inject, Param, Query, Req } from "@nestjs/common";
import {
  CatalogFiltersQuerySchema,
  ProductListQuerySchema,
  SearchQuerySchema,
  type CatalogFiltersQuery,
  type ProductListQuery,
  type SearchQuery,
} from "@arbyte/contracts";
import type { RequestWithId } from "../../common/middleware/request-id.middleware";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import {
  paginatedResponse,
  successResponse,
} from "../../common/http/success-response";
import { CatalogService } from "./catalog.service";

/**
 * T-150 — `@Query()` روی یک DTO کلاسی به `metadata.metatype` نیاز دارد که
 * زیر `tsx` هرگز درست ست نمی‌شود (ر.ک. یادداشت در zod-validation.pipe.ts)؛
 * پس اینجا schema صریح به خودِ pipe داده می‌شود، نه تکیه بر تشخیص خودکار.
 */
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

  @Get("products")
  async products(
    @Query(new ZodValidationPipe(ProductListQuerySchema))
    query: ProductListQuery,
    @Req() req: RequestWithId,
  ) {
    const { items, total } = await this.catalogService.listProducts(query);
    return paginatedResponse(items, req.requestId, {
      page: query.page,
      perPage: query.perPage,
      total,
    });
  }

  @Get("products/:slug")
  async productDetail(@Param("slug") slug: string, @Req() req: RequestWithId) {
    const data = await this.catalogService.getProductBySlug(slug);
    return successResponse(data, req.requestId);
  }

  @Get("filters")
  async filters(
    @Query(new ZodValidationPipe(CatalogFiltersQuerySchema))
    query: CatalogFiltersQuery,
    @Req() req: RequestWithId,
  ) {
    const data = await this.catalogService.getFilters(query.category);
    return successResponse(data, req.requestId);
  }

  @Get("search")
  async search(
    @Query(new ZodValidationPipe(SearchQuerySchema)) query: SearchQuery,
    @Req() req: RequestWithId,
  ) {
    const { items, total } = await this.catalogService.search(query);
    return paginatedResponse(items, req.requestId, {
      page: query.page,
      perPage: query.perPage,
      total,
    });
  }
}
