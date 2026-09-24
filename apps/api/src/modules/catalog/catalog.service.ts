import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  buildVariantLabel,
  normalizeSearchText,
  selectCardVariant,
  type CategoryCard,
  type CategoryDetail,
  type CategoryTreeNode,
  type ProductCard,
  type ProductConditionValue,
  type ProductListQuery,
  type PublicProductDetail,
  type PublicVariant,
  type SearchQuery,
  type SpecificationItem,
  type VariantAxis,
} from "@arbyte/contracts";
import { PrismaService } from "../../prisma/prisma.service";
import { computeAvailability } from "./availability";

/**
 * T-150 §۶ — شامل تودرتوی محصول: برند/دسته (join تک‌به‌یک)، تصاویر،
 * مشخصات سطح‌محصول، و واریانت‌ها با موجودی/مشخصات‌شان — همه در همین یک
 * `include` تا فهرست ۲۴ محصولی به‌جای N+۱، حداکثر چند کوئری batched بزند
 * (بدون `include` تودرتو، هر محصول یک کوئری جدا برای واریانت و یکی برای
 * تصویر می‌زد؛ ر.ک. گزارش تسک برای عدد واقعی اندازه‌گیری‌شده).
 */
const PRODUCT_INCLUDE = {
  brand: true,
  category: true,
  images: { orderBy: { sortOrder: "asc" as const } },
  specifications: { include: { definition: true, value: true } },
  variants: {
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" as const },
    include: {
      inventory: true,
      specifications: { include: { definition: true, value: true } },
    },
  },
};

type ProductRow = Awaited<
  ReturnType<PrismaService["product"]["findFirstOrThrow"]>
> & {
  brand: { id: string; name: string; slug: string };
  category: { id: string; name: string; slug: string };
  images: {
    url: string;
    altText: string | null;
    sortOrder: number;
    isPrimary: boolean;
  }[];
  specifications: SpecRow[];
  variants: VariantRow[];
};

interface SpecRow {
  specificationDefinitionId: string;
  customValue: string | null;
  numericValue: unknown;
  definition: { nameFa: string; isVariantAxis: boolean };
  value: { value: string } | null;
}

interface VariantRow {
  id: string;
  sku: string;
  isDefault: boolean;
  finalPrice: bigint;
  compareAtPrice: bigint | null;
  isPreorder: boolean;
  inventory: {
    quantity: number;
    reservedQuantity: number;
    availableQuantity: number | null;
    lowStockThreshold: number | null;
  } | null;
  specifications: SpecRow[];
}

function specValueOf(spec: SpecRow): string {
  if (spec.value?.value) return spec.value.value;
  if (spec.customValue) return spec.customValue;
  if (spec.numericValue != null) return String(spec.numericValue);
  return "";
}

/** الحاقیه §۱ — محورهای پیکربندی و واریانت‌های عمومی یک محصول را با هم می‌سازد. */
function buildAxesAndVariants(
  variantRows: VariantRow[],
  globalThreshold: number,
): { variants: PublicVariant[]; variantAxes: VariantAxis[] } {
  const axisOrder: string[] = [];
  const axisMeta = new Map<string, { name: string; values: Set<string> }>();

  for (const v of variantRows) {
    for (const spec of v.specifications) {
      if (!spec.definition.isVariantAxis) continue;
      const value = specValueOf(spec);
      if (!value) continue;
      if (!axisMeta.has(spec.specificationDefinitionId)) {
        axisOrder.push(spec.specificationDefinitionId);
        axisMeta.set(spec.specificationDefinitionId, {
          name: spec.definition.nameFa,
          values: new Set(),
        });
      }
      axisMeta.get(spec.specificationDefinitionId)!.values.add(value);
    }
  }

  const axisRefsForLabel = axisOrder.map((specDefId) => ({ specDefId }));

  const variants: PublicVariant[] = variantRows.map((v) => {
    const axisValues: Record<string, string> = {};
    for (const spec of v.specifications) {
      if (!spec.definition.isVariantAxis) continue;
      const value = specValueOf(spec);
      if (value) axisValues[spec.specificationDefinitionId] = value;
    }
    return {
      id: v.id,
      sku: v.sku,
      label: buildVariantLabel(axisValues, axisRefsForLabel),
      axisValues,
      price: {
        final: Number(v.finalPrice),
        compareAt: v.compareAtPrice != null ? Number(v.compareAtPrice) : null,
      },
      availability: computeAvailability(
        v.inventory,
        v.isPreorder,
        globalThreshold,
      ),
    };
  });

  const variantAxes: VariantAxis[] = axisOrder.map((specDefId) => ({
    specDefId,
    name: axisMeta.get(specDefId)!.name,
    values: Array.from(axisMeta.get(specDefId)!.values),
  }));

  return { variants, variantAxes };
}

