import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  slugify,
  toPersianDigits,
  type CreateBrandBody,
  type UpdateBrandBody,
} from "@arbyte/contracts";
import { AuditLogService } from "../../common/audit/audit-log.service";
import { PrismaService } from "../../prisma/prisma.service";

const BRAND_SELECT = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  description: true,
  isActive: true,
  deletedAt: true,
  seo: { select: { metaTitle: true, metaDescription: true, canonical: true } },
} as const;

/** §۸.۱۹، T-101. `Brand.name` در دیتابیس واقعاً `@unique` است (نه partial)، `slug` فقط partial. */
@Injectable()
export class BrandService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditLogService) private readonly auditLog: AuditLogService,
  ) {}

  async list() {
    return this.prisma.brand.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: BRAND_SELECT,
    });
  }

  private async assertUniqueName(name: string, excludeId?: string) {
    const existing = await this.prisma.brand.findFirst({
      where: { name, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    if (existing) {
      throw new ConflictException({
        code: "CONFLICT",
        message: "برندی با این نام از قبل وجود دارد.",
      });
    }
  }

  private async assertUniqueSlug(slug: string, excludeId?: string) {
    const existing = await this.prisma.brand.findFirst({
      where: {
        slug,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (existing) {
      throw new ConflictException({
        code: "CONFLICT",
        message: "برند دیگری با همین آدرس (slug) وجود دارد.",
      });
    }
  }

  async create(actorId: string | null, input: CreateBrandBody) {
    const slug = input.slug ?? slugify(input.name);
    await this.assertUniqueName(input.name);
    await this.assertUniqueSlug(slug);

    const created = await this.prisma.brand.create({
      data: {
        name: input.name,
        slug,
        logoUrl: input.logoUrl,
        description: input.description,
        isActive: input.isActive,
        seo: input.seo ? { create: input.seo } : undefined,
      },
      select: BRAND_SELECT,
    });

    await this.auditLog.record({
      actorId,
      action: "brand.create",
      entityType: "Brand",
      entityId: created.id,
      after: created,
    });

    return created;
  }

  async update(actorId: string | null, id: string, input: UpdateBrandBody) {
    const before = await this.prisma.brand.findFirst({
      where: { id, deletedAt: null },
      select: BRAND_SELECT,
    });
    if (!before) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "برند پیدا نشد.",
      });
    }

    if (input.name && input.name !== before.name) {
      await this.assertUniqueName(input.name, id);
    }
    if (input.slug && input.slug !== before.slug) {
      await this.assertUniqueSlug(input.slug, id);
    }

    const updated = await this.prisma.brand.update({
      where: { id },
      data: {
        name: input.name,
        slug: input.slug,
        logoUrl: input.logoUrl,
        description: input.description,
        isActive: input.isActive,
        seo: input.seo
          ? { upsert: { create: input.seo, update: input.seo } }
          : undefined,
      },
      select: BRAND_SELECT,
    });

    await this.auditLog.record({
      actorId,
      action: "brand.update",
      entityType: "Brand",
      entityId: id,
      before,
      after: updated,
    });

    return updated;
  }

  async remove(actorId: string | null, id: string) {
    const brand = await this.prisma.brand.findFirst({
      where: { id, deletedAt: null },
    });
    if (!brand) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "برند پیدا نشد.",
      });
    }

    const productCount = await this.prisma.product.count({
      where: { brandId: id, deletedAt: null },
    });
    if (productCount > 0) {
      throw new ConflictException({
        code: "CONFLICT",
        message: `این برند ${toPersianDigits(productCount)} محصول دارد و قابل حذف نیست.`,
      });
    }

    await this.prisma.brand.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditLog.record({
      actorId,
      action: "brand.delete",
      entityType: "Brand",
      entityId: id,
      before: brand,
    });
  }
}
