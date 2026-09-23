import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  CreateBrandBodySchema,
  UpdateBrandBodySchema,
  type CreateBrandBody,
  type UpdateBrandBody,
} from "@arbyte/contracts";
import type { RequestWithId } from "../../common/middleware/request-id.middleware";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { RequirePermission } from "../../common/guards/require-permission.decorator";
import { successResponse } from "../../common/http/success-response";
import { BrandService } from "./brand.service";

/** T-201 §۰ — schema صریح به pipe؛ ر.ک. یادداشت کامل در category.controller.ts. */
@Controller("admin/brands")
@UseGuards(PermissionGuard)
export class BrandController {
  // Inject صریح — ر.ک. کامنت مشابه در category.controller.ts (esbuild/tsx).
  constructor(
    @Inject(BrandService) private readonly brandService: BrandService,
  ) {}

  @Get()
  @RequirePermission("brands.view")
  async list(@Req() req: RequestWithId) {
    const data = await this.brandService.list();
    return successResponse(data, req.requestId);
  }

  @Post()
  @RequirePermission("brands.create")
  async create(
    @Body(new ZodValidationPipe(CreateBrandBodySchema)) body: CreateBrandBody,
    @Req() req: RequestWithId,
  ) {
    const data = await this.brandService.create(null, body);
    return successResponse(data, req.requestId);
  }

  @Patch(":id")
  @RequirePermission("brands.update")
  async update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateBrandBodySchema)) body: UpdateBrandBody,
    @Req() req: RequestWithId,
  ) {
    const data = await this.brandService.update(null, id, body);
    return successResponse(data, req.requestId);
  }

  @Delete(":id")
  @RequirePermission("brands.delete")
  async remove(@Param("id") id: string, @Req() req: RequestWithId) {
    await this.brandService.remove(null, id);
    return successResponse({ id }, req.requestId);
  }
}
