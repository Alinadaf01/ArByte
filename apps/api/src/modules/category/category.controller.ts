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
import { createZodDto } from "../../common/zod/create-zod-dto";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { RequirePermission } from "../../common/guards/require-permission.decorator";
import { successResponse } from "../../common/http/success-response";
import { CategoryService } from "./category.service";

class CreateCategoryDto extends createZodDto(CreateCategoryBodySchema) {}
class UpdateCategoryDto extends createZodDto(UpdateCategoryBodySchema) {}

/** بند ۸.۱۸–۸.۲۸، T-101. actorId فعلاً همیشه null است — ر.ک. توضیح PermissionGuard. */
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
  async create(@Body() body: CreateCategoryDto, @Req() req: RequestWithId) {
    const data = await this.categoryService.create(
      null,
      body as CreateCategoryBody,
    );
    return successResponse(data, req.requestId);
  }

  @Patch(":id")
  @RequirePermission("categories.update")
  async update(
    @Param("id") id: string,
    @Body() body: UpdateCategoryDto,
    @Req() req: RequestWithId,
  ) {
    const data = await this.categoryService.update(
      null,
      id,
      body as UpdateCategoryBody,
    );
    return successResponse(data, req.requestId);
  }

  @Delete(":id")
  @RequirePermission("categories.delete")
  async remove(@Param("id") id: string, @Req() req: RequestWithId) {
    await this.categoryService.remove(null, id);
    return successResponse({ id }, req.requestId);
  }
}
