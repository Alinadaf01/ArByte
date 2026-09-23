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
  /** صفحه‌ی اصلی (HomepageBlock) — سند مقایسه‌ی وایب‌شاپ + الحاقیه T-004 §۸. */
  content: ["view", "create", "update", "delete"],
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
  // §سند مقایسه‌ی وایب‌شاپ ۲.۴ — آستانه‌ی سراسری موجودی کم (پیش‌فرض هر ردیف Inventory).
  const entries: { key: string; value: unknown; category: string }[] = [
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

/** بند ۷ سند T-150 — یک تعریف مشخصه (بدون SpecificationValue؛ آن جدا مدیریت می‌شود). */
async function defineSpec(input: {
  key: string;
  nameFa: string;
  type: "TEXT" | "NUMBER" | "SELECT";
  categoryId?: string;
  unit?: string;
  isVariantAxis?: boolean;
}) {
  // TEXT آزاد (پردازنده/گرافیک/...) برای فیلتر چندگزینه‌ای مناسب نیست — فقط
  // SELECT/NUMBER (که واقعاً گزینه‌ی محدود یا بازه‌ی عددی دارند) isFilterable
  // می‌شوند. GET /catalog/filters این را مصرف می‌کند.
  const isFilterable = input.type === "SELECT" || input.type === "NUMBER";
  return prisma.specificationDefinition.upsert({
    where: { key: input.key },
    create: {
      key: input.key,
      nameFa: input.nameFa,
      type: input.type,
      unit: input.unit,
      categoryId: input.categoryId,
      isFilterable,
      isSearchable: input.type === "TEXT",
      isVariantAxis: input.isVariantAxis ?? false,
    },
    update: { isFilterable },
  });
}

/** برای مقادیر SELECT از پیش تعریف‌شده (رم/فضای ذخیره‌سازی/سوییچ/اتصال). */
async function specValue(definitionId: string, value: string) {
  const id = `seed-${definitionId}-${value}`;
  return prisma.specificationValue.upsert({
    where: { id },
    create: { id, specificationDefinitionId: definitionId, value },
    update: {},
  });
}

interface VariantAxisInput {
  definitionId: string;
  value: string;
}

interface VariantSeedInput {
  sku: string;
  isDefault: boolean;
  finalPrice: bigint;
  compareAtPrice?: bigint;
  axes?: VariantAxisInput[];
  /** `undefined` یعنی موجود عادی؛ `"OUT_OF_STOCK"`/`"PREORDER"` حالت‌های خاص. */
  stock: { quantity: number; reserved?: number } | "OUT_OF_STOCK" | "PREORDER";
}

interface ProductSeedInput {
  slug: string;
  name: string;
  brandId: string;
  categoryId: string;
  modelNumber: string;
  condition: "NEW" | "OPEN_BOX" | "STOCK" | "LIKE_NEW";
  shortDescription: string;
  description: string;
  priority?: number;
  image: string;
  /** مشخصات مشترک TEXT/NUMBER — customValue آزاد (سطح محصول). */
  specs: { definitionId: string; value: string }[];
  /** مشخصات مشترک SELECT — از `SpecificationValue` از پیش تعریف‌شده (سطح محصول). */
  selectSpecs?: { definitionId: string; value: string }[];
  /** مشخصات مشترک NUMBER با `numericValue` واقعی (برای فیلتر بازه‌ای). */
  numericSpecs?: { definitionId: string; value: number }[];
  variants: VariantSeedInput[];
}

/**
 * بند ۷ سند T-150 — یک محصول کامل با واریانت(ها)، موجودی، مشخصات، تصویر و
 * SEO پایه. idempotent (findFirst+create روی slug/sku، همان الگوی موجود).
 */
async function seedProduct(input: ProductSeedInput) {
  const existingProduct = await prisma.product.findFirst({
    where: { slug: input.slug },
  });
  const product =
    existingProduct ??
    (await prisma.product.create({
      data: {
        name: input.name,
        slug: input.slug,
        brandId: input.brandId,
        categoryId: input.categoryId,
        modelNumber: input.modelNumber,
        condition: input.condition,
        status: "ACTIVE",
        priority: input.priority ?? 0,
        shortDescription: input.shortDescription,
        description: input.description,
      },
    }));

  if (!existingProduct) {
    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: `/seed-images/${input.image}.svg`,
        altText: `تصویر نمونه‌ی ${input.name} — عکس واقعی جایگزین می‌شود`,
        sortOrder: 0,
        isPrimary: true,
      },
    });

    for (const spec of input.specs) {
      await prisma.productSpecification.create({
        data: {
          specificationDefinitionId: spec.definitionId,
          customValue: spec.value,
          productId: product.id,
        },
      });
    }

    for (const spec of input.selectSpecs ?? []) {
      const value = await specValue(spec.definitionId, spec.value);
      await prisma.productSpecification.create({
        data: {
          specificationDefinitionId: spec.definitionId,
          specificationValueId: value.id,
          productId: product.id,
        },
      });
    }

    for (const spec of input.numericSpecs ?? []) {
      await prisma.productSpecification.create({
        data: {
          specificationDefinitionId: spec.definitionId,
          numericValue: spec.value,
          productId: product.id,
        },
      });
    }
  }

  for (const v of input.variants) {
    const existingVariant = await prisma.productVariant.findFirst({
      where: { sku: v.sku },
    });
    const axisLabel = (v.axes ?? []).map((a) => a.value).join(" · ") || null;
    const variant =
      existingVariant ??
      (await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku: v.sku,
          name: axisLabel,
          isDefault: v.isDefault,
          priceModel: "FIXED",
          finalPrice: v.finalPrice,
          compareAtPrice: v.compareAtPrice,
          isPreorder: v.stock === "PREORDER",
        },
      }));

    if (!existingVariant) {
      const quantity =
        v.stock === "OUT_OF_STOCK" || v.stock === "PREORDER"
          ? 0
          : v.stock.quantity;
      const reserved =
        v.stock === "OUT_OF_STOCK" || v.stock === "PREORDER"
          ? 0
          : (v.stock.reserved ?? 0);
      await prisma.inventory.create({
        data: {
          variantId: variant.id,
          quantity,
          reservedQuantity: reserved,
        },
      });

      for (const axis of v.axes ?? []) {
        const value = await specValue(axis.definitionId, axis.value);
        await prisma.productSpecification.create({
          data: {
            specificationDefinitionId: axis.definitionId,
            specificationValueId: value.id,
            variantId: variant.id,
          },
        });
      }
    }
  }

  return product;
}