/** حداکثر چهار مشخصه — همان‌هایی که در کارت طراحی دیده می‌شوند (سند §۳، هشدار). */
function buildKeySpecs(specs: SpecRow[]): SpecificationItem[] {
  return specs
    .slice(0, 4)
    .map((spec) => ({ name: spec.definition.nameFa, value: specValueOf(spec) }))
    .filter((item) => item.value);
}

/**
 * تصمیم پیاده‌سازی T-150 — `SpecificationGroupSchema.groupName` در قرارداد
 * هست اما مدل داده هیچ فیلد گروه‌بندی ندارد؛ طبق طراحی واقعی صفحه‌ی محصول
 * (`Product.dc.html`) مشخصات یک آرایه‌ی تخت‌اند، پس یک گروه عمومی کافی است.
 */
function buildSpecGroups(specs: SpecRow[]) {
  const items = specs
    .map((spec) => ({ name: spec.definition.nameFa, value: specValueOf(spec) }))
    .filter((item) => item.value);
  if (items.length === 0) return [];
  return [{ groupName: "مشخصات فنی", items }];
}

function toBrandRef(product: ProductRow) {
  return {
    id: product.brand.id,
    name: product.brand.name,
    slug: product.brand.slug,
  };
}
function toCategoryRef(product: ProductRow) {
  return {
    id: product.category.id,
    name: product.category.name,
    slug: product.category.slug,
  };
}

/** الحاقیه §۲/§۳ — کارت فهرست؛ specFilters فعال یعنی defaultVariant باید اولین واریانت *منطبق* باشد. */
function buildProductCard(
  product: ProductRow,
  globalThreshold: number,
  specFilters?: Record<string, string>,
): ProductCard {
  const { variants } = buildAxesAndVariants(product.variants, globalThreshold);
  const actualDefaultId =
    product.variants.find((v) => v.isDefault)?.id ?? variants[0]!.id;
  const chosen = selectCardVariant(variants, actualDefaultId, specFilters);
  const primaryImage =
    product.images.find((img) => img.isPrimary) ?? product.images[0] ?? null;

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: toBrandRef(product),
    category: toCategoryRef(product),
    condition: product.condition as ProductConditionValue,
    image: primaryImage
      ? {
          url: primaryImage.url,
          alt: primaryImage.altText,
          order: primaryImage.sortOrder,
        }
      : null,
    keySpecs: buildKeySpecs(product.specifications),
    defaultVariant: {
      id: chosen.id,
      label: chosen.label,
      price: chosen.price.final,
      availability: chosen.availability,
    },
    hasMultipleVariants: variants.length > 1,
    variantCount: variants.length,
  };
}

