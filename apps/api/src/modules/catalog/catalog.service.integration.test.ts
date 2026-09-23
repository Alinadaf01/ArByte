/**
 * تست یکپارچگی روی دیتابیس محلی واقعی — معیارهای پذیرش صریح T-150:
 * فیلتر روی مشخصه‌ی محور defaultVariant را عوض می‌کند (نه واریانت پیش‌فرض
 * واقعی محصول)، محصول غیرفعال/حذف‌شده در پاسخ عمومی نمی‌آید، و هیچ فیلد
 * سود/قیمت همکار در خروجی سرویس دیده نمی‌شود (لایه‌ی دوم پس از تست Zod در
 * packages/contracts/src/catalog/product-security.test.ts).
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { NotFoundException } from "@nestjs/common";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaService } from "../../prisma/prisma.service";
import { CatalogService } from "./catalog.service";

const prisma = new PrismaService();
const catalogService = new CatalogService(prisma);

afterAll(async () => {
  await prisma.$disconnect();
});

describe("CatalogService.getCategoryTree", () => {
  it("فقط دسته‌بندی‌های فعال و حذف‌نشده را با تودرتویی درست برمی‌گرداند", async () => {
    const suffix = randomUUID();
    const root = await prisma.category.create({
      data: {
        name: `Root ${suffix}`,
        slug: `root-${suffix}`,
        sortOrder: 0,
        isActive: true,
      },
    });
    const child = await prisma.category.create({
      data: {
        name: `Child ${suffix}`,
        slug: `child-${suffix}`,
        parentId: root.id,
        sortOrder: 0,
        isActive: true,
      },
    });
    const inactive = await prisma.category.create({
      data: {
        name: `Inactive ${suffix}`,
        slug: `inactive-${suffix}`,
        sortOrder: 0,
        isActive: false,
      },
    });
    const deleted = await prisma.category.create({
      data: {
        name: `Deleted ${suffix}`,
        slug: `deleted-${suffix}`,
        sortOrder: 0,
        isActive: true,
        deletedAt: new Date(),
      },
    });

    const tree = await catalogService.getCategoryTree();

    const rootNode = tree.find((n) => n.id === root.id);
    expect(rootNode).toBeDefined();
    expect(rootNode?.children.map((c) => c.id)).toEqual([child.id]);
    expect(tree.find((n) => n.id === inactive.id)).toBeUndefined();
    expect(tree.find((n) => n.id === deleted.id)).toBeUndefined();
  });
});

describe("CatalogService — الحاقیه §۳: فیلتر مشخصه‌ی محور", () => {
  it("وقتی spec[<ramId>] فعال است، defaultVariant اولین واریانت *منطبق* است، نه واریانت پیش‌فرض واقعی محصول", async () => {
    const ramSpec = await prisma.specificationDefinition.findFirstOrThrow({
      where: { key: "ram-gaming" },
    });

    // واریانت پیش‌فرض واقعی این محصول ۶۴GB/۲TB (۲۸۹۵۰۰۰۰۰) است — سند تسک
    // دقیقاً همین مثال را زده: کاربر روی «۳۲GB» کلیک می‌کند و نباید صفحه با
    // قیمت ۶۴GB باز شود. فیلتر category تا محصولات fixture تست‌های دیگر
    // (که createdAt جدیدتری دارند و صفحه‌ی اول sort=newest را پر می‌کنند)
    // نتیجه را رقیق نکنند.
    const { items: withoutFilter } = await catalogService.listProducts({
      page: 1,
      perPage: 24,
      sort: "newest",
      category: "gaming-laptop",
    });
    const cardWithoutFilter = withoutFilter.find(
      (c) => c.slug === "msi-titan-18-hx",
    );
    expect(cardWithoutFilter?.defaultVariant.price).toBe(289_500_000);

    const { items: withFilter } = await catalogService.listProducts({
      page: 1,
      perPage: 24,
      sort: "newest",
      category: "gaming-laptop",
      spec: { [ramSpec.id]: "۳۲GB" },
    });
    const cardWithFilter = withFilter.find((c) => c.slug === "msi-titan-18-hx");
    expect(cardWithFilter?.defaultVariant.price).toBe(261_000_000);
    expect(cardWithFilter?.defaultVariant.label).toBe("۳۲GB · ۱TB");
  });
});

describe("CatalogService — دید عمومی: محصول غیرفعال/حذف‌شده نمایش داده نمی‌شود", () => {
  it("محصول status=INACTIVE در فهرست و جزئیات نمی‌آید", async () => {
    const category = await prisma.category.findFirstOrThrow({
      where: { slug: "keyboard-mouse" },
    });
    const brand = await prisma.brand.findFirstOrThrow({
      where: { slug: "keychron" },
    });
    const slug = `inactive-test-${randomUUID()}`;
    const product = await prisma.product.create({
      data: {
        name: "Inactive Test Product",
        slug,
        brandId: brand.id,
        categoryId: category.id,
        condition: "NEW",
        status: "INACTIVE",
        variants: {
          create: {
            sku: `SKU-${randomUUID()}`,
            isDefault: true,
            priceModel: "FIXED",
            finalPrice: 1_000_000,
          },
        },
      },
    });

    const { items } = await catalogService.listProducts({
      page: 1,
      perPage: 60,
      sort: "newest",
    });
    expect(items.find((c) => c.id === product.id)).toBeUndefined();

    await expect(catalogService.getProductBySlug(slug)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("محصول deletedAt پرشده در فهرست نمی‌آید", async () => {
    const category = await prisma.category.findFirstOrThrow({
      where: { slug: "keyboard-mouse" },
    });
    const brand = await prisma.brand.findFirstOrThrow({
      where: { slug: "keychron" },
    });
    const slug = `deleted-test-${randomUUID()}`;
    const product = await prisma.product.create({
      data: {
        name: "Deleted Test Product",
        slug,
        brandId: brand.id,
        categoryId: category.id,
        condition: "NEW",
        status: "ACTIVE",
        deletedAt: new Date(),
        variants: {
          create: {
            sku: `SKU-${randomUUID()}`,
            isDefault: true,
            priceModel: "FIXED",
            finalPrice: 1_000_000,
          },
        },
      },
    });

    const { items } = await catalogService.listProducts({
      page: 1,
      perPage: 60,
      sort: "newest",
    });
    expect(items.find((c) => c.id === product.id)).toBeUndefined();
  });
});

describe("CatalogService — هرگز فیلد سود/قیمت همکار را در خروجی نمی‌گذارد", () => {
  it("JSON.stringify روی defaultVariant محصول واقعی هیچ فیلد حساسی ندارد", async () => {
    const { items } = await catalogService.listProducts({
      page: 1,
      perPage: 5,
      sort: "newest",
    });
    const json = JSON.stringify(items);
    expect(json).not.toContain("supplierPrice");
    expect(json).not.toContain("profitType");
    expect(json).not.toContain("profitAmountToman");
    expect(json).not.toContain("profitPercentBasisPoints");
  });

  it("جزئیات محصول هم همین‌طور", async () => {
    const detail = await catalogService.getProductBySlug("msi-titan-18-hx");
    const json = JSON.stringify(detail);
    expect(json).not.toContain("supplierPrice");
    expect(json).not.toContain("profitType");
    expect(json).not.toContain("profitAmountToman");
    expect(json).not.toContain("profitPercentBasisPoints");
  });
});

describe("CatalogService.getCategoryBySlug — T-202 §۱.۲", () => {
  it("والد (breadcrumb) و زیردسته‌ها به‌صورت کارت (با productCount) برمی‌گرداند", async () => {
    const detail = await catalogService.getCategoryBySlug("gaming-laptop");
    expect(detail.slug).toBe("gaming-laptop");
    expect(detail.parent).toBeNull();
    // gaming-laptop زیردسته ندارد در seed فعلی — آرایه‌ی خالی، نه خطا.
    expect(Array.isArray(detail.children)).toBe(true);
  });

  it("slug نامعتبر NotFoundException می‌دهد", async () => {
    await expect(
      catalogService.getCategoryBySlug(`does-not-exist-${randomUUID()}`),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("CatalogService.getTopLevelCategoryCards / getCategoryCardsByIds — T-202 §۱.۱", () => {
  it("فقط دسته‌های سطح یک را با productCount درست برمی‌گرداند", async () => {
    const cards = await catalogService.getTopLevelCategoryCards();
    const gaming = cards.find((c) => c.slug === "gaming-laptop");
    expect(gaming).toBeDefined();
    expect(gaming?.productCount).toBeGreaterThanOrEqual(6);
    expect(gaming?.image).not.toBeNull();
  });

  it("productCount فقط محصولات عمومی/فعال را می‌شمارد", async () => {
    const category = await prisma.category.findFirstOrThrow({
      where: { slug: "keyboard-mouse" },
    });
    const brand = await prisma.brand.findFirstOrThrow({
      where: { slug: "keychron" },
    });
    const before = await catalogService.getCategoryCardsByIds([category.id]);
    const countBefore = before[0]?.productCount ?? 0;

    await prisma.product.create({
      data: {
        name: "Hidden Count Test Product",
        slug: `hidden-count-test-${randomUUID()}`,
        brandId: brand.id,
        categoryId: category.id,
        condition: "NEW",
        status: "INACTIVE",
        variants: {
          create: {
            sku: `SKU-${randomUUID()}`,
            isDefault: true,
            priceModel: "FIXED",
            finalPrice: 1_000_000,
          },
        },
      },
    });

    const after = await catalogService.getCategoryCardsByIds([category.id]);
    expect(after[0]?.productCount).toBe(countBefore);
  });
});
