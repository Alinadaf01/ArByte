/**
 * Seed پایه‌ی T-003 — نقش‌ها، مجوزها، سوپرادمین، تنظیمات پایه، ۳ دسته و
 * ۵ محصول نمونه (طبق خروجی‌های مورد انتظار سند تسک). idempotent است —
 * دوباره اجرا کردن، رکورد تکراری نمی‌سازد (upsert روی کلیدهای یکتا).
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

// Prisma 7 دیگر به‌صورت پیش‌فرض یک query engine باینری همراه ندارد — نیازمند
// Driver Adapter صریح است (همان چیزی که PrismaService واقعی در T-004 هم باید
// استفاده کند؛ ر.ک. docs/data-model.md).
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/** §۸.۱۱ — Granular، به‌علاوه‌ی users.impersonate (سند مقایسه‌ی وایب‌شاپ). */
const PERMISSION_DOMAINS: Record<string, readonly string[]> = {
  products: ["view", "create", "update", "delete"],
  categories: ["view", "create", "update", "delete"],
  brands: ["view", "create", "update", "delete"],
  specifications: ["view", "create", "update", "delete"],
  inventory: ["view", "update"],
  suppliers: ["view", "create", "update", "delete"],
  orders: ["view", "update"],
  payments: ["view", "update"],
  shipping: ["view", "update"],
  returns: ["view", "update"],
  users: ["view", "create", "update", "delete"],
  roles: ["view", "create", "update", "delete"],
  reviews: ["view", "update"],
  messages: ["view", "update"],
  coupons: ["view", "create", "update", "delete"],
  campaigns: ["view", "create", "update", "delete"],
  blog: ["view", "create", "update", "delete"],
  seo: ["view", "update"],
  settings: ["view", "update"],
  notifications: ["view"],
  logs: ["view"],
};

async function seedPermissionsAndSuperAdminRole() {
  const keys = Object.entries(PERMISSION_DOMAINS).flatMap(([domain, actions]) =>
    actions.map((action) => `${domain}.${action}`),
  );
  keys.push("users.impersonate");

  const permissions = await Promise.all(
    keys.map((key) =>
      prisma.permission.upsert({
        where: { key },
        create: { key },
        update: {},
      }),
    ),
  );

  const superAdminRole = await prisma.role.upsert({
    where: { name: "مدیر ارشد" },
    create: {
      name: "مدیر ارشد",
      description: "دسترسی کامل — Super Admin (§۸.۱۴)",
    },
    update: {},
  });

  await Promise.all(
    permissions.map((permission) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: superAdminRole.id,
            permissionId: permission.id,
          },
        },
        create: { roleId: superAdminRole.id, permissionId: permission.id },
        update: {},
      }),
    ),
  );

  return superAdminRole;
}

async function seedSuperAdminUser(superAdminRoleId: string) {
  const admin = await prisma.user.upsert({
    where: { mobile: "09120000000" },
    create: {
      mobile: "09120000000",
      firstName: "مدیر",
      lastName: "سیستم",
      status: "ACTIVE",
    },
    update: {},
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: superAdminRoleId } },
    create: { userId: admin.id, roleId: superAdminRoleId },
    update: {},
  });

  return admin;
}

async function seedSettings() {
  // §الحاقیه بخش ۲ — اقساط: فیلدها الان، منطق بعداً. §سند مقایسه‌ی وایب‌شاپ
  // ۲.۴ — آستانه‌ی سراسری موجودی کم (پیش‌فرض هر ردیف Inventory).
  const entries: { key: string; value: unknown; category: string }[] = [
    { key: "installments.enabled", value: false, category: "installments" },
    { key: "installments.maxCount", value: 12, category: "installments" },
    {
      key: "installments.minAmount",
      value: "50000000",
      category: "installments",
    },
    { key: "installments.provider", value: null, category: "installments" },
    { key: "inventory.lowStockThreshold", value: 3, category: "inventory" },
  ];

  await Promise.all(
    entries.map((entry) =>
      prisma.setting.upsert({
        where: { key: entry.key },
        create: {
          key: entry.key,
          value: entry.value as never,
          category: entry.category,
        },
        update: {},
      }),
    ),
  );
}