/** §۸.۱۸، T-200/T-150. عمومی — بدون احراز هویت، فقط داده‌ی فعال/عمومی/حذف‌نشده. */
@Injectable()
export class CatalogService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * ⚠️ `slug: { not: "" }` — همان فیلتر دفاعی `getTopLevelCategoryCards()`
   * (ر.ک. کامنت آنجا، T-210 Q-1): این متد دقیقاً همان چیزی است که مگامنو
   * می‌خواند و طبق Q-1 همین الان یک کاشی با نام خراب/لینک نامعتبر آنجا
   * نشان می‌داد. حذف ردیف کار این تسک نیست؛ این فقط فیلتر است.
   */
  async getCategoryTree(): Promise<CategoryTreeNode[]> {
    const rows = await this.prisma.category.findMany({
      where: { isActive: true, deletedAt: null, slug: { not: "" } },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        imageMain: true,
      },
    });

    const byParent = new Map<string | null, typeof rows>();
    for (const row of rows) {
      const key = row.parentId;
      const bucket = byParent.get(key);
      if (bucket) bucket.push(row);
      else byParent.set(key, [row]);
    }

    const build = (parentId: string | null): CategoryTreeNode[] =>
      (byParent.get(parentId) ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        image: row.imageMain,
        children: build(row.id),
      }));

    return build(null);
  }

  /** همان معیار عمومی/فعال `listProducts` — یک‌بار تعریف، جای دیگر تکرار نمی‌شود. */
  private static readonly PUBLIC_CATEGORY_PRODUCT_WHERE = {
    status: "ACTIVE" as const,
    deletedAt: null,
    isVisibleOnSite: true,
    isVisibleInCategory: true,
  };

  private toCategoryCard(
    row: {
      id: string;
      name: string;
      slug: string;
      imageMain: string | null;
      description: string | null;
      _count: { products: number };
    },
    /** T-213 §۸ — فقط `getTopLevelCategoryCards()` این را واقعی حساب می‌کند؛ بقیه null می‌مانند (مصرف‌کننده‌شان قیمت نشان نمی‌دهد). */
    minPrice: number | null = null,
  ): CategoryCard {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      image: row.imageMain ? { url: row.imageMain, alt: row.name } : null,
      productCount: row._count.products,
      description: row.description,
      minPrice,
    };
  }

  /**
   * T-202 §۱.۱ — `GET /catalog/categories/top-level`، برای صفحه‌ی `/categories`.
   * ⚠️ `slug: { not: "" }` — یکی از ردیف‌های مشکوک dev که در T-210 Q-1
   * ثبت شد (نام mojibake، slug خالی) الان در همین کوئری هم ظاهر می‌شد و
   * روی این صفحه لینک شکسته (`/category/`) می‌ساخت. حذف ردیف از دیتابیس
   * کار این تسک نیست (تصمیم مدیر پروژه طبق Q-1)؛ این فقط فیلتر است، نه
   * تغییر داده.
   */
  async getTopLevelCategoryCards(): Promise<CategoryCard[]> {
    const rows = await this.prisma.category.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        parentId: null,
        slug: { not: "" },
      },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        imageMain: true,
        description: true,
        _count: {
          select: {
            products: { where: CatalogService.PUBLIC_CATEGORY_PRODUCT_WHERE },
          },
        },
      },
    });

    // T-213 §۸ — «از X میلیون»: کمترین finalPrice واریانتِ فعال هر محصول،
    // بعد کمترین بین محصولات همان دسته. یک کوئری برای همه‌ی دسته‌ها (نه N+1).
    const products = await this.prisma.product.findMany({
      where: {
        ...CatalogService.PUBLIC_CATEGORY_PRODUCT_WHERE,
        categoryId: { in: rows.map((r) => r.id) },
      },
      select: {
        categoryId: true,
        variants: {
          where: { deletedAt: null },
          select: { finalPrice: true },
          orderBy: { finalPrice: "asc" },
          take: 1,
        },
      },
    });
    const minPriceByCategory = new Map<string, number>();
    for (const p of products) {
      const cheapest = p.variants[0];
      if (!cheapest) continue;
      const price = Number(cheapest.finalPrice);
      const current = minPriceByCategory.get(p.categoryId);
      if (current === undefined || price < current) {
        minPriceByCategory.set(p.categoryId, price);
      }
    }

    return rows.map((row) =>
      this.toCategoryCard(row, minPriceByCategory.get(row.id) ?? null),
    );
  }

  /** T-201/T-150 — رزولوشن بلوک CATEGORY_GRID صفحه اصلی، حالا با کارت واقعی. */
  async getCategoryCardsByIds(ids: string[]): Promise<CategoryCard[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.category.findMany({
      where: { id: { in: ids }, isActive: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        imageMain: true,
        description: true,
        _count: {
          select: {
            products: { where: CatalogService.PUBLIC_CATEGORY_PRODUCT_WHERE },
          },
        },
      },
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    return ids
      .map((id) => byId.get(id))
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .map((row) => this.toCategoryCard(row));
  }

  /** T-210 §۴ — رزولوشن CATEGORY_GRID حالا با categorySlugs، نه categoryIds. */
  async getCategoryCardsBySlugs(slugs: string[]): Promise<CategoryCard[]> {
    if (slugs.length === 0) return [];
    const rows = await this.prisma.category.findMany({
      where: { slug: { in: slugs }, isActive: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        imageMain: true,
        description: true,
        _count: {
          select: {
            products: { where: CatalogService.PUBLIC_CATEGORY_PRODUCT_WHERE },
          },
        },
      },
    });
    const bySlug = new Map(rows.map((row) => [row.slug, row]));
    return slugs
      .map((slug) => bySlug.get(slug))
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .map((row) => this.toCategoryCard(row));
  }

  /** T-202 §۱.۲ — `GET /catalog/categories/:slug`، عمداً در T-150 ساخته نشده بود. */
  async getCategoryBySlug(slug: string): Promise<CategoryDetail> {
    const category = await this.prisma.category.findFirst({
      where: { slug, isActive: true, deletedAt: null },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: {
          where: { isActive: true, deletedAt: null },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            slug: true,
            imageMain: true,
            description: true,
            _count: {
              select: {
                products: {
                  where: CatalogService.PUBLIC_CATEGORY_PRODUCT_WHERE,
                },
              },
            },
          },
        },
        seo: true,
      },
    });

    if (!category) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "دسته‌بندی پیدا نشد.",
      });
    }

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageMain: category.imageMain,
      imageBanner: category.imageBanner,
      parent: category.parent
        ? {
            id: category.parent.id,
            name: category.parent.name,
            slug: category.parent.slug,
          }
        : null,
      children: category.children.map((child) => this.toCategoryCard(child)),
      seo: {
        title: category.seo?.metaTitle ?? null,
        description: category.seo?.metaDescription ?? null,
        canonical: category.seo?.canonical ?? null,
      },
    };
  }

  /**
   * T-150 §۸ — الحاقیه §۸: پاسخ `GET /content/homepage` باید محتوای حل‌شده
   * بدهد، نه ارجاع؛ PRODUCT_RAIL خودِ کارت‌ها را لازم دارد، پس ContentService
   * از همین متد (نه پیاده‌سازی جدا) استفاده می‌کند تا شکل کارت یکسان بماند.
   */
  async getProductCardsByIds(ids: string[]): Promise<ProductCard[]> {
    if (ids.length === 0) return [];
    const globalThreshold = await this.getGlobalLowStockThreshold();
    const products = (await this.prisma.product.findMany({
      where: {
        id: { in: ids },
        status: "ACTIVE",
        deletedAt: null,
        isVisibleOnSite: true,
      },
      include: PRODUCT_INCLUDE,
      relationLoadStrategy: "join",
    })) as unknown as ProductRow[];

    const byId = new Map(products.map((p) => [p.id, p]));
    return ids
      .map((id) => byId.get(id))
      .filter((p): p is ProductRow => Boolean(p))
      .map((p) => buildProductCard(p, globalThreshold));
  }

  /** T-210 §۴ — رزولوشن PRODUCT_RAIL/FLAGSHIP_DUEL حالا با productSlugs. */
  async getProductCardsBySlugs(slugs: string[]): Promise<ProductCard[]> {
    if (slugs.length === 0) return [];
    const globalThreshold = await this.getGlobalLowStockThreshold();
    const products = (await this.prisma.product.findMany({
      where: {
        slug: { in: slugs },
        status: "ACTIVE",
        deletedAt: null,
        isVisibleOnSite: true,
      },
      include: PRODUCT_INCLUDE,
      relationLoadStrategy: "join",
    })) as unknown as ProductRow[];

    const bySlug = new Map(products.map((p) => [p.slug, p]));
    return slugs
      .map((slug) => bySlug.get(slug))
      .filter((p): p is ProductRow => Boolean(p))
      .map((p) => buildProductCard(p, globalThreshold));
  }

  private async getGlobalLowStockThreshold(): Promise<number> {
    const setting = await this.prisma.setting.findUnique({
      where: { key: "inventory.lowStockThreshold" },
    });
    const value = setting?.value;
    return typeof value === "number" ? value : 3;
  }

  /** §۴ — فیلتر/مرتب‌سازی/صفحه‌بندی. قیمت روی واریانت اعمال می‌شود (حداقل یک واریانت در بازه). */
  async listProducts(
    query: ProductListQuery,
  ): Promise<{ items: ProductCard[]; total: number }> {
    const globalThreshold = await this.getGlobalLowStockThreshold();

    const variantConditions: Record<string, unknown>[] = [{ deletedAt: null }];
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      variantConditions.push({
        finalPrice: {
          ...(query.minPrice !== undefined && {
            gte: BigInt(query.minPrice),
          }),
          ...(query.maxPrice !== undefined && {
            lte: BigInt(query.maxPrice),
          }),
        },
      });
    }
    if (query.spec) {
      for (const [specDefId, value] of Object.entries(query.spec)) {
        variantConditions.push({
          specifications: {
            some: { specificationDefinitionId: specDefId, value: { value } },
          },
        });
      }
    }
    if (query.availability === "PREORDER") {
      variantConditions.push({ isPreorder: true });
    } else if (query.availability === "IN_STOCK") {
      variantConditions.push({
        isPreorder: false,
        inventory: { availableQuantity: { gt: 0 } },
      });
    }

    const where = {
      status: "ACTIVE" as const,
      deletedAt: null,
      isVisibleOnSite: true,
      isVisibleInCategory: true,
      ...(query.category && { category: { slug: query.category } }),
      ...(query.brand &&
        query.brand.length > 0 && { brand: { slug: { in: query.brand } } }),
      ...(query.condition && { condition: query.condition }),
      variants: { some: { AND: variantConditions } },
    };

    const products = (await this.prisma.product.findMany({
      where,
      include: PRODUCT_INCLUDE,
      relationLoadStrategy: "join",
    })) as unknown as ProductRow[];

    const rows = products.map((p) => ({
      card: buildProductCard(p, globalThreshold, query.spec),
      priority: p.priority,
      createdAt: p.createdAt,
    }));

    rows.sort((a, b) => {
      switch (query.sort) {
        case "price_asc":
          return a.card.defaultVariant.price - b.card.defaultVariant.price;
        case "price_desc":
          return b.card.defaultVariant.price - a.card.defaultVariant.price;
        case "popular":
        case "featured":
          return (
            b.priority - a.priority ||
            b.createdAt.getTime() - a.createdAt.getTime()
          );
        case "newest":
        default:
          return b.createdAt.getTime() - a.createdAt.getTime();
      }
    });

    const total = rows.length;
    const start = (query.page - 1) * query.perPage;
    const items = rows.slice(start, start + query.perPage).map((r) => r.card);

    return { items, total };
  }

  async getProductBySlug(slug: string): Promise<PublicProductDetail> {
    const globalThreshold = await this.getGlobalLowStockThreshold();

    const product = (await this.prisma.product.findFirst({
      where: {
        slug,
        status: "ACTIVE",
        deletedAt: null,
        isVisibleOnSite: true,
      },
      include: { ...PRODUCT_INCLUDE, seo: true },
      relationLoadStrategy: "join",
    })) as unknown as
      | (ProductRow & {
          seo: {
            metaTitle: string | null;
            metaDescription: string | null;
            canonical: string | null;
          } | null;
        })
      | null;

    if (!product) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "محصول پیدا نشد.",
      });
    }

    const { variants, variantAxes } = buildAxesAndVariants(
      product.variants,
      globalThreshold,
    );
    const defaultVariantId =
      product.variants.find((v) => v.isDefault)?.id ?? variants[0]!.id;

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      brand: toBrandRef(product),
      category: toCategoryRef(product),
      condition: product.condition as ProductConditionValue,
      images: product.images.map((img) => ({
        url: img.url,
        alt: img.altText,
        order: img.sortOrder,
      })),
      shortDescription: product.shortDescription,
      description: product.description,
      defaultVariantId,
      variantAxes,
      variants,
      specifications: buildSpecGroups(product.specifications),
      seo: {
        title: product.seo?.metaTitle ?? null,
        description: product.seo?.metaDescription ?? null,
        canonical: product.seo?.canonical ?? null,
      },
    };
  }

  /**
   * §۶.۱۱ — فیلترهای پویای فروشگاه: مشخصات SELECT/NUMBER، بازه‌ی قیمت،
   * برند، شرایط کالا. T-213 §۳ — `categorySlug` اختیاری: نبودش یعنی
   * `/products` (کل کاتالوگ) — بازه‌ی قیمت/برند/موجودی کل کاتالوگ حساب
   * می‌شود، ولی چون مشخصات (`SpecificationDefinition`) به یک دسته وابسته‌اند،
   * بدون دسته‌ی مشخص گروه مشخصات خالی برمی‌گردد (نه خطا).
   */
  async getFilters(categorySlug?: string) {
    let categoryId: string | undefined;
    if (categorySlug) {
      const category = await this.prisma.category.findFirst({
        where: { slug: categorySlug, isActive: true, deletedAt: null },
      });
      if (!category) {
        throw new NotFoundException({
          code: "NOT_FOUND",
          message: "دسته‌بندی پیدا نشد.",
        });
      }
      categoryId = category.id;
    }

    const baseWhere = {
      status: "ACTIVE" as const,
      deletedAt: null,
      isVisibleOnSite: true,
      isVisibleInCategory: true,
      ...(categoryId && { categoryId }),
    };

    const [definitions, products] = await Promise.all([
      categoryId
        ? this.prisma.specificationDefinition.findMany({
            where: { categoryId, isFilterable: true },
            orderBy: { sortOrder: "asc" },
          })
        : Promise.resolve([]),
      this.prisma.product.findMany({
        where: baseWhere,
        select: {
          id: true,
          condition: true,
          brand: { select: { id: true, name: true, slug: true } },
          specifications: {
            select: {
              specificationDefinitionId: true,
              customValue: true,
              numericValue: true,
              value: { select: { value: true } },
            },
          },
          variants: {
            where: { deletedAt: null },
            select: {
              finalPrice: true,
              specifications: {
                select: {
                  specificationDefinitionId: true,
                  customValue: true,
                  numericValue: true,
                  value: { select: { value: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    let min = Infinity;
    let max = -Infinity;
    const brandMap = new Map<
      string,
      { id: string; name: string; slug: string }
    >();
    /** T-213 §۳ — چیپ برند تعداد نشان می‌دهد («MSI ۳»). */
    const brandCounts = new Map<string, number>();
    const conditionSet = new Set<string>();
    const specValues = new Map<string, Map<string, Set<string>>>();
    const specNumericRange = new Map<string, { min: number; max: number }>();

    for (const p of products) {
      conditionSet.add(p.condition);
      brandMap.set(p.brand.id, p.brand);
      brandCounts.set(p.brand.id, (brandCounts.get(p.brand.id) ?? 0) + 1);

      const allSpecs = [...p.specifications];
      for (const v of p.variants) {
        const price = Number(v.finalPrice);
        if (price < min) min = price;
        if (price > max) max = price;
        allSpecs.push(...v.specifications);
      }

      for (const spec of allSpecs) {
        if (spec.value?.value) {
          const byValue =
            specValues.get(spec.specificationDefinitionId) ??
            new Map<string, Set<string>>();
          specValues.set(spec.specificationDefinitionId, byValue);
          const productIds = byValue.get(spec.value.value) ?? new Set<string>();
          byValue.set(spec.value.value, productIds);
          productIds.add(p.id);
        }
        if (spec.numericValue != null) {
          const n = Number(spec.numericValue);
          const current = specNumericRange.get(spec.specificationDefinitionId);
          if (!current) {
            specNumericRange.set(spec.specificationDefinitionId, {
              min: n,
              max: n,
            });
          } else {
            current.min = Math.min(current.min, n);
            current.max = Math.max(current.max, n);
          }
        }
      }
    }

    const specs = definitions.map((def) => {
      if (def.type === "NUMBER") {
        const range = specNumericRange.get(def.id);
        return {
          specDefId: def.id,
          name: def.nameFa,
          type: def.type,
          unit: def.unit,
          numericRange: range,
        };
      }
      const byValue = specValues.get(def.id);
      const options = byValue
        ? Array.from(byValue.entries()).map(([value, ids]) => ({
            value,
            count: ids.size,
          }))
        : [];
      return {
        specDefId: def.id,
        name: def.nameFa,
        type: def.type,
        unit: def.unit,
        options,
      };
    });

    return {
      specs,
      priceRange: {
        min: Number.isFinite(min) ? min : 0,
        max: Number.isFinite(max) ? max : 0,
      },
      brands: Array.from(brandMap.values()).map((b) => ({
        ...b,
        count: brandCounts.get(b.id) ?? 0,
      })),
      conditions: Array.from(conditionSet) as ProductConditionValue[],
    };
  }

  /**
   * جستجوی متنی ساده روی نام محصول/برند — بدون زیرساخت جستجوی رتبه‌بندی‌شده
   * (کش/ایندکس پیچیده لازم نیست، سند §۸). T-215 §۱ — تطبیق با
   * `normalizeSearchText` (نیم‌فاصله/ي-ك عربی/ارقام/حروف بزرگ-کوچک) روی هر
   * دو طرف انجام می‌شود، نه `contains` خام دیتابیس — چون نیم‌فاصله در مقدار
   * ذخیره‌شده هم هست و SQL `contains` نمی‌تواند نادیده‌اش بگیرد. حجم کاتالوگ
   * کوچک است (fetch کامل + فیلتر در JS بی‌خطر — همان الگوی این سرویس برای
   * فهرست/فیلتر).
   */
  async search(
    query: SearchQuery,
  ): Promise<{ items: ProductCard[]; total: number }> {
    const globalThreshold = await this.getGlobalLowStockThreshold();
    const needle = normalizeSearchText(query.q);

    const candidates = (await this.prisma.product.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
        isVisibleOnSite: true,
        isVisibleInSearch: true,
      },
      include: PRODUCT_INCLUDE,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    })) as unknown as ProductRow[];

    const products = candidates.filter(
      (p) =>
        normalizeSearchText(p.name).includes(needle) ||
        normalizeSearchText(p.brand.name).includes(needle),
    );

    const cards = products.map((p) => buildProductCard(p, globalThreshold));
    const total = cards.length;
    const start = (query.page - 1) * query.perPage;
    const items = cards.slice(start, start + query.perPage);

    return { items, total };
  }
}
