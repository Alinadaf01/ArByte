/**
 * D-02 §۴ — دیتابیس Nest (بعد از `pnpm db:seed`) را کامل می‌خواند و به
 * apps/backend/fixtures/arbyte-catalog.json می‌ریزد: همان ۵ دسته، ۱۸ محصول،
 * پرچم‌دارها، واریانت‌ها، مشخصات و بلوک‌های صفحه اصلی که فرانت رویش ساخته
 * و تست شده — تا manage.py seed_arbyte (Django) دقیقاً همان داده را بسازد و
 * تست برابری D-03 معنا داشته باشد.
 *
 * کلید طبیعی همه‌جا (slug/sku/key)، نه id خام Prisma (cuid) — چون Django
 * برای همه‌چیز شناسه‌ی عددی خودش را می‌سازد؛ manage.py seed_arbyte روابط را
 * با همین کلیدهای طبیعی resolve می‌کند، نه نگاشت id-به-id.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../prisma/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type SpecRow = {
  definitionKey: string;
  value: string | null;
  customValue: string | null;
  numericValue: string | null;
};

async function main() {
  // docs/QUESTIONS.md Q-1 — three leftover manual-test rows (mojibake
  // name/empty slug, "مانیتور"/manytvr, "لوازم جانبی موبایل") plus a
  // matching test brand sit in the dev DB, never deleted per that Q's own
  // "don't touch data you're unsure about" default. All four have zero
  // products, so filtering on "has at least one product" excludes them
  // without hardcoding their ids — the export should carry only the real,
  // in-use catalog the storefront was actually built against.
  const brands = await prisma.brand.findMany({
    where: { products: { some: {} } },
    orderBy: { name: "asc" },
  });

  const categories = await prisma.category.findMany({
    where: { products: { some: {} } },
    orderBy: { sortOrder: "asc" },
    include: { parent: { select: { slug: true } } },
  });

  // Same T-101-manual-test leftover pattern as Q-1's categories/brand: 17 of
  // 104 SpecificationDefinition rows are synthetic "مشخصه تست" /
  // "dup-key-<uuid>" artifacts. A further 34 "used-spec-<uuid>" /
  // "used-value-spec-<uuid>" rows are integration-test leftovers (see
  // arbyte skill note on dev-DB pollution from pre-T-210 test runs) — each
  // has exactly one ProductSpecification row attached, but that row's own
  // productId *and* variantId are both null (an orphan, satisfies neither
  // "product-level" nor "variant-level"), so `some: {}` alone doesn't
  // exclude them — the row exists, it's just attached to nothing real.
  // Requiring a non-null productId/variantId filters both leftover classes
  // out at once.
  const specDefinitions = await prisma.specificationDefinition.findMany({
    where: {
      productSpecifications: {
        some: {
          OR: [{ productId: { not: null } }, { variantId: { not: null } }],
        },
      },
    },
    orderBy: { sortOrder: "asc" },
    include: {
      category: { select: { slug: true } },
      values: { orderBy: { sortOrder: "asc" } },
    },
  });

  const products = await prisma.product.findMany({
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    include: {
      brand: { select: { slug: true } },
      category: { select: { slug: true } },
      images: { orderBy: { sortOrder: "asc" } },
      specifications: {
        where: { variantId: null },
        include: {
          definition: { select: { key: true } },
          value: { select: { value: true } },
        },
      },
      variants: {
        orderBy: { id: "asc" },
        include: {
          inventory: true,
          specifications: {
            include: {
              definition: { select: { key: true } },
              value: { select: { value: true } },
            },
          },
        },
      },
    },
  });

  const homepageBlocks = await prisma.homepageBlock.findMany({
    orderBy: { sortOrder: "asc" },
  });

  // FLAGSHIP_DUEL's `config.metrics` holds raw specificationDefinitionId
  // (cuid) values — meaningless once seeded into Django, which assigns its
  // own integer PKs. Every other id-shaped config value (productSlugs,
  // categorySlugs) is already a natural key; remap metrics the same way
  // (id -> key) here so manage.py seed_arbyte never has to special-case it.
  const specKeyById = new Map(specDefinitions.map((d) => [d.id, d.key]));
  const toPortableConfig = (
    block: (typeof homepageBlocks)[number],
  ): unknown => {
    if (
      block.type !== "FLAGSHIP_DUEL" ||
      !block.config ||
      typeof block.config !== "object"
    ) {
      return block.config;
    }
    const config = block.config as { metrics?: unknown; [k: string]: unknown };
    if (!Array.isArray(config.metrics)) return block.config;
    return {
      ...config,
      metrics: config.metrics.map((id) => specKeyById.get(id as string) ?? id),
    };
  };

  const toSpecRow = (s: {
    definition: { key: string };
    value: { value: string } | null;
    customValue: string | null;
    numericValue: unknown;
  }): SpecRow => ({
    definitionKey: s.definition.key,
    value: s.value?.value ?? null,
    customValue: s.customValue ?? null,
    numericValue:
      s.numericValue === null || s.numericValue === undefined
        ? null
        : String(s.numericValue),
  });

  const output = {
    exportedAt: new Date().toISOString(),
    brands: brands.map((b) => ({
      name: b.name,
      slug: b.slug,
      logoUrl: b.logoUrl,
      description: b.description,
      isActive: b.isActive,
    })),
    categories: categories.map((c) => ({
      slug: c.slug,
      name: c.name,
      parentSlug: c.parent?.slug ?? null,
      description: c.description,
      imageMain: c.imageMain,
      imageBanner: c.imageBanner,
      imageThumbnail: c.imageThumbnail,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
    })),
    specificationDefinitions: specDefinitions.map((d) => ({
      key: d.key,
      nameFa: d.nameFa,
      type: d.type,
      unit: d.unit,
      categorySlug: d.category?.slug ?? null,
      isRequired: d.isRequired,
      isFilterable: d.isFilterable,
      isSearchable: d.isSearchable,
      isVariantAxis: d.isVariantAxis,
      sortOrder: d.sortOrder,
      values: d.values.map((v) => ({
        value: v.value,
        swatchHex: v.swatchHex,
        sortOrder: v.sortOrder,
      })),
    })),
    products: products.map((p) => ({
      slug: p.slug,
      name: p.name,
      brandSlug: p.brand.slug,
      categorySlug: p.category.slug,
      modelNumber: p.modelNumber,
      gtin: p.gtin,
      partNumber: p.partNumber,
      description: p.description,
      shortDescription: p.shortDescription,
      condition: p.condition,
      status: p.status,
      isVisibleOnSite: p.isVisibleOnSite,
      isVisibleInSearch: p.isVisibleInSearch,
      isVisibleInCategory: p.isVisibleInCategory,
      returnPolicyNote: p.returnPolicyNote,
      shippingNote: p.shippingNote,
      priority: p.priority,
      images: p.images.map((img) => ({
        url: img.url,
        altText: img.altText,
        sortOrder: img.sortOrder,
        isPrimary: img.isPrimary,
      })),
      specifications: p.specifications.map(toSpecRow),
      variants: p.variants.map((v) => ({
        sku: v.sku,
        name: v.name,
        isDefault: v.isDefault,
        priceModel: v.priceModel,
        supplierPrice:
          v.supplierPrice === null ? null : String(v.supplierPrice),
        profitType: v.profitType,
        profitAmountToman:
          v.profitAmountToman === null ? null : String(v.profitAmountToman),
        profitPercentBasisPoints: v.profitPercentBasisPoints,
        finalPrice: String(v.finalPrice),
        compareAtPrice:
          v.compareAtPrice === null ? null : String(v.compareAtPrice),
        isPreorder: v.isPreorder,
        inventory: v.inventory
          ? {
              quantity: v.inventory.quantity,
              reservedQuantity: v.inventory.reservedQuantity,
              lowStockThreshold: v.inventory.lowStockThreshold,
            }
          : null,
        specifications: v.specifications.map(toSpecRow),
      })),
    })),
    homepageBlocks: homepageBlocks.map((b) => ({
      type: b.type,
      sortOrder: b.sortOrder,
      isActive: b.isActive,
      title: b.title,
      subtitle: b.subtitle,
      ctaLabel: b.ctaLabel,
      ctaUrl: b.ctaUrl,
      imageDesktop: b.imageDesktop,
      imageMobile: b.imageMobile,
      imageAlt: b.imageAlt,
      config: toPortableConfig(b),
      startsAt: b.startsAt ? b.startsAt.toISOString() : null,
      endsAt: b.endsAt ? b.endsAt.toISOString() : null,
    })),
  };

  const outPath = path.resolve(
    __dirname,
    "..",
    "..",
    "backend",
    "fixtures",
    "arbyte-catalog.json",
  );
  writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");

  console.log(
    `exported ${output.brands.length} brands, ${output.categories.length} categories, ` +
      `${output.specificationDefinitions.length} spec definitions, ${output.products.length} products ` +
      `(${output.products.reduce((n, p) => n + p.variants.length, 0)} variants), ` +
      `${output.homepageBlocks.length} homepage blocks -> ${outPath}`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
