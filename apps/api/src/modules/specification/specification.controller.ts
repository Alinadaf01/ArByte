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
  CreateSpecificationDefinitionBodySchema,
  CreateSpecificationValueBodySchema,
  UpdateSpecificationDefinitionBodySchema,
  UpdateSpecificationValueBodySchema,
  type CreateSpecificationDefinitionBody,
  type CreateSpecificationValueBody,
  type UpdateSpecificationDefinitionBody,
  type UpdateSpecificationValueBody,
} from "@arbyte/contracts";
import type { RequestWithId } from "../../common/middleware/request-id.middleware";
import { createZodDto } from "../../common/zod/create-zod-dto";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { RequirePermission } from "../../common/guards/require-permission.decorator";
import { successResponse } from "../../common/http/success-response";
import { SpecificationService } from "./specification.service";

class CreateSpecificationDefinitionDto extends createZodDto(
  CreateSpecificationDefinitionBodySchema,
) {}
class UpdateSpecificationDefinitionDto extends createZodDto(
  UpdateSpecificationDefinitionBodySchema,
) {}
class CreateSpecificationValueDto extends createZodDto(
  CreateSpecificationValueBodySchema,
) {}
class UpdateSpecificationValueDto extends createZodDto(
  UpdateSpecificationValueBodySchema,
) {}

@Controller("admin/specifications")
@UseGuards(PermissionGuard)
export class SpecificationController {
  // Inject صریح — ر.ک. کامنت مشابه در category.controller.ts (esbuild/tsx).
  constructor(
    @Inject(SpecificationService)
    private readonly specificationService: SpecificationService,
  ) {}

  @Get()
  @RequirePermission("specifications.view")
  async list(@Req() req: RequestWithId) {
    const data = await this.specificationService.list();
    return successResponse(data, req.requestId);
  }

  @Post()
  @RequirePermission("specifications.create")
  async create(
    @Body() body: CreateSpecificationDefinitionDto,
    @Req() req: RequestWithId,
  ) {
    const data = await this.specificationService.create(
      null,
      body as CreateSpecificationDefinitionBody,
    );
    return successResponse(data, req.requestId);
  }

  @Patch(":id")
  @RequirePermission("specifications.update")
  async update(
    @Param("id") id: string,
    @Body() body: UpdateSpecificationDefinitionDto,
    @Req() req: RequestWithId,
  ) {
    const data = await this.specificationService.update(
      null,
      id,
      body as UpdateSpecificationDefinitionBody,
    );
    return successResponse(data, req.requestId);
  }

  @Delete(":id")
  @RequirePermission("specifications.delete")
  async remove(@Param("id") id: string, @Req() req: RequestWithId) {
    await this.specificationService.remove(null, id);
    return successResponse({ id }, req.requestId);
  }

  @Post(":id/values")
  @RequirePermission("specifications.update")
  async addValue(
    @Param("id") id: string,
    @Body() body: CreateSpecificationValueDto,
    @Req() req: RequestWithId,
  ) {
    const data = await this.specificationService.addValue(
      null,
      id,
      body as CreateSpecificationValueBody,
    );
    return successResponse(data, req.requestId);
  }

  @Patch(":id/values/:valueId")
  @RequirePermission("specifications.update")
  async updateValue(
    @Param("id") id: string,
    @Param("valueId") valueId: string,
    @Body() body: UpdateSpecificationValueDto,
    @Req() req: RequestWithId,
  ) {
    const data = await this.specificationService.updateValue(
      null,
      id,
      valueId,
      body as UpdateSpecificationValueBody,
    );
    return successResponse(data, req.requestId);
  }

  @Delete(":id/values/:valueId")
  @RequirePermission("specifications.update")
  async removeValue(
    @Param("id") id: string,
    @Param("valueId") valueId: string,
    @Req() req: RequestWithId,
  ) {
    const data = await this.specificationService.removeValue(null, id, valueId);
    return successResponse(data, req.requestId);
  }
}
