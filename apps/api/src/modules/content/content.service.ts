import { Inject, Injectable } from "@nestjs/common";
import type { PublicHomepageBlock } from "@arbyte/contracts";
import { PrismaService } from "../../prisma/prisma.service";
import { CatalogService } from "../catalog/catalog.service";

/**
 * الحاقیه T-004 §۸، هشدار — پاسخ باید محتوای حل‌شده بدهد، نه ارجاع.
 * `config` روی `HomepageBlock` شکل آزاد دارد (تصمیم T-003)؛ این پروژه
 * تصمیم گرفته `config` فقط شناسه‌های خام نگه دارد
 * (`{ categoryIds: string[] }` / `{ productIds: string[] }`) و این سرویس
 * آن‌ها را به آبجکت کامل تبدیل کند — دقیقاً همان چیزی که README می‌خواهد.
 */
@Injectable()
export class ContentService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CatalogService) private readonly catalogService: CatalogService,
  ) {}

  async getHomepage(): Promise<{ blocks: PublicHomepageBlock[] }> {
    const rows = await this.prisma.homepageBlock.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }],
      },
      orderBy: { sortOrder: "asc" },
    });

    const active = rows.filter((row) => !row.endsAt || row.endsAt > new Date());

    const blocks = await Promise.all(
      active.map((row) => this.resolveBlock(row)),
    );

    return { blocks };
  }

  private async resolveBlock(row: {
    id: string;
    type: string;
    sortOrder: number;
    title: string | null;
    subtitle: string | null;
    ctaLabel: string | null;
    ctaUrl: string | null;
    imageDesktop: string | null;
    imageMobile: string | null;
    imageAlt: string | null;
    config: unknown;
  }): Promise<PublicHomepageBlock> {
    const base = {
      id: row.id,
      sortOrder: row.sortOrder,
      title: row.title,
      subtitle: row.subtitle,
      ctaLabel: row.ctaLabel,
      ctaUrl: row.ctaUrl,
      imageDesktop: row.imageDesktop,
      imageMobile: row.imageMobile,
      imageAlt: row.imageAlt,
    };

    if (row.type === "CATEGORY_GRID") {
      const categoryIds = this.readIdArray(row.config, "categoryIds");
      const categories = await this.prisma.category.findMany({
        where: { id: { in: categoryIds }, isActive: true, deletedAt: null },
        select: { id: true, name: true, slug: true },
      });
      const byId = new Map(categories.map((c) => [c.id, c]));
      return {
        ...base,
        type: "CATEGORY_GRID",
        categories: categoryIds
          .map((id) => byId.get(id))
          .filter((c): c is NonNullable<typeof c> => Boolean(c)),
      };
    }

    if (row.type === "PRODUCT_RAIL") {
      const productIds = this.readIdArray(row.config, "productIds");
      const products =
        await this.catalogService.getProductCardsByIds(productIds);
      return { ...base, type: "PRODUCT_RAIL", products };
    }

    return {
      ...base,
      type: row.type as "HERO" | "CAMPAIGN" | "BENEFITS" | "BLOG_RAIL",
    };
  }

  private readIdArray(config: unknown, key: string): string[] {
    if (!config || typeof config !== "object") return [];
    const value = (config as Record<string, unknown>)[key];
    return Array.isArray(value)
      ? value.filter((v): v is string => typeof v === "string")
      : [];
  }
}