async function seedWarehouse() {
  const existing = await prisma.warehouse.findFirst({
    where: { isDefault: true },
  });
  if (existing) return existing;
  return prisma.warehouse.create({
    data: { name: "انبار تهران", city: "تهران", isDefault: true },
  });
}

async function seedGlobalPriceRule() {
  const existing = await prisma.priceRule.findFirst({
    where: { supplierId: null, categoryId: null },
  });
  if (existing) return existing;
  // تصمیم د — Global Default: ۱۰٪ سود پیش‌فرض وقتی هیچ قانون اختصاصی‌تری
  // (محصول/همکار/دسته‌بندی) ست نشده باشد. ۱۰٪ = ۱۰۰۰ Basis Point.
  return prisma.priceRule.create({
    data: { profitType: "PERCENT", profitPercentBasisPoints: 1000 },
  });
}

/**
 * slug فقط با Partial Unique Index (WHERE deletedAt IS NULL) یکتاست — که با
 * SQL خام اضافه شده، نه در schema.prisma (`@unique`). یعنی Prisma Client آن
 * را «یکتا» نمی‌شناسد و upsert/findUnique روی slug به‌تنهایی کار نمی‌کند؛
 * برای همین الگوی findFirst+create دستی لازم است (همان الگویی که برای
 * Product هم پایین‌تر استفاده شده).
 */
async function findOrCreateCategory(data: {
  name: string;
  slug: string;
  parentId?: string;
}) {
  const existing = await prisma.category.findFirst({
    where: { slug: data.slug },
  });
  return existing ?? prisma.category.create({ data });
}