/** بند ۷ سند T-150 — سه دسته، پنج برند، ۱۸ محصول (پنج تا با پیکربندی). */
async function seedCatalog() {
  const gamingCategory = await findOrCreateCategory({
    name: "لپ‌تاپ گیمینگ",
    slug: "gaming-laptop",
  });
  const workstationCategory = await findOrCreateCategory({
    name: "سرفیس و ورک‌استیشن",
    slug: "surface-workstation",
  });
  const peripheralsCategory = await findOrCreateCategory({
    name: "کیبورد و موس",
    slug: "keyboard-mouse",
  });

  const brand = async (name: string, slug: string) =>
    prisma.brand.upsert({
      where: { name },
      create: { name, slug },
      update: {},
    });
  const msi = await brand("MSI", "msi");
  const asus = await brand("ASUS", "asus");
  const lenovo = await brand("Lenovo", "lenovo");
  const microsoft = await brand("Microsoft", "microsoft");
  const keychron = await brand("Keychron", "keychron");

  // ---- مشخصات: لپ‌تاپ گیمینگ ----
  const cpuGaming = await defineSpec({
    key: "cpu-gaming",
    nameFa: "پردازنده",
    type: "TEXT",
    categoryId: gamingCategory.id,
  });
  const gpuGaming = await defineSpec({
    key: "gpu-gaming",
    nameFa: "گرافیک",
    type: "TEXT",
    categoryId: gamingCategory.id,
  });
  const displayGaming = await defineSpec({
    key: "display-gaming",
    nameFa: "نمایشگر",
    type: "TEXT",
    categoryId: gamingCategory.id,
  });
  const weightGaming = await defineSpec({
    key: "weight-gaming",
    nameFa: "وزن",
    type: "TEXT",
    categoryId: gamingCategory.id,
  });
  const ramGaming = await defineSpec({
    key: "ram-gaming",
    nameFa: "حافظه رم",
    type: "SELECT",
    categoryId: gamingCategory.id,
    isVariantAxis: true,
  });
  const storageGaming = await defineSpec({
    key: "storage-gaming",
    nameFa: "فضای ذخیره‌سازی",
    type: "SELECT",
    categoryId: gamingCategory.id,
    isVariantAxis: true,
  });

  // ---- مشخصات: سرفیس و ورک‌استیشن ----
  const cpuWs = await defineSpec({
    key: "cpu-ws",
    nameFa: "پردازنده",
    type: "TEXT",
    categoryId: workstationCategory.id,
  });
  const gpuWs = await defineSpec({
    key: "gpu-ws",
    nameFa: "گرافیک",
    type: "TEXT",
    categoryId: workstationCategory.id,
  });
  const displayWs = await defineSpec({
    key: "display-ws",
    nameFa: "نمایشگر",
    type: "TEXT",
    categoryId: workstationCategory.id,
  });
  const weightWs = await defineSpec({
    key: "weight-ws",
    nameFa: "وزن",
    type: "TEXT",
    categoryId: workstationCategory.id,
  });
  const ramWs = await defineSpec({
    key: "ram-ws",
    nameFa: "حافظه رم",
    type: "SELECT",
    categoryId: workstationCategory.id,
    isVariantAxis: true,
  });
  const storageWs = await defineSpec({
    key: "storage-ws",
    nameFa: "فضای ذخیره‌سازی",
    type: "SELECT",
    categoryId: workstationCategory.id,
    isVariantAxis: true,
  });

  // ---- مشخصات: کیبورد و موس ----
  const switchType = await defineSpec({
    key: "switch-type",
    nameFa: "نوع سوییچ",
    type: "SELECT",
    categoryId: peripheralsCategory.id,
  });
  const connectivity = await defineSpec({
    key: "connectivity",
    nameFa: "نوع اتصال",
    type: "SELECT",
    categoryId: peripheralsCategory.id,
  });
  const layout = await defineSpec({
    key: "layout",
    nameFa: "چیدمان کلید",
    type: "TEXT",
    categoryId: peripheralsCategory.id,
  });
  const battery = await defineSpec({
    key: "battery",
    nameFa: "عمر باتری",
    type: "TEXT",
    categoryId: peripheralsCategory.id,
  });
  const dpi = await defineSpec({
    key: "dpi",
    nameFa: "دقت سنسور",
    type: "NUMBER",
    unit: "DPI",
    categoryId: peripheralsCategory.id,
  });
  // مقادیر از پیش تعریف‌شده‌ی سوییچ/اتصال (برای فیلتر با شمارش گزینه‌ها).
  await specValue(switchType.id, "مکانیکی — قرمز");
  await specValue(switchType.id, "مکانیکی — قهوه‌ای");
  await specValue(switchType.id, "اپتیکال");
  await specValue(connectivity.id, "بی‌سیم");
  await specValue(connectivity.id, "سیمی");
  await specValue(connectivity.id, "بی‌سیم و سیمی");

  // ==================== لپ‌تاپ گیمینگ (۶ محصول) ====================
  await seedProduct({
    slug: "msi-titan-18-hx",
    name: "MSI Titan 18 HX A2XWJG",
    brandId: msi.id,
    categoryId: gamingCategory.id,
    modelNumber: "A2XWJG",
    condition: "NEW",
    priority: 100,
    image: "msi-titan-18-hx",
    shortDescription: "قوی‌ترین لپ‌تاپ رومیزی‌جایگزین بازار",
    description:
      "Titan 18 HX سنگین است و صدا می‌دهد، و هیچ‌کدام را پنهان نمی‌کند. در عوض زیر بار کامل رندر، فرکانس پردازنده را نگه می‌دارد. نمایشگر Mini LED در محیط روشن هم خوانا می‌ماند و برای تدوین رنگ قابل‌اتکاست.",
    specs: [
      { definitionId: cpuGaming.id, value: "Intel Core Ultra 9 275HX" },
      { definitionId: gpuGaming.id, value: "GeForce RTX 5090 Laptop ۲۴GB" },
      {
        definitionId: displayGaming.id,
        value: "۱۸ اینچ Mini LED ۳۸۴۰×۲۴۰۰ ۱۲۰Hz",
      },
      { definitionId: weightGaming.id, value: "۳٫۶ کیلوگرم" },
    ],
    variants: [
      {
        sku: "ARB-MSI-TITAN-32-1TB",
        isDefault: false,
        finalPrice: 261_000_000n,
        axes: [
          { definitionId: ramGaming.id, value: "۳۲GB" },
          { definitionId: storageGaming.id, value: "۱TB" },
        ],
        stock: { quantity: 8 },
      },
      {
        sku: "ARB-MSI-TITAN-64-2TB",
        isDefault: true,
        finalPrice: 289_500_000n,
        axes: [
          { definitionId: ramGaming.id, value: "۶۴GB" },
          { definitionId: storageGaming.id, value: "۲TB" },
        ],
        stock: { quantity: 5 },
      },
      {
        sku: "ARB-MSI-TITAN-128-4TB",
        isDefault: false,
        finalPrice: 333_000_000n,
        axes: [
          { definitionId: ramGaming.id, value: "۱۲۸GB" },
          { definitionId: storageGaming.id, value: "۴TB" },
        ],
        stock: { quantity: 2 },
      },
    ],
  });

  await seedProduct({
    slug: "msi-raider-ge78-hx",
    name: "MSI Raider GE78 HX",
    brandId: msi.id,
    categoryId: gamingCategory.id,
    modelNumber: "GE78HX",
    condition: "NEW",
    priority: 60,
    image: "msi-raider-ge78-hx",
    shortDescription: "تعادل بین کارایی و قابل‌حمل بودن در رده‌ی بالا",
    description:
      "Raider GE78 HX برای کسانی است که هم بازی می‌خواهند هم روی همان دستگاه رندر بگیرند. خنک‌کاری قوی‌تر از نسل قبل باعث شده فرکانس زیر بار طولانی‌تر پایدار بماند.",
    specs: [
      { definitionId: cpuGaming.id, value: "Intel Core Ultra 9 275HX" },
      { definitionId: gpuGaming.id, value: "GeForce RTX 5080 Laptop ۱۶GB" },
      { definitionId: displayGaming.id, value: "۱۷ اینچ QHD+ ۲۴۰Hz" },
      { definitionId: weightGaming.id, value: "۲٫۹ کیلوگرم" },
    ],
    variants: [
      {
        sku: "ARB-MSI-RAIDER-GE78-DEFAULT",
        isDefault: true,
        finalPrice: 189_000_000n,
        stock: { quantity: 2 },
      },
    ],
  });

  await seedProduct({
    slug: "asus-rog-strix-g16",
    name: "ASUS ROG Strix G16",
    brandId: asus.id,
    categoryId: gamingCategory.id,
    modelNumber: "G16",
    condition: "NEW",
    priority: 70,
    image: "asus-rog-strix-g16",
    shortDescription: "گیمینگ روزمره با قیمت منطقی‌تر از رده‌ی Titan/Raider",
    description:
      "ROG Strix G16 برای کسی است که می‌خواهد اکثر بازی‌های روز را روی تنظیمات بالا اجرا کند، بدون پرداخت هزینه‌ی رده‌ی فلگ‌شیپ. بدنه‌ی فلزی و صفحه‌کلید RGB هم از ویژگی‌های این خط تولید است.",
    specs: [
      { definitionId: cpuGaming.id, value: "Intel Core i9-14900HX" },
      { definitionId: gpuGaming.id, value: "GeForce RTX 4070 Laptop ۸GB" },
      { definitionId: displayGaming.id, value: "۱۶ اینچ QHD ۲۴۰Hz" },
      { definitionId: weightGaming.id, value: "۲٫۵ کیلوگرم" },
    ],
    variants: [
      {
        sku: "ARB-ASUS-G16-16GB",
        isDefault: false,
        finalPrice: 142_000_000n,
        axes: [{ definitionId: ramGaming.id, value: "۱۶GB" }],
        stock: { quantity: 6 },
      },
      {
        sku: "ARB-ASUS-G16-32GB",
        isDefault: true,
        finalPrice: 168_000_000n,
        axes: [{ definitionId: ramGaming.id, value: "۳۲GB" }],
        stock: { quantity: 4 },
      },
    ],
  });

  await seedProduct({
    slug: "asus-rog-zephyrus-g14",
    name: "ASUS ROG Zephyrus G14",
    brandId: asus.id,
    categoryId: gamingCategory.id,
    modelNumber: "G14",
    condition: "LIKE_NEW",
    priority: 40,
    image: "asus-rog-zephyrus-g14",
    shortDescription: "گیمینگ فشرده و سبک — یک نسخه‌ی در حد نو با تخفیف",
    description:
      "Zephyrus G14 کوچک‌ترین لپ‌تاپ گیمینگ رده‌ی بالای ASUS است. این نسخه در حد نو با یک بار باز شدن جعبه، با قیمتی پایین‌تر از خط تولید جدید ارائه می‌شود.",
    specs: [
      { definitionId: cpuGaming.id, value: "AMD Ryzen 9 8945HS" },
      { definitionId: gpuGaming.id, value: "GeForce RTX 4060 Laptop ۸GB" },
      { definitionId: displayGaming.id, value: "۱۴ اینچ QHD+ ۱۲۰Hz" },
      { definitionId: weightGaming.id, value: "۱٫۷ کیلوگرم" },
    ],
    variants: [
      {
        sku: "ARB-ASUS-G14-DEFAULT",
        isDefault: true,
        finalPrice: 118_000_000n,
        compareAtPrice: 135_000_000n,
        stock: { quantity: 3 },
      },
    ],
  });

  await seedProduct({
    slug: "lenovo-legion-pro-7i",
    name: "Lenovo Legion Pro 7i",
    brandId: lenovo.id,
    categoryId: gamingCategory.id,
    modelNumber: "Pro7i",
    condition: "OPEN_BOX",
    priority: 30,
    image: "lenovo-legion-pro-7i",
    shortDescription: "فلگ‌شیپ Legion با جعبه بازشده",
    description:
      "Legion Pro 7i در رده‌ی بالای خط تولید Lenovo است؛ سیستم خنک‌کاری Legion Coldfront برای نگه‌داشتن فرکانس زیر بار طولانی طراحی شده. این نسخه جعبه‌اش یک‌بار باز شده، دستگاه دست‌نخورده است.",
    specs: [
      { definitionId: cpuGaming.id, value: "Intel Core i9-14900HX" },
      { definitionId: gpuGaming.id, value: "GeForce RTX 4090 Laptop ۱۶GB" },
      { definitionId: displayGaming.id, value: "۱۶ اینچ QHD+ ۲۴۰Hz" },
      { definitionId: weightGaming.id, value: "۲٫۶ کیلوگرم" },
    ],
    variants: [
      {
        sku: "ARB-LENOVO-LEGION7I-DEFAULT",
        isDefault: true,
        finalPrice: 175_000_000n,
        stock: "OUT_OF_STOCK",
      },
    ],
  });

  await seedProduct({
    slug: "lenovo-loq-15",
    name: "Lenovo LOQ 15",
    brandId: lenovo.id,
    categoryId: gamingCategory.id,
    modelNumber: "LOQ15",
    condition: "STOCK",
    priority: 20,
    image: "lenovo-loq-15",
    shortDescription: "ورودی گیمینگ — محموله‌ی بعدی در راه است",
    description:
      "LOQ 15 برای شروع گیمینگ با بودجه‌ی محدودتر طراحی شده؛ همان پلتفرم خنک‌کاری Legion را در بدنه‌ای ساده‌تر دارد. محموله‌ی فعلی پیش‌فروش است.",
    specs: [
      { definitionId: cpuGaming.id, value: "Intel Core i5-13450HX" },
      { definitionId: gpuGaming.id, value: "GeForce RTX 4050 Laptop ۶GB" },
      { definitionId: displayGaming.id, value: "۱۵٫۶ اینچ FHD ۱۴۴Hz" },
      { definitionId: weightGaming.id, value: "۲٫۳ کیلوگرم" },
    ],
    variants: [
      {
        sku: "ARB-LENOVO-LOQ15-DEFAULT",
        isDefault: true,
        finalPrice: 78_000_000n,
        stock: "PREORDER",
      },
    ],
  });

  // ==================== سرفیس و ورک‌استیشن (۶ محصول) ====================
  await seedProduct({
    slug: "microsoft-surface-laptop-studio-2",
    name: "Microsoft Surface Laptop Studio 2",
    brandId: microsoft.id,
    categoryId: workstationCategory.id,
    modelNumber: "LaptopStudio2",
    condition: "NEW",
    priority: 90,
    image: "microsoft-surface-laptop-studio-2",
    shortDescription: "لولای سه‌حالته برای طراحی، رندر و ارائه",
    description:
      "Surface Laptop Studio 2 با لولای منحصربه‌فرد بین حالت لپ‌تاپ، Stage و تبلت جابه‌جا می‌شود. برای کسانی که با قلم روی صفحه کار می‌کنند و همزمان به کارت گرافیک مجزا نیاز دارند مناسب است.",
    specs: [
      { definitionId: cpuWs.id, value: "Intel Core i7-13800H" },
      { definitionId: gpuWs.id, value: "GeForce RTX 4060 Laptop ۸GB" },
      { definitionId: displayWs.id, value: "۱۴٫۴ اینچ PixelSense Flow لمسی" },
      { definitionId: weightWs.id, value: "۱٫۹ کیلوگرم" },
    ],
    variants: [
      {
        sku: "ARB-MS-SLS2-1TB",
        isDefault: true,
        finalPrice: 145_000_000n,
        axes: [{ definitionId: storageWs.id, value: "۱TB" }],
        stock: { quantity: 7 },
      },
      {
        sku: "ARB-MS-SLS2-2TB",
        isDefault: false,
        finalPrice: 172_000_000n,
        axes: [{ definitionId: storageWs.id, value: "۲TB" }],
        stock: { quantity: 3 },
      },
    ],
  });

  await seedProduct({
    slug: "microsoft-surface-pro-10",
    name: "Microsoft Surface Pro 10",
    brandId: microsoft.id,
    categoryId: workstationCategory.id,
    modelNumber: "Pro10",
    condition: "NEW",
    priority: 55,
    image: "microsoft-surface-pro-10",
    shortDescription: "تبلت و لپ‌تاپ دو در یک برای کار روزمره",
    description:
      "Surface Pro 10 برای کسی است که بین جلسه و میز کار جابه‌جا می‌شود و به یک دستگاه سبک با کیبورد جدا‌شدنی نیاز دارد. باتری برای یک روز کاری کامل کافی است.",
    specs: [
      { definitionId: cpuWs.id, value: "Intel Core Ultra 5 135U" },
      { definitionId: gpuWs.id, value: "Intel Graphics داخلی" },
      { definitionId: displayWs.id, value: "۱۳ اینچ PixelSense لمسی" },
      { definitionId: weightWs.id, value: "۰٫۹ کیلوگرم" },
    ],
    variants: [
      {
        sku: "ARB-MS-PRO10-256",
        isDefault: true,
        finalPrice: 98_000_000n,
        axes: [{ definitionId: storageWs.id, value: "۲۵۶GB" }],
        stock: { quantity: 10 },
      },
      {
        sku: "ARB-MS-PRO10-512",
        isDefault: false,
        finalPrice: 118_000_000n,
        axes: [{ definitionId: storageWs.id, value: "۵۱۲GB" }],
        stock: { quantity: 6 },
      },
    ],
  });

  await seedProduct({
    slug: "microsoft-surface-laptop-6",
    name: "Microsoft Surface Laptop 6",
    brandId: microsoft.id,
    categoryId: workstationCategory.id,
    modelNumber: "Laptop6",
    condition: "NEW",
    priority: 35,
    image: "microsoft-surface-laptop-6",
    shortDescription: "لپ‌تاپ کلاسیک سرفیس برای کار اداری",
    description:
      "Surface Laptop 6 بدون بخش جدا‌شدنی، فرم لپ‌تاپ معمولی دارد. بدنه‌ی فلزی و صفحه‌کلید مکانیکی نرم آن را برای تایپ طولانی مناسب می‌کند.",
    specs: [
      { definitionId: cpuWs.id, value: "Intel Core Ultra 7 165H" },
      { definitionId: gpuWs.id, value: "Intel Graphics داخلی" },
      { definitionId: displayWs.id, value: "۱۳٫۸ اینچ PixelSense لمسی" },
      { definitionId: weightWs.id, value: "۱٫۳ کیلوگرم" },
    ],
    variants: [
      {
        sku: "ARB-MS-LAPTOP6-DEFAULT",
        isDefault: true,
        finalPrice: 89_000_000n,
        stock: { quantity: 3, reserved: 1 },
      },
    ],
  });

  await seedProduct({
    slug: "lenovo-thinkpad-p1-gen7",
    name: "Lenovo ThinkPad P1 Gen 7",
    brandId: lenovo.id,
    categoryId: workstationCategory.id,
    modelNumber: "P1Gen7",
    condition: "NEW",
    priority: 65,
    image: "lenovo-thinkpad-p1-gen-7",
    shortDescription: "ورک‌استیشن متحرک برای مهندسی و رندر حرفه‌ای",
    description:
      "ThinkPad P1 Gen 7 با گواهی ISV برای نرم‌افزارهای CAD/رندر تست شده. کیبورد کلاسیک ThinkPad و بدنه‌ی مقاوم در برابر ضربه هم از ویژگی‌های همیشگی این خط تولید است.",
    specs: [
      { definitionId: cpuWs.id, value: "Intel Core Ultra 9 185H" },
      { definitionId: gpuWs.id, value: "NVIDIA RTX 2000 Ada ۸GB" },
      { definitionId: displayWs.id, value: "۱۶ اینچ QHD+ ۱۶۵Hz" },
      { definitionId: weightWs.id, value: "۱٫۸ کیلوگرم" },
    ],
    variants: [
      {
        sku: "ARB-LENOVO-P1G7-32GB",
        isDefault: true,
        finalPrice: 165_000_000n,
        axes: [{ definitionId: ramWs.id, value: "۳۲GB" }],
        stock: { quantity: 4 },
      },
      {
        sku: "ARB-LENOVO-P1G7-64GB",
        isDefault: false,
        finalPrice: 198_000_000n,
        axes: [{ definitionId: ramWs.id, value: "۶۴GB" }],
        stock: { quantity: 2 },
      },
    ],
  });

  await seedProduct({
    slug: "asus-proart-studiobook-16",
    name: "ASUS ProArt Studiobook 16",
    brandId: asus.id,
    categoryId: workstationCategory.id,
    modelNumber: "Studiobook16",
    condition: "NEW",
    priority: 25,
    image: "asus-proart-studiobook-16",
    shortDescription: "دقت رنگ کالیبره‌شده برای طراحان و تدوین‌گران",
    description:
      "ProArt Studiobook 16 با پنل کالیبره‌شده‌ی کارخانه‌ای (Pantone Validated) برای کارهایی که دقت رنگ در آن‌ها مهم است ساخته شده. دسته‌ی چرخشی ASUS Dial کنترل لایه‌ها را سریع‌تر می‌کند.",
    specs: [
      { definitionId: cpuWs.id, value: "Intel Core i9-13980HX" },
      { definitionId: gpuWs.id, value: "GeForce RTX 4070 Laptop ۸GB" },
      { definitionId: displayWs.id, value: "۱۶ اینچ ۴K OLED" },
      { definitionId: weightWs.id, value: "۲٫۴ کیلوگرم" },
    ],
    variants: [
      {
        sku: "ARB-ASUS-PROART16-DEFAULT",
        isDefault: true,
        finalPrice: 155_000_000n,
        stock: "OUT_OF_STOCK",
      },
    ],
  });

  await seedProduct({
    slug: "msi-ws66",
    name: "MSI WS66 Workstation",
    brandId: msi.id,
    categoryId: workstationCategory.id,
    modelNumber: "WS66",
    condition: "LIKE_NEW",
    priority: 15,
    image: "msi-ws66",
    shortDescription: "ورک‌استیشن نسل قبل با قیمت مناسب — محموله‌ی بعدی",
    description:
      "WS66 با گرافیک حرفه‌ای NVIDIA RTX A-series برای نرم‌افزارهای مهندسی تست و تأیید شده. این مدل نسل قبل است و با قیمت پایین‌تر از نسل جدید، به‌صورت پیش‌فروش عرضه می‌شود.",
    specs: [
      { definitionId: cpuWs.id, value: "Intel Core i7-11800H" },
      { definitionId: gpuWs.id, value: "NVIDIA RTX A5000 ۱۶GB" },
      { definitionId: displayWs.id, value: "۱۵٫۶ اینچ ۴K" },
      { definitionId: weightWs.id, value: "۲٫۱ کیلوگرم" },
    ],
    variants: [
      {
        sku: "ARB-MSI-WS66-DEFAULT",
        isDefault: true,
        finalPrice: 142_000_000n,
        stock: "PREORDER",
      },
    ],
  });

  // ==================== کیبورد و موس (۶ محصول) ====================
  await seedProduct({
    slug: "keychron-k8-pro",
    name: "Keychron K8 Pro",
    brandId: keychron.id,
    categoryId: peripheralsCategory.id,
    modelNumber: "K8Pro",
    condition: "NEW",
    priority: 50,
    image: "keychron-k8-pro",
    shortDescription: "کیبورد مکانیکی TKL با کلیدهای قابل‌تعویض",
    description:
      "K8 Pro از Keychron Q-series ارزان‌تر است اما همان سوییچ‌های قابل‌تعویض داغ (Hot-swap) را دارد. هم با بلوتوث و هم سیمی کار می‌کند.",
    specs: [
      { definitionId: layout.id, value: "TKL (بدون Numpad)" },
      { definitionId: battery.id, value: "تا ۸۰۰ ساعت (بدون روشنایی)" },
    ],
    selectSpecs: [
      { definitionId: switchType.id, value: "مکانیکی — قهوه‌ای" },
      { definitionId: connectivity.id, value: "بی‌سیم و سیمی" },
    ],
    variants: [
      {
        sku: "ARB-KC-K8PRO-DEFAULT",
        isDefault: true,
        finalPrice: 4_200_000n,
        stock: { quantity: 20 },
      },
    ],
  });

  await seedProduct({
    slug: "keychron-q1-pro",
    name: "Keychron Q1 Pro",
    brandId: keychron.id,
    categoryId: peripheralsCategory.id,
    modelNumber: "Q1Pro",
    condition: "NEW",
    priority: 45,
    image: "keychron-q1-pro",
    shortDescription: "بدنه‌ی آلومینیومی تمام‌CNC — رده‌ی بالای Keychron",
    description:
      "Q1 Pro بدنه‌ی آلومینیومی گسکت‌دار دارد که صدای تایپ را نرم‌تر می‌کند. برای کسی که هم ظاهر و هم حس تایپ برایش مهم است، رده‌ی بالای خط تولید Keychron است.",
    specs: [
      { definitionId: layout.id, value: "۷۵٪ (فشرده با Numpad کوچک)" },
      { definitionId: battery.id, value: "سیمی — بدون باتری" },
    ],
    selectSpecs: [
      { definitionId: switchType.id, value: "مکانیکی — قرمز" },
      { definitionId: connectivity.id, value: "سیمی" },
    ],
    variants: [
      {
        sku: "ARB-KC-Q1PRO-DEFAULT",
        isDefault: true,
        finalPrice: 7_800_000n,
        stock: { quantity: 12 },
      },
    ],
  });

  await seedProduct({
    slug: "keychron-k2-he",
    name: "Keychron K2 HE",
    brandId: keychron.id,
    categoryId: peripheralsCategory.id,
    modelNumber: "K2HE",
    condition: "NEW",
    priority: 42,
    image: "keychron-k2-he",
    shortDescription: "سوییچ مغناطیسی برای بازی‌های رقابتی",
    description:
      "K2 HE از سوییچ‌های مغناطیسی (Hall Effect) استفاده می‌کند که نقطه‌ی فعال‌سازی هر کلید قابل‌تنظیم است — مناسب بازی‌های رقابتی که واکنش سریع مهم است.",
    specs: [
      { definitionId: layout.id, value: "۷۵٪ (فشرده با Numpad کوچک)" },
      { definitionId: battery.id, value: "تا ۱۰۰ ساعت (بدون روشنایی)" },
    ],
    selectSpecs: [
      { definitionId: switchType.id, value: "اپتیکال" },
      { definitionId: connectivity.id, value: "سیمی" },
    ],
    variants: [
      {
        sku: "ARB-KC-K2HE-DEFAULT",
        isDefault: true,
        finalPrice: 6_500_000n,
        stock: { quantity: 3, reserved: 1 },
      },
    ],
  });

  await seedProduct({
    slug: "keychron-m6",
    name: "Keychron M6",
    brandId: keychron.id,
    categoryId: peripheralsCategory.id,
    modelNumber: "M6",
    condition: "NEW",
    priority: 38,
    image: "keychron-m6",
    shortDescription: "موس سبک برای گیمینگ حرفه‌ای",
    description:
      "M6 با وزن سبک و سنسور دقیق برای گیمینگ رقابتی طراحی شده. اتصال بی‌سیم ۱٫۱ میلی‌ثانیه‌ای عملاً هیچ تأخیر محسوسی نسبت به سیمی ندارد.",
    specs: [{ definitionId: battery.id, value: "تا ۷۰ ساعت" }],
    selectSpecs: [{ definitionId: connectivity.id, value: "بی‌سیم" }],
    numericSpecs: [{ definitionId: dpi.id, value: 26000 }],
    variants: [
      {
        sku: "ARB-KC-M6-DEFAULT",
        isDefault: true,
        finalPrice: 2_900_000n,
        stock: { quantity: 15 },
      },
    ],
  });

  await seedProduct({
    slug: "keychron-m3-mini",
    name: "Keychron M3 Mini",
    brandId: keychron.id,
    categoryId: peripheralsCategory.id,
    modelNumber: "M3Mini",
    condition: "STOCK",
    priority: 18,
    image: "keychron-m3-mini",
    shortDescription: "موس کوچک برای دست‌های کوچک‌تر — فعلاً ناموجود",
    description:
      "M3 Mini همان طراحی M3 را در بدنه‌ای کوچک‌تر ارائه می‌دهد؛ برای کسانی که دست کوچک‌تری دارند یا گرفتن Claw/Fingertip را ترجیح می‌دهند.",
    specs: [{ definitionId: battery.id, value: "تا ۵۰ ساعت" }],
    selectSpecs: [{ definitionId: connectivity.id, value: "بی‌سیم" }],
    numericSpecs: [{ definitionId: dpi.id, value: 8000 }],
    variants: [
      {
        sku: "ARB-KC-M3MINI-DEFAULT",
        isDefault: true,
        finalPrice: 2_200_000n,
        stock: "OUT_OF_STOCK",
      },
    ],
  });

  await seedProduct({
    slug: "keychron-v1",
    name: "Keychron V1",
    brandId: keychron.id,
    categoryId: peripheralsCategory.id,
    modelNumber: "V1",
    condition: "NEW",
    priority: 22,
    image: "keychron-v1",
    shortDescription: "کیبورد سیمی ارزان‌تر برای شروع — محموله‌ی بعدی",
    description:
      "V1 نسخه‌ی سیمی‌فقط و ارزان‌تر خط Q است، برای کسی که می‌خواهد بدون هزینه‌ی بی‌سیم وارد دنیای کیبوردهای مکانیکی سفارشی شود. محموله‌ی فعلی پیش‌فروش است.",
    specs: [
      { definitionId: layout.id, value: "۷۵٪ (فشرده با Numpad کوچک)" },
      { definitionId: battery.id, value: "سیمی — بدون باتری" },
    ],
    selectSpecs: [
      { definitionId: switchType.id, value: "مکانیکی — قرمز" },
      { definitionId: connectivity.id, value: "سیمی" },
    ],
    variants: [
      {
        sku: "ARB-KC-V1-DEFAULT",
        isDefault: true,
        finalPrice: 5_400_000n,
        stock: "PREORDER",
      },
    ],
  });

  return {
    gamingCategory: gamingCategory.id,
    workstationCategory: workstationCategory.id,
    peripheralsCategory: peripheralsCategory.id,
  };
}

