import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  toPersianDigits,
  type CreateSpecificationDefinitionBody,
  type CreateSpecificationValueBody,
  type UpdateSpecificationDefinitionBody,
  type UpdateSpecificationValueBody,
} from "@arbyte/contracts";
import { AuditLogService } from "../../common/audit/audit-log.service";
import { PrismaService } from "../../prisma/prisma.service";

const DEFINITION_SELECT = {
  id: true,
  key: true,
  nameFa: true,
  type: true,
  unit: true,
  categoryId: true,
  isRequired: true,
  isFilterable: true,
  isSearchable: true,
  isVariantAxis: true,
  sortOrder: true,
  values: {
    select: { id: true, value: true, swatchHex: true, sortOrder: true },
    orderBy: { sortOrder: "asc" as const },
  },
} as const;

/**
 * §۷.۳۱–۷.۳۶، §۸.۲۲–۸.۲۸، T-101. `key` واقعاً `@unique` است.
 * `SpecificationDefinition` بدون `deletedAt` است (حذف واقعی، نه نرم) — پس
 * برخلاف Category/Brand، حذف اینجا برگشت‌ناپذیر است؛ به همین دلیل، هم‌راستا
 * با اصل «حذف مسدود اگر در حال استفاده» (بند ۶۰ سند فاز ۱ برای Category)،
 * قبل از حذف تعداد `ProductSpecification`های وابسته چک می‌شود — این تصمیم
 * T-101 است، نه نقل‌قول مستقیم سند (که فقط برای Category صریح گفته بود).
 */
@Injectable()
export class SpecificationService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditLogService) private readonly auditLog: AuditLogService,
  ) {}

  async list() {
    return this.prisma.specificationDefinition.findMany({
      orderBy: [{ sortOrder: "asc" }, { nameFa: "asc" }],
      select: DEFINITION_SELECT,
    });
  }

  private async assertUniqueKey(key: string, excludeId?: string) {
    const existing = await this.prisma.specificationDefinition.findFirst({
      where: { key, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    if (existing) {
      throw new ConflictException({
        code: "CONFLICT",
        message: "مشخصه‌ی دیگری با همین کلید (key) وجود دارد.",
      });
    }
  }

  private async findDefinitionOrThrow(id: string) {
    const definition = await this.prisma.specificationDefinition.findUnique({
      where: { id },
    });
    if (!definition) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "مشخصه پیدا نشد.",
      });
    }
    return definition;
  }

  async create(
    actorId: string | null,
    input: CreateSpecificationDefinitionBody,
  ) {
    await this.assertUniqueKey(input.key);

    const created = await this.prisma.specificationDefinition.create({
      data: input,
      select: DEFINITION_SELECT,
    });

    await this.auditLog.record({
      actorId,
      action: "specification.create",
      entityType: "SpecificationDefinition",
      entityId: created.id,
      after: created,
    });

    return created;
  }

  async update(
    actorId: string | null,
    id: string,
    input: UpdateSpecificationDefinitionBody,
  ) {
    const before = await this.prisma.specificationDefinition.findUnique({
      where: { id },
      select: DEFINITION_SELECT,
    });
    if (!before) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "مشخصه پیدا نشد.",
      });
    }
    if (input.key && input.key !== before.key) {
      await this.assertUniqueKey(input.key, id);
    }

    const updated = await this.prisma.specificationDefinition.update({
      where: { id },
      data: input,
      select: DEFINITION_SELECT,
    });

    await this.auditLog.record({
      actorId,
      action: "specification.update",
      entityType: "SpecificationDefinition",
      entityId: id,
      before,
      after: updated,
    });

    return updated;
  }

  async remove(actorId: string | null, id: string) {
    const definition = await this.findDefinitionOrThrow(id);

    const usageCount = await this.prisma.productSpecification.count({
      where: { specificationDefinitionId: id },
    });
    if (usageCount > 0) {
      throw new ConflictException({
        code: "CONFLICT",
        message: `این مشخصه در ${toPersianDigits(usageCount)} محصول استفاده شده و قابل حذف نیست.`,
      });
    }

    await this.prisma.specificationDefinition.delete({ where: { id } });

    await this.auditLog.record({
      actorId,
      action: "specification.delete",
      entityType: "SpecificationDefinition",
      entityId: id,
      before: definition,
    });
  }

  async addValue(
    actorId: string | null,
    definitionId: string,
    input: CreateSpecificationValueBody,
  ) {
    const definition = await this.findDefinitionOrThrow(definitionId);
    this.assertSwatchOnlyForColor(definition.type, input.swatchHex);

    await this.prisma.specificationValue.create({
      data: { specificationDefinitionId: definitionId, ...input },
    });

    const updated = await this.prisma.specificationDefinition.findUniqueOrThrow(
      {
        where: { id: definitionId },
        select: DEFINITION_SELECT,
      },
    );

    await this.auditLog.record({
      actorId,
      action: "specification.value.create",
      entityType: "SpecificationDefinition",
      entityId: definitionId,
      after: updated,
    });

    return updated;
  }

  async updateValue(
    actorId: string | null,
    definitionId: string,
    valueId: string,
    input: UpdateSpecificationValueBody,
  ) {
    const definition = await this.findDefinitionOrThrow(definitionId);
    const value = await this.prisma.specificationValue.findFirst({
      where: { id: valueId, specificationDefinitionId: definitionId },
    });
    if (!value) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "مقدار مشخصه پیدا نشد.",
      });
    }
    this.assertSwatchOnlyForColor(definition.type, input.swatchHex);

    await this.prisma.specificationValue.update({
      where: { id: valueId },
      data: input,
    });

    const updated = await this.prisma.specificationDefinition.findUniqueOrThrow(
      {
        where: { id: definitionId },
        select: DEFINITION_SELECT,
      },
    );

    await this.auditLog.record({
      actorId,
      action: "specification.value.update",
      entityType: "SpecificationDefinition",
      entityId: definitionId,
      after: updated,
    });

    return updated;
  }

  async removeValue(
    actorId: string | null,
    definitionId: string,
    valueId: string,
  ) {
    await this.findDefinitionOrThrow(definitionId);
    const value = await this.prisma.specificationValue.findFirst({
      where: { id: valueId, specificationDefinitionId: definitionId },
    });
    if (!value) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "مقدار مشخصه پیدا نشد.",
      });
    }

    const usageCount = await this.prisma.productSpecification.count({
      where: { specificationValueId: valueId },
    });
    if (usageCount > 0) {
      throw new ConflictException({
        code: "CONFLICT",
        message: `این مقدار در ${toPersianDigits(usageCount)} محصول استفاده شده و قابل حذف نیست.`,
      });
    }

    await this.prisma.specificationValue.delete({ where: { id: valueId } });

    const updated = await this.prisma.specificationDefinition.findUniqueOrThrow(
      {
        where: { id: definitionId },
        select: DEFINITION_SELECT,
      },
    );

    await this.auditLog.record({
      actorId,
      action: "specification.value.delete",
      entityType: "SpecificationDefinition",
      entityId: definitionId,
      after: updated,
    });

    return updated;
  }

  /** بند «سند فاز ۱»: `swatchHex` فقط برای مشخصه‌های نوع COLOR. */
  private assertSwatchOnlyForColor(
    type: string,
    swatchHex: string | undefined,
  ) {
    if (swatchHex && type !== "COLOR") {
      throw new ConflictException({
        code: "CONFLICT",
        message: "رنگ (swatch) فقط برای مشخصه‌های نوع «رنگی» قابل تنظیم است.",
      });
    }
  }
}
