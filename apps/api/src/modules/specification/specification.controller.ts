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
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { RequirePermission } from "../../common/guards/require-permission.decorator";
import { successResponse } from "../../common/http/success-response";
import { SpecificationService } from "./specification.service";

/** T-201 §۰ — schema صریح به pipe؛ ر.ک. یادداشت کامل در category.controller.ts. */
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
    @Body(new ZodValidationPipe(CreateSpecificationDefinitionBodySchema))
    body: CreateSpecificationDefinitionBody,
    @Req() req: RequestWithId,
  ) {
    const data = await this.specificationService.create(null, body);
    return successResponse(data, req.requestId);
  }

  @Patch(":id")
  @RequirePermission("specifications.update")
  async update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateSpecificationDefinitionBodySchema))
    body: UpdateSpecificationDefinitionBody,
    @Req() req: RequestWithId,
  ) {
    const data = await this.specificationService.update(null, id, body);
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
    @Body(new ZodValidationPipe(CreateSpecificationValueBodySchema))
    body: CreateSpecificationValueBody,
    @Req() req: RequestWithId,
  ) {
    const data = await this.specificationService.addValue(null, id, body);
    return successResponse(data, req.requestId);
  }

  @Patch(":id/values/:valueId")
  @RequirePermission("specifications.update")
  async updateValue(
    @Param("id") id: string,
    @Param("valueId") valueId: string,
    @Body(new ZodValidationPipe(UpdateSpecificationValueBodySchema))
    body: UpdateSpecificationValueBody,
    @Req() req: RequestWithId,
  ) {
    const data = await this.specificationService.updateValue(
      null,
      id,
      valueId,
      body,
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
