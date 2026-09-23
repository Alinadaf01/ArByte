import { Inject, Injectable } from "@nestjs/common";
import type { ProductCard, PublicHomepageBlock } from "@arbyte/contracts";
import { PrismaService } from "../../prisma/prisma.service";
import { CatalogService } from "../catalog/catalog.service";

/**
 * الحاقیه T-004 §۸، هشدار — پاسخ باید محتوای حل‌شده بدهد، نه ارجاع.
 * `config` روی `HomepageBlock` طبق T-210 §۴.۲ اسکیمای Zod جدا به‌ازای هر
 * نوع دارد (`HomepageBlockConfigSchema`، شناسه‌ها همه slug هستند نه id
 * خام) و این سرویس آن‌ها را به آبجکت کامل تبدیل می‌کند — دقیقاً همان چیزی
 * که README می‌خواهد.
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

    const resolved = await Promise.all(
      active.map((row) => this.resolveBlock(row)),
    );
    // FLAGSHIP_DUEL با محصول گمشده null برمی‌گردد — بلوک رندر نمی‌شود،
    // صفحه نمی‌شکند (طبق قاعده‌ی صریح تسک برای بلوک غیرقابل‌حل).
    const blocks = resolved.filter(
      (block): block is PublicHomepageBlock => block !== null,
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
  }): Promise<PublicHomepageBlock | null> {
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

    if (row.type === "HERO") {
      return {
        ...base,
        type: "HERO",
        framesManifest: this.readString(row.config, "framesManifest"),
      };
    }

    if (row.type === "CATEGORY_GRID") {
      const categorySlugs = this.readStringArray(row.config, "categorySlugs");
      const categories =
        await this.catalogService.getCategoryCardsBySlugs(categorySlugs);
      return { ...base, type: "CATEGORY_GRID", categories };
    }

    if (row.type === "FLAGSHIP_DUEL") {
      const resolved = await this.resolveFlagshipDuel(row.config);
      if (!resolved) return null;
      return { ...base, type: "FLAGSHIP_DUEL", ...resolved };
    }

    if (row.type === "PRODUCT_RAIL") {
      const productSlugs = this.readStringArray(row.config, "productSlugs");
      const products =
        await this.catalogService.getProductCardsBySlugs(productSlugs);
      return { ...base, type: "PRODUCT_RAIL", products };
    }

    return {
      ...base,
      type: row.type as "CAMPAIGN" | "BENEFITS" | "BLOG_RAIL",
    };
  }

  /**
   * T-210 §۴ — دو محصولِ productSlugs را کامل حل می‌کند و برای هر
   * specificationDefinitionId در metrics، برچسب (nameFa) + مقدار هر محصول
   * (customValue) را کنار هم می‌گذارد. اگر محصولی پیدا نشد، `null` برمی‌گرداند
   * تا فرانت این بلوک را رندر نکند، نه این‌که با یک محصول ناقص بشکند.
   */
  private async resolveFlagshipDuel(config: unknown): Promise<{
    products: [ProductCard, ProductCard];
    metrics: { label: string; values: [string, string] }[];
  } | null> {
    const productSlugs = this.readStringArray(config, "productSlugs");
    const metricDefIds = this.readStringArray(config, "metrics");

    const products =
      await this.catalogService.getProductCardsBySlugs(productSlugs);
    const productA = products.find((p) => p.slug === productSlugs[0]);
    const productB = products.find((p) => p.slug === productSlugs[1]);

    if (!productA || !productB) {
      return null;
    }
    if (metricDefIds.length === 0) {
      return { products: [productA, productB], metrics: [] };
    }

    const [definitions, specs] = await Promise.all([
      this.prisma.specificationDefinition.findMany({
        where: { id: { in: metricDefIds } },
      }),
      this.prisma.productSpecification.findMany({
        where: {
          specificationDefinitionId: { in: metricDefIds },
          productId: { in: [productA.id, productB.id] },
        },
      }),
    ]);

    const metrics = metricDefIds.map((defId) => {
      const definition = definitions.find((d) => d.id === defId);
      const valueFor = (productId: string) =>
        specs.find(
          (s) =>
            s.specificationDefinitionId === defId && s.productId === productId,
        )?.customValue ?? "";
      return {
        label: definition?.nameFa ?? "",
        values: [valueFor(productA.id), valueFor(productB.id)] as [
          string,
          string,
        ],
      };
    });

    return { products: [productA, productB], metrics };
  }

  private readString(config: unknown, key: string): string | null {
    if (!config || typeof config !== "object") return null;
    const value = (config as Record<string, unknown>)[key];
    return typeof value === "string" ? value : null;
  }

  private readStringArray(config: unknown, key: string): string[] {
    if (!config || typeof config !== "object") return [];
    const value = (config as Record<string, unknown>)[key];
    return Array.isArray(value)
      ? value.filter((v): v is string => typeof v === "string")
      : [];
  }
}