async function seedCatalog(warehouseId: string) {
  const laptopCategory = await findOrCreateCategory({
    name: "لپ‌تاپ",
    slug: "laptop",
  });

  const gamingLaptopCategory = await findOrCreateCategory({
    name: "لپ‌تاپ گیمینگ",
    slug: "gaming-laptop",
    parentId: laptopCategory.id,
  });

  const peripheralsCategory = await findOrCreateCategory({
    name: "کیبورد و موس",
    slug: "keyboard-mouse",
  });

  const asus = await prisma.brand.upsert({
    where: { name: "ASUS" },
    create: { name: "ASUS", slug: "asus" },
    update: {},
  });
  const lenovo = await prisma.brand.upsert({
    where: { name: "Lenovo" },
    create: { name: "Lenovo", slug: "lenovo" },
    update: {},
  });
  const logitech = await prisma.brand.upsert({
    where: { name: "Logitech" },
    create: { name: "Logitech", slug: "logitech" },
    update: {},
  });

  const ramSpec = await prisma.specificationDefinition.upsert({
    where: { key: "ram" },
    create: {
      key: "ram",
      nameFa: "حافظه رم",
      type: "SELECT",
      unit: "GB",
      isFilterable: true,
      isVariantAxis: true,
      categoryId: gamingLaptopCategory.id,
    },
    update: {},
  });
  const storageSpec = await prisma.specificationDefinition.upsert({
    where: { key: "storage" },
    create: {
      key: "storage",
      nameFa: "فضای ذخیره‌سازی",
      type: "SELECT",
      unit: "TB",
      isFilterable: true,
      isVariantAxis: true,
      categoryId: gamingLaptopCategory.id,
    },
    update: {},
  });

  async function upsertProductWithVariants(input: {
    slug: string;
    name: string;
    brandId: string;
    categoryId: string;
    modelNumber: string;
    variants: {
      sku: string;
      name?: string;
      isDefault: boolean;
      finalPrice: bigint;
      ramGb?: number;
      storageTb?: number;
    }[];
  }) {
    const existing = await prisma.product.findFirst({
      where: { slug: input.slug },
    });
    const product =
      existing ??
      (await prisma.product.create({
        data: {
          name: input.name,
          slug: input.slug,
          brandId: input.brandId,
          categoryId: input.categoryId,
          modelNumber: input.modelNumber,
          condition: "NEW",
          priority: 0,
        },
      }));

    for (const v of input.variants) {
      // sku هم مثل slug فقط Partial Unique است — همان الگوی findFirst+create.
      const existingVariant = await prisma.productVariant.findFirst({
        where: { sku: v.sku },
      });
      const variant =
        existingVariant ??
        (await prisma.productVariant.create({
          data: {
            productId: product.id,
            sku: v.sku,
            name: v.name,
            isDefault: v.isDefault,
            priceModel: "FIXED",
            finalPrice: v.finalPrice,
          },
        }));

      await prisma.inventory.upsert({
        where: {
          variantId_warehouseId: { variantId: variant.id, warehouseId },
        },
        create: {
          variantId: variant.id,
          warehouseId,
          quantity: 10,
          reservedQuantity: 0,
        },
        update: {},
      });

      if (v.ramGb && !existingVariant) {
        const value = await prisma.specificationValue.upsert({
          where: { id: `seed-ram-${v.ramGb}gb` },
          create: {
            id: `seed-ram-${v.ramGb}gb`,
            specificationDefinitionId: ramSpec.id,
            value: `${v.ramGb}GB`,
          },
          update: {},
        });
        await prisma.productSpecification.create({
          data: {
            specificationDefinitionId: ramSpec.id,
            specificationValueId: value.id,
            numericValue: v.ramGb,
            variantId: variant.id,
          },
        });
      }
      if (v.storageTb && !existingVariant) {
        const value = await prisma.specificationValue.upsert({
          where: { id: `seed-storage-${v.storageTb}tb` },
          create: {
            id: `seed-storage-${v.storageTb}tb`,
            specificationDefinitionId: storageSpec.id,
            value: `${v.storageTb}TB`,
          },
          update: {},
        });
        await prisma.productSpecification.create({
          data: {
            specificationDefinitionId: storageSpec.id,
            specificationValueId: value.id,
            numericValue: v.storageTb,
            variantId: variant.id,
          },
        });
      }
    }

    return product;
  }

  await upsertProductWithVariants({
    slug: "asus-rog-strix-g16",
    name: "ASUS ROG Strix G16",
    brandId: asus.id,
    categoryId: gamingLaptopCategory.id,
    modelNumber: "G16",
    variants: [
      {
        sku: "ARB-ASUS-G16-16-512",
        name: "۱۶GB · ۵۱۲GB",
        isDefault: false,
        finalPrice: 261_000_000n,
        ramGb: 16,
        storageTb: 1,
      },
      {
        sku: "ARB-ASUS-G16-32-1TB",
        name: "۳۲GB · ۱TB",
        isDefault: true,
        finalPrice: 289_500_000n,
        ramGb: 32,
        storageTb: 1,
      },
    ],
  });

  await upsertProductWithVariants({
    slug: "asus-rog-zephyrus-g14",
    name: "ASUS ROG Zephyrus G14",
    brandId: asus.id,
    categoryId: gamingLaptopCategory.id,
    modelNumber: "G14",
    variants: [
      {
        sku: "ARB-ASUS-G14-DEFAULT",
        isDefault: true,
        finalPrice: 333_000_000n,
      },
    ],
  });

  await upsertProductWithVariants({
    slug: "lenovo-ideapad-slim-5",
    name: "Lenovo IdeaPad Slim 5",
    brandId: lenovo.id,
    categoryId: laptopCategory.id,
    modelNumber: "Slim5",
    variants: [
      {
        sku: "ARB-LENOVO-SLIM5-DEFAULT",
        isDefault: true,
        finalPrice: 89_900_000n,
      },
    ],
  });

  await upsertProductWithVariants({
    slug: "logitech-mx-master-3s",
    name: "Logitech MX Master 3S",
    brandId: logitech.id,
    categoryId: peripheralsCategory.id,
    modelNumber: "MX Master 3S",
    variants: [
      {
        sku: "ARB-LOGI-MXM3S-DEFAULT",
        isDefault: true,
        finalPrice: 6_450_000n,
      },
    ],
  });

  await upsertProductWithVariants({
    slug: "logitech-g-pro-x",
    name: "Logitech G Pro X",
    brandId: logitech.id,
    categoryId: peripheralsCategory.id,
    modelNumber: "G Pro X",
    variants: [
      {
        sku: "ARB-LOGI-GPROX-DEFAULT",
        isDefault: true,
        finalPrice: 5_200_000n,
      },
    ],
  });
}

async function main() {
  const superAdminRole = await seedPermissionsAndSuperAdminRole();
  await seedSuperAdminUser(superAdminRole.id);
  await seedSettings();
  const warehouse = await seedWarehouse();
  await seedGlobalPriceRule();
  await seedCatalog(warehouse.id);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
