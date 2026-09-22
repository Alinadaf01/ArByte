import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  slugify,
  toPersianDigits,
  type CreateCategoryBody,
  type UpdateCategoryBody,
} from "@arbyte/contracts";
import { AuditLogService } from "../../common/audit/audit-log.service";
import { PrismaService } from "../../prisma/prisma.service";

const CATEGORY_SELECT = {
  id: true,
  name: true,
  slug: true,
  parentId: true,
  description: true,
  imageMain: true,
  imageBanner: true,
  imageThumbnail: true,
  sortOrder: true,
  isActive: true,
  deletedAt: true,
  seo: { select: { metaTitle: true, metaDescription: true, canonical: true } },
} as const;

/**
 * §۷.۲۶–۷.۳۶ + الحاقیه‌ی فاز ۱. سلسله‌مراتب در دیتابیس نامحدود است ولی طبق
 * تصمیم T-003، UI فقط دو سطح نشان می‌دهد — این سرویس همان محدودیت را سمت
 * سرور هم اجرا می‌کند (بند ۱۱.۸۶: اعتبارسنجی فقط سمت UI کافی نیست).
 */
@Injectable()
export class CategoryService {
  // Inject صریح لازم است — ر.ک. کامنت مشابه در category.controller.ts.
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditLogService) private readonly auditLog: AuditLogService,
  ) {}

  async list() {
    return this.prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: CATEGORY_SELECT,
    });
  }

  private async assertUniqueSlug(slug: string, excludeId?: string) {
    const existing = await this.prisma.category.findFirst({
      where: {
        slug,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (existing) {
      throw new ConflictException({
        code: "CONFLICT",
        message: "دسته‌بندی دیگری با همین آدرس (slug) وجود دارد.",
      });
    }
  }

  private async assertMaxTwoLevels(parentId: string | undefined) {
    if (!parentId) return;
    const parent = await this.prisma.category.findFirst({
      where: { id: parentId, deletedAt: null },
    });
    if (!parent) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "دسته‌بندی والد پیدا نشد.",
      });
    }
    if (parent.parentId) {
      // تصمیم T-003 — دو سطح کافی است؛ زیرمجموعه‌ی یک زیرمجموعه مجاز نیست.
      throw new ConflictException({
        code: "CONFLICT",
        message:
          "دسته‌بندی والد نمی‌تواند خودش زیرمجموعه باشد — فقط دو سطح مجاز است.",
      });
    }
  }

  async create(actorId: string | null, input: CreateCategoryBody) {
    const slug = input.slug ?? slugify(input.name);
    await this.assertUniqueSlug(slug);
    await this.assertMaxTwoLevels(input.parentId);

    const created = await this.prisma.category.create({
      data: {
        name: input.name,
        slug,
        parentId: input.parentId,
        description: input.description,
        imageMain: input.imageMain,
        imageBanner: input.imageBanner,
        imageThumbnail: input.imageThumbnail,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
        seo: input.seo ? { create: input.seo } : undefined,
      },
      select: CATEGORY_SELECT,
    });

    await this.auditLog.record({
      actorId,
      action: "category.create",
      entityType: "Category",
      entityId: created.id,
      after: created,
    });

    return created;
  }

  async update(actorId: string | null, id: string, input: UpdateCategoryBody) {
    const before = await this.prisma.category.findFirst({
      where: { id, deletedAt: null },
      select: CATEGORY_SELECT,
    });
    if (!before) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "دسته‌بندی پیدا نشد.",
      });
    }

    if (input.slug && input.slug !== before.slug) {
      await this.assertUniqueSlug(input.slug, id);
    }
    if (input.parentId !== undefined) {
      if (input.parentId === id) {
        throw new ConflictException({
          code: "CONFLICT",
          message: "دسته‌بندی نمی‌تواند والد خودش باشد.",
        });
      }
      await this.assertMaxTwoLevels(input.parentId);
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        name: input.name,
        slug: input.slug,
        parentId: input.parentId,
        description: input.description,
        imageMain: input.imageMain,
        imageBanner: input.imageBanner,
        imageThumbnail: input.imageThumbnail,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
        seo: input.seo
          ? { upsert: { create: input.seo, update: input.seo } }
          : undefined,
      },
      select: CATEGORY_SELECT,
    });

    await this.auditLog.record({
      actorId,
      action: "category.update",
      entityType: "Category",
      entityId: id,
      before,
      after: updated,
    });

    return updated;
  }

  async remove(actorId: string | null, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, deletedAt: null },
    });
    if (!category) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "دسته‌بندی پیدا نشد.",
      });
    }

    const [productCount, childCount] = await Promise.all([
      this.prisma.product.count({ where: { categoryId: id, deletedAt: null } }),
      this.prisma.category.count({ where: { parentId: id, deletedAt: null } }),
    ]);

    if (productCount > 0) {
      throw new ConflictException({
        code: "CONFLICT",
        message: `این دسته‌بندی ${toPersianDigits(productCount)} محصول دارد و قابل حذف نیست.`,
      });
    }
    if (childCount > 0) {
      throw new ConflictException({
        code: "CONFLICT",
        message: `این دسته‌بندی ${toPersianDigits(childCount)} زیرمجموعه دارد و قابل حذف نیست.`,
      });
    }

    await this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditLog.record({
      actorId,
      action: "category.delete",
      entityType: "Category",
      entityId: id,
      before: category,
    });
  }
}
