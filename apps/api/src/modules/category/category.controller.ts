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
  CreateCategoryBodySchema,
  UpdateCategoryBodySchema,
  type CreateCategoryBody,
  type UpdateCategoryBody,
} from "@arbyte/contracts";
import type { RequestWithId } from "../../common/middleware/request-id.middleware";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { RequirePermission } from "../../common/guards/require-permission.decorator";
import { successResponse } from "../../common/http/success-response";
import { CategoryService } from "./category.service";

/**
 * T-201 §۰ — `@Body() body: SomeZodDto` روی متاتایپ تکیه می‌کند که زیر
 * `tsx` هرگز درست resolve نمی‌شود (ر.ک. یادداشت کامل در
 * zod-validation.pipe.ts، کشف T-150). schema صریح به خودِ pipe داده
 * می‌شود، نه تکیه بر تشخیص خودکار کلاس.
 */
@Controller("admin/categories")
@UseGuards(PermissionGuard)
export class CategoryController {
  // Inject صریح — esbuild (موتور tsx، ر.ک. یادداشت SKILL) emitDecoratorMetadata
  // را پیاده نمی‌کند؛ بدون توکن صریح این وابستگی در runtime واقعاً undefined می‌ماند.
  constructor(
    @Inject(CategoryService) private readonly categoryService: CategoryService,
  ) {}

  @Get()
  @RequirePermission("categories.view")
  async list(@Req() req: RequestWithId) {
    const data = await this.categoryService.list();
    return successResponse(data, req.requestId);
  }

  @Post()
  @RequirePermission("categories.create")
  async create(
    @Body(new ZodValidationPipe(CreateCategoryBodySchema))
    body: CreateCategoryBody,
    @Req() req: RequestWithId,
  ) {
    const data = await this.categoryService.create(null, body);
    return successResponse(data, req.requestId);
  }

  @Patch(":id")
  @RequirePermission("categories.update")
  async update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateCategoryBodySchema))
    body: UpdateCategoryBody,
    @Req() req: RequestWithId,
  ) {
    const data = await this.categoryService.update(null, id, body);
    return successResponse(data, req.requestId);
  }

  @Delete(":id")
  @RequirePermission("categories.delete")
  async remove(@Param("id") id: string, @Req() req: RequestWithId) {
    await this.categoryService.remove(null, id);
    return successResponse({ id }, req.requestId);
  }
}