/**
 * بند ۷ سند T-150 — بلوک‌های صفحه‌ی اصلی (`HomepageBlock.config` شکل آزاد
 * دارد؛ این پروژه تصمیم گرفته `config` شناسه‌های خام نگه دارد و لایه‌ی
 * سرویس آن‌ها را حل کند — دقیقاً همان‌طور که docs/api/README.md برای پاسخ
 * PRODUCT_RAIL/CATEGORY_GRID توضیح داده).
 */
async function seedHomepage(categoryIds: {
  gamingCategory: string;
  workstationCategory: string;
  peripheralsCategory: string;
}) {
  const railProducts = await prisma.product.findMany({
    where: { priority: { gte: 50 }, status: "ACTIVE" },
    orderBy: { priority: "desc" },
    take: 8,
    select: { id: true },
  });

  const blocks: {
    type:
      | "HERO"
      | "CATEGORY_GRID"
      | "PRODUCT_RAIL"
      | "CAMPAIGN"
      | "BENEFITS"
      | "BLOG_RAIL";
    sortOrder: number;
    title?: string;
    subtitle?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    imageDesktop?: string;
    imageMobile?: string;
    imageAlt?: string;
    config?: Record<string, unknown>;
  }[] = [
    {
      type: "HERO",
      sortOrder: 0,
      title: "تکنولوژی با ظرافت",
      subtitle: "لپ‌تاپ، ورک‌استیشن و لوازم جانبی — تست‌شده پیش از ارسال",
      ctaLabel: "مشاهده‌ی فروشگاه",
      ctaUrl: "/products",
      // T-201 — placeholder مثل seed-images محصول T-150؛ عکس واقعی هیرو
      // هنوز نرسیده (ر.ک. گزارش T-201 برای ابعاد لازم).
      imageDesktop: "/seed-images/hero-desktop.svg",
      imageMobile: "/seed-images/hero-mobile.svg",
      imageAlt: "لپ‌تاپ‌های منتخب آربایت روی میز کار",
    },
    {
      type: "CATEGORY_GRID",
      sortOrder: 1,
      title: "دسته‌بندی‌ها",
      config: {
        categoryIds: [
          categoryIds.gamingCategory,
          categoryIds.workstationCategory,
          categoryIds.peripheralsCategory,
        ],
      },
    },
    {
      type: "PRODUCT_RAIL",
      sortOrder: 2,
      title: "محصولات منتخب",
      config: { productIds: railProducts.map((p) => p.id) },
    },
    {
      type: "BENEFITS",
      sortOrder: 3,
      title: "چرا آربایت",
      subtitle:
        "هر دستگاه پیش از ارسال تست می‌شود و با گارانتی رسمی به دست شما می‌رسد.",
    },
    {
      // T-201 — API وبلاگ هنوز نیست (T-207)؛ این بلوک فقط عنوان/جایگاه را
      // نگه می‌دارد، فرانت با حالت خالی رندرش می‌کند.
      type: "BLOG_RAIL",
      sortOrder: 4,
      title: "از وبلاگ آربایت",
    },
  ];

  for (const block of blocks) {
    const existing = await prisma.homepageBlock.findFirst({
      where: { type: block.type, sortOrder: block.sortOrder },
    });
    if (existing) {
      // T-201 — همان ردیف قبلی seed اجرای T-150 بدون تصویر هیرو بود؛ فقط
      // فیلدهای تصویر را به‌روزرسانی کن، بقیه دست‌نخورده (idempotent).
      await prisma.homepageBlock.update({
        where: { id: existing.id },
        data: {
          imageDesktop: block.imageDesktop,
          imageMobile: block.imageMobile,
          imageAlt: block.imageAlt,
        },
      });
      continue;
    }
    await prisma.homepageBlock.create({
      data: {
        type: block.type,
        sortOrder: block.sortOrder,
        title: block.title,
        subtitle: block.subtitle,
        ctaLabel: block.ctaLabel,
        ctaUrl: block.ctaUrl,
        imageDesktop: block.imageDesktop,
        imageMobile: block.imageMobile,
        imageAlt: block.imageAlt,
        config: block.config as never,
      },
    });
  }
}

async function main() {
  const superAdminRole = await seedPermissionsAndSuperAdminRole();
  await seedSuperAdminUser(superAdminRole.id);
  await seedSettings();
  await seedGlobalPriceRule();
  const categoryIds = await seedCatalog();
  await seedHomepage(categoryIds);
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
