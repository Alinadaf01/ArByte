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
  imageMain?: string;
  imageThumbnail?: string;
  description?: string;
  sortOrder?: number;
}) {
  const existing = await prisma.category.findFirst({
    where: { slug: data.slug },
  });
  if (existing) {
    // idempotent یعنی اجرای دوباره باید تصویر/توضیح/ترتیب جدید را هم
    // به‌روزرسانی کند، نه فقط رد شود (T-202 §۱.۱، توسعه‌یافته در T-210 §۲).
    const needsUpdate =
      (data.imageMain && existing.imageMain !== data.imageMain) ||
      (data.imageThumbnail &&
        existing.imageThumbnail !== data.imageThumbnail) ||
      (data.description !== undefined &&
        existing.description !== data.description) ||
      (data.sortOrder !== undefined && existing.sortOrder !== data.sortOrder);
    if (needsUpdate) {
      return prisma.category.update({
        where: { id: existing.id },
        data: {
          imageMain: data.imageMain,
          imageThumbnail: data.imageThumbnail,
          description: data.description,
          sortOrder: data.sortOrder,
        },
      });
    }
    return existing;
  }
  return prisma.category.create({ data });
}

/**
 * T-210 §۲ — اعتبارسنجی seed: محصول دسته‌ی لپ‌تاپ باید condition هم‌خوان با
 * همان دسته داشته باشد (NEW→آکبند، OPEN_BOX/LIKE_NEW→اپن‌باکس، STOCK→استوک).
 */
const LAPTOP_CATEGORY_CONDITIONS: Record<string, readonly string[]> = {
  "laptop-new": ["NEW"],
  "laptop-open-box": ["OPEN_BOX", "LIKE_NEW"],
  "laptop-stock": ["STOCK"],
};

function assertConditionMatchesCategory(input: {
  productName: string;
  condition: string;
  categorySlug: string;
}) {
  const allowed = LAPTOP_CATEGORY_CONDITIONS[input.categorySlug];
  if (!allowed) return; // فقط دسته‌های لپ‌تاپ این قاعده را دارند.
  if (!allowed.includes(input.condition)) {
    throw new Error(
      `seed: «${input.productName}» با condition=${input.condition} در دسته‌ی «${input.categorySlug}» ناسازگار است (مجاز: ${allowed.join("/")}).`,
    );
  }
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
  /** T-210 §۲ — برای اعتبارسنجی condition↔دسته؛ فقط دسته‌های لپ‌تاپ اثر دارند. */
  categorySlug?: string;
  modelNumber: string;
  condition: "NEW" | "OPEN_BOX" | "STOCK" | "LIKE_NEW";
  shortDescription: string;
  description: string;
  priority?: number;
  /** بدون پسوند = placeholder سابق (`/seed-images/<image>.svg`)؛ با پسوند
   * (مثلاً `msi-titan-18-hx.webp`) = عکس واقعی — E-01 §۲. */
  image: string;
  /** پیش‌فرض متن placeholder سابق؛ برای عکس واقعی صریح ست شود. */
  imageAlt?: string;
  /** مشخصات مشترک TEXT/NUMBER — customValue آزاد (سطح محصول). */
  specs: { definitionId: string; value: string }[];
  /** مشخصات مشترک SELECT — از `SpecificationValue` از پیش تعریف‌شده (سطح محصول). */
  selectSpecs?: { definitionId: string; value: string }[];
  /** مشخصات مشترک NUMBER با `numericValue` واقعی (برای فیلتر بازه‌ای). */
  numericSpecs?: { definitionId: string; value: number }[];
  variants: VariantSeedInput[];
  /**
   * T-210 §۳ — مشخصات «توان کل»/«روشنایی» برای دوئل پرچم‌دار؛ برخلاف
   * `specs`، همیشه sync می‌شود (حتی روی محصول از قبل موجود) چون هدفش
   * دقیقاً یک اجرای دوم روی محصول قدیمی‌تر است.
   */
  metricSpecs?: { definitionId: string; value: string }[];
}

/**
 * بند ۷ سند T-150 — یک محصول کامل با واریانت(ها)، موجودی، مشخصات، تصویر و
 * SEO پایه. idempotent (findFirst+create روی slug/sku، همان الگوی موجود).
 */
/** E-01 §۲ — `image` بدون پسوند یعنی placeholder سابق (`.svg`)؛ با پسوند
 * یعنی عکس واقعی از قبل در `apps/web/public/seed-images/` هست. */
function productImageUrl(image: string): string {
  return image.includes(".")
    ? `/seed-images/${image}`
    : `/seed-images/${image}.svg`;
}

async function seedProduct(input: ProductSeedInput) {
  assertConditionMatchesCategory({
    productName: input.name,
    condition: input.condition,
    categorySlug: input.categorySlug,
  });

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

  // T-210 §۲/§۳ — بازآرایی دسته‌ها و به‌روزرسانی نام پرچم‌دارها: محصولی که
  // از اجرای قبلی seed دسته/نام متفاوتی دارد باید همگام شود، نه ساکت رد شود.
  if (
    existingProduct &&
    (existingProduct.categoryId !== input.categoryId ||
      existingProduct.name !== input.name)
  ) {
    await prisma.product.update({
      where: { id: product.id },
      data: { categoryId: input.categoryId, name: input.name },
    });
  }

  if (existingProduct) {
    const primaryImage = await prisma.productImage.findFirst({
      where: { productId: product.id, isPrimary: true },
    });
    const newUrl = productImageUrl(input.image);
    const newAlt =
      input.imageAlt ??
      `تصویر نمونه‌ی ${input.name} — عکس واقعی جایگزین می‌شود`;
    if (
      primaryImage &&
      (primaryImage.url !== newUrl || primaryImage.altText !== newAlt)
    ) {
      await prisma.productImage.update({
        where: { id: primaryImage.id },
        data: { url: newUrl, altText: newAlt },
      });
    }
  }

  for (const metric of input.metricSpecs ?? []) {
    const existingMetric = await prisma.productSpecification.findFirst({
      where: {
        productId: product.id,
        specificationDefinitionId: metric.definitionId,
      },
    });
    if (existingMetric) {
      if (existingMetric.customValue !== metric.value) {
        await prisma.productSpecification.update({
          where: { id: existingMetric.id },
          data: { customValue: metric.value },
        });
      }
    } else {
      await prisma.productSpecification.create({
        data: {
          productId: product.id,
          specificationDefinitionId: metric.definitionId,
          customValue: metric.value,
        },
      });
    }
  }

  if (!existingProduct) {
    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: productImageUrl(input.image),
        altText:
          input.imageAlt ??
          `تصویر نمونه‌ی ${input.name} — عکس واقعی جایگزین می‌شود`,
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
/**
 * T-210 §۲ — دسته‌ی قدیمی (`legacySlug`) را در جای همان ردیف بازآرایی
 * می‌کند (نام/slug/تصویر/ترتیب/توضیح جدید) تا FK محصولات و مشخصات موجود
 * دست‌نخورده بماند؛ اگر ردیف قدیمی نبود (مثلاً دیتابیس تست تازه) عادی
 * find-or-create می‌شود.
 */
async function repurposeOrCreateCategory(input: {
  legacySlug?: string;
  name: string;
  slug: string;
  sortOrder: number;
  description: string;
  imageMain: string;
  imageThumbnail: string;
}) {
  if (input.legacySlug) {
    const legacy = await prisma.category.findFirst({
      where: { slug: input.legacySlug },
    });
    if (legacy) {
      return prisma.category.update({
        where: { id: legacy.id },
        data: {
          name: input.name,
          slug: input.slug,
          sortOrder: input.sortOrder,
          description: input.description,
          imageMain: input.imageMain,
          imageThumbnail: input.imageThumbnail,
        },
      });
    }
  }
  return findOrCreateCategory({
    name: input.name,
    slug: input.slug,
    sortOrder: input.sortOrder,
    description: input.description,
    imageMain: input.imageMain,
    imageThumbnail: input.imageThumbnail,
  });
}

/**
 * بند ۷ سند T-210 — پنج دسته‌ی واقعی آربایت، دقیقاً به همین ترتیب و املا.
 * سه‌تای اول از سه دسته‌ی قدیمی T-150 (gaming-laptop/surface-workstation/
 * keyboard-mouse) بازآرایی می‌شوند؛ دو دسته‌ی لپ‌تاپ اپن‌باکس/استوک تازه‌اند.
 */
async function seedCatalog() {
  const laptopNewCategory = await repurposeOrCreateCategory({
    legacySlug: "gaming-laptop",
    name: "لپ‌تاپ آکبند",
    slug: "laptop-new",
    sortOrder: 1,
    description: "کارتن پلمب، دست‌نخورده",
    imageMain: "/categories/category-1.webp",
    imageThumbnail: "/categories/category-1-thumb.webp",
  });
  const laptopOpenBoxCategory = await findOrCreateCategory({
    name: "لپ‌تاپ اپن باکس",
    slug: "laptop-open-box",
    sortOrder: 2,
    description: "جعبه باز شده، در حد نو",
    imageMain: "/categories/category-2.webp",
    imageThumbnail: "/categories/category-2-thumb.webp",
  });
  const laptopStockCategory = await findOrCreateCategory({
    name: "لپ‌تاپ استوک",
    slug: "laptop-stock",
    sortOrder: 3,
    description: "کارکرده و تست‌شده",
    imageMain: "/categories/category-3.webp",
    imageThumbnail: "/categories/category-3-thumb.webp",
  });
  const surfaceCategory = await repurposeOrCreateCategory({
    legacySlug: "surface-workstation",
    name: "سرفیس",
    slug: "surface",
    sortOrder: 4,
    description: "Surface Pro و Surface Laptop",
    imageMain: "/categories/category-4.webp",
    imageThumbnail: "/categories/category-4-thumb.webp",
  });
  const gamingPcCategory = await repurposeOrCreateCategory({
    legacySlug: "keyboard-mouse",
    name: "کیس گیمینگ",
    slug: "gaming-pc",
    sortOrder: 5,
    description: "سیستم آماده برای بازی و رندر",
    imageMain: "/categories/category-5.webp",
    imageThumbnail: "/categories/category-5-thumb.webp",
  });

  // ---- حذف Keychron و محصولات کیبورد/موس قدیمی از seed (§۲) ----
  // gamingPcCategory همان ردیفِ بازآرایی‌شده‌ی keyboard-mouse است؛ محصولات
  // Keychron قدیمی‌اش (اگر از اجرای قبلی seed مانده باشند) باید قبل از
  // ساخت محصولات جدید این دسته پاک شوند — cascade مدل خودِ Product تا
  // ProductVariant/Inventory/ProductSpecification را هم جارو می‌کند.
  const legacyKeychronProducts = await prisma.product.findMany({
    where: {
      categoryId: gamingPcCategory.id,
      slug: { startsWith: "keychron-" },
    },
    select: { id: true },
  });
  if (legacyKeychronProducts.length > 0) {
    await prisma.product.deleteMany({
      where: { id: { in: legacyKeychronProducts.map((p) => p.id) } },
    });
  }
  const legacyPeripheralSpecs = await prisma.specificationDefinition.findMany({
    where: {
      categoryId: gamingPcCategory.id,
      key: { in: ["switch-type", "connectivity", "layout", "battery", "dpi"] },
    },
    select: { id: true },
  });
  if (legacyPeripheralSpecs.length > 0) {
    await prisma.specificationDefinition.deleteMany({
      where: { id: { in: legacyPeripheralSpecs.map((s) => s.id) } },
    });
  }
  const keychronBrand = await prisma.brand.findFirst({
    where: { slug: "keychron" },
  });
  if (keychronBrand) {
    // هر محصولی که هنوز به این برند اشاره دارد را هم پاک کن — نه فقط
    // محصولات keychron-* — چون fixtureهای بعضی تست‌های یکپارچگی قدیمی‌تر
    // (قبل از T-210) این برند را به‌عنوان یک برند seed-شده‌ی موجود، برای
    // fixtureهای بی‌ربط خودشان قرض گرفته بودند.
    await prisma.product.deleteMany({ where: { brandId: keychronBrand.id } });
    await prisma.brand.delete({ where: { id: keychronBrand.id } });
  }

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

  // ---- مشخصات: لپ‌تاپ (مشترک هر سه دسته‌ی لپ‌تاپ — روی laptop-new
  // scope شده؛ ر.ک. docs/QUESTIONS.md برای محدودیت فیلتر روی دو دسته‌ی
  // دیگر، که T-213 برطرفش می‌کند) ----
  const cpuGaming = await defineSpec({
    key: "cpu-gaming",
    nameFa: "پردازنده",
    type: "TEXT",
    categoryId: laptopNewCategory.id,
  });
  const gpuGaming = await defineSpec({
    key: "gpu-gaming",
    nameFa: "گرافیک",
    type: "TEXT",
    categoryId: laptopNewCategory.id,
  });
  const displayGaming = await defineSpec({
    key: "display-gaming",
    nameFa: "نمایشگر",
    type: "TEXT",
    categoryId: laptopNewCategory.id,
  });
  const weightGaming = await defineSpec({
    key: "weight-gaming",
    nameFa: "وزن",
    type: "TEXT",
    categoryId: laptopNewCategory.id,
  });
  const ramGaming = await defineSpec({
    key: "ram-gaming",
    nameFa: "حافظه رم",
    type: "SELECT",
    categoryId: laptopNewCategory.id,
    isVariantAxis: true,
  });
  const storageGaming = await defineSpec({
    key: "storage-gaming",
    nameFa: "فضای ذخیره‌سازی",
    type: "SELECT",
    categoryId: laptopNewCategory.id,
    isVariantAxis: true,
  });
  // T-210 §۳ — متریک‌های دوئل پرچم‌دار (Home.dc.html، بخش Flagships).
  const totalPower = await defineSpec({
    key: "total-power",
    nameFa: "توان کل",
    type: "TEXT",
    categoryId: laptopNewCategory.id,
  });
  const brightness = await defineSpec({
    key: "brightness",
    nameFa: "روشنایی",
    type: "TEXT",
    categoryId: laptopNewCategory.id,
  });

  // ---- مشخصات: سرفیس ----
  const cpuWs = await defineSpec({
    key: "cpu-ws",
    nameFa: "پردازنده",
    type: "TEXT",
    categoryId: surfaceCategory.id,
  });
  const gpuWs = await defineSpec({
    key: "gpu-ws",
    nameFa: "گرافیک",
    type: "TEXT",
    categoryId: surfaceCategory.id,
  });
  const displayWs = await defineSpec({
    key: "display-ws",
    nameFa: "نمایشگر",
    type: "TEXT",
    categoryId: surfaceCategory.id,
  });
  const weightWs = await defineSpec({
    key: "weight-ws",
    nameFa: "وزن",
    type: "TEXT",
    categoryId: surfaceCategory.id,
  });
  const ramWs = await defineSpec({
    key: "ram-ws",
    nameFa: "حافظه رم",
    type: "SELECT",
    categoryId: surfaceCategory.id,
    isVariantAxis: true,
  });
  const storageWs = await defineSpec({
    key: "storage-ws",
    nameFa: "فضای ذخیره‌سازی",
    type: "SELECT",
    categoryId: surfaceCategory.id,
    isVariantAxis: true,
  });

  // ---- مشخصات: کیس گیمینگ ----
  const cpuPc = await defineSpec({
    key: "cpu-pc",
    nameFa: "پردازنده",
    type: "TEXT",
    categoryId: gamingPcCategory.id,
  });
  const gpuPc = await defineSpec({
    key: "gpu-pc",
    nameFa: "گرافیک",
    type: "TEXT",
    categoryId: gamingPcCategory.id,
  });
  const psuPc = await defineSpec({
    key: "psu-pc",
    nameFa: "منبع تغذیه",
    type: "TEXT",
    categoryId: gamingPcCategory.id,
  });
  const ramPc = await defineSpec({
    key: "ram-pc",
    nameFa: "حافظه رم",
    type: "SELECT",
    categoryId: gamingPcCategory.id,
    isVariantAxis: true,
  });
  const storagePc = await defineSpec({
    key: "storage-pc",
    nameFa: "فضای ذخیره‌سازی",
    type: "SELECT",
    categoryId: gamingPcCategory.id,
    isVariantAxis: true,
  });

  // ==================== لپ‌تاپ گیمینگ (۶ محصول) ====================
  await seedProduct({
    slug: "msi-titan-18-hx",
    // T-210 §۳ — دقیقاً «Titan 18 HX A2W» طبق Home.dc.html بخش Flagships
    // (نه «A2XWJG» — الگوی generic خودِ Product.dc.html؛ ر.ک. docs/QUESTIONS.md Q-5).
    name: "MSI Titan 18 HX A2W",
    brandId: msi.id,
    categoryId: laptopNewCategory.id,
    categorySlug: "laptop-new",
    modelNumber: "A2XWJG",
    condition: "NEW",
    priority: 100,
    image: "msi-titan-18-hx.webp",
    imageAlt: "MSI Titan 18 HX A2W — نمای روبه‌رو",
    shortDescription: "قوی‌ترین لپ‌تاپ رومیزی‌جایگزین بازار",
    description:
      "Titan 18 HX سنگین است و صدا می‌دهد، و هیچ‌کدام را پنهان نمی‌کند. در عوض زیر بار کامل رندر، فرکانس پردازنده را نگه می‌دارد. نمایشگر Mini LED در محیط روشن هم خوانا می‌ماند و برای تدوین رنگ قابل‌اتکاست.",
    specs: [
      // E-01 §۳ — «Core Ultra 9 290HX Plus» طبق Home.dc.html، تأیید مدیر پروژه.
      { definitionId: cpuGaming.id, value: "Intel Core Ultra 9 290HX Plus" },
      { definitionId: gpuGaming.id, value: "GeForce RTX 5090 Laptop ۲۴GB" },
      {
        definitionId: displayGaming.id,
        value: "۱۸ اینچ Mini LED ۲۴۰Hz",
      },
      { definitionId: weightGaming.id, value: "۳٫۶ کیلوگرم" },
    ],
    metricSpecs: [
      { definitionId: totalPower.id, value: "۲۷۰W" },
      { definitionId: brightness.id, value: "۱۰۰۰ nits" },
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

  // T-210 §۳ — پرچم‌دار دوم دوئل (Home.dc.html، بخش Flagships).
  await seedProduct({
    slug: "asus-rog-strix-scar-18",
    name: "ASUS ROG Strix SCAR 18 (2026)",
    brandId: asus.id,
    categoryId: laptopNewCategory.id,
    categorySlug: "laptop-new",
    modelNumber: "SCAR18-2026",
    condition: "NEW",
    priority: 95,
    image: "asus-rog-strix-scar-18.webp",
    imageAlt: "ASUS ROG Strix SCAR 18 (2026) — نمای روبه‌رو",
    shortDescription: "پیروزی، شتاب‌گرفته — رده‌ی بالای ROG با ۱۲۸GB رم",
    description:
      "Strix SCAR 18 (2026) رده‌ی بالای خط تولید ROG است؛ برای رقابتی‌ترین بازی‌ها روی نمایشگر ۴K Mini LED با نرخ فریم بالا ساخته شده. سقف رم تا ۱۲۸GB برای رندر و استریم همزمان جا دارد.",
    specs: [
      // E-01 §۳ — «Core Ultra 9 290HX Plus» طبق Home.dc.html، تأیید مدیر پروژه.
      { definitionId: cpuGaming.id, value: "Intel Core Ultra 9 290HX Plus" },
      { definitionId: gpuGaming.id, value: "GeForce RTX 5090 Laptop ۱۷۵W" },
      { definitionId: displayGaming.id, value: "۴K Mini LED ۲۴۰Hz" },
      { definitionId: weightGaming.id, value: "۳٫۳ کیلوگرم" },
    ],
    metricSpecs: [
      { definitionId: totalPower.id, value: "۳۲۰W" },
      { definitionId: brightness.id, value: "۱۶۰۰ nits" },
    ],
    variants: [
      {
        sku: "ARB-ASUS-SCAR18-32-1TB",
        isDefault: false,
        finalPrice: 279_000_000n,
        axes: [
          { definitionId: ramGaming.id, value: "۳۲GB" },
          { definitionId: storageGaming.id, value: "۱TB" },
        ],
        stock: { quantity: 6 },
      },
      {
        sku: "ARB-ASUS-SCAR18-64-2TB",
        isDefault: true,
        finalPrice: 312_000_000n,
        axes: [
          { definitionId: ramGaming.id, value: "۶۴GB" },
          { definitionId: storageGaming.id, value: "۲TB" },
        ],
        stock: { quantity: 4 },
      },
      {
        sku: "ARB-ASUS-SCAR18-128-4TB",
        isDefault: false,
        finalPrice: 359_000_000n,
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
    categoryId: laptopNewCategory.id,
    categorySlug: "laptop-new",
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
    categoryId: laptopNewCategory.id,
    categorySlug: "laptop-new",
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
    categoryId: laptopOpenBoxCategory.id,
    categorySlug: "laptop-open-box",
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
    categoryId: laptopOpenBoxCategory.id,
    categorySlug: "laptop-open-box",
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
    categoryId: laptopStockCategory.id,
    categorySlug: "laptop-stock",
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
    categoryId: surfaceCategory.id,
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
    categoryId: surfaceCategory.id,
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
    categoryId: surfaceCategory.id,
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
    categoryId: laptopNewCategory.id,
    categorySlug: "laptop-new",
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
    categoryId: laptopNewCategory.id,
    categorySlug: "laptop-new",
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
    categoryId: laptopOpenBoxCategory.id,
    categorySlug: "laptop-open-box",
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

  // ==================== لپ‌تاپ استوک — تکمیل به حداقل ۳ محصول ====================
  await seedProduct({
    slug: "msi-katana-15",
    name: "MSI Katana 15",
    brandId: msi.id,
    categoryId: laptopStockCategory.id,
    categorySlug: "laptop-stock",
    modelNumber: "Katana15",
    condition: "STOCK",
    priority: 16,
    image: "msi-katana-15",
    shortDescription: "گیمینگ اقتصادی — کارکرده و تست‌شده",
    description:
      "Katana 15 یک دستگاه دست‌دوم تست‌شده است؛ باتری و صفحه‌کلید قبل از عرضه بازبینی شده‌اند. برای شروع گیمینگ با بودجه‌ی محدودتر مناسب است.",
    specs: [
      { definitionId: cpuGaming.id, value: "Intel Core i7-13620H" },
      { definitionId: gpuGaming.id, value: "GeForce RTX 4060 Laptop ۸GB" },
      { definitionId: displayGaming.id, value: "۱۵٫۶ اینچ FHD ۱۴۴Hz" },
      { definitionId: weightGaming.id, value: "۲٫۲۵ کیلوگرم" },
    ],
    variants: [
      {
        sku: "ARB-MSI-KATANA15-DEFAULT",
        isDefault: true,
        finalPrice: 98_000_000n,
        compareAtPrice: 112_000_000n,
        stock: { quantity: 2 },
      },
    ],
  });

  await seedProduct({
    slug: "asus-tuf-gaming-a15",
    name: "ASUS TUF Gaming A15",
    brandId: asus.id,
    categoryId: laptopStockCategory.id,
    categorySlug: "laptop-stock",
    modelNumber: "TUFA15",
    condition: "STOCK",
    priority: 14,
    image: "asus-tuf-gaming-a15",
    shortDescription: "بدنه‌ی مقاوم نظامی — کارکرده و تست‌شده",
    description:
      "TUF Gaming A15 با استاندارد مقاومت نظامی MIL-STD-810H ساخته شده. این نسخه کارکرده، پیش از عرضه از نظر سلامت باتری و بدنه بازبینی و تست شده.",
    specs: [
      { definitionId: cpuGaming.id, value: "AMD Ryzen 7 7735HS" },
      { definitionId: gpuGaming.id, value: "GeForce RTX 4050 Laptop ۶GB" },
      { definitionId: displayGaming.id, value: "۱۵٫۶ اینچ FHD ۱۴۴Hz" },
      { definitionId: weightGaming.id, value: "۲٫۲ کیلوگرم" },
    ],
    variants: [
      {
        sku: "ARB-ASUS-TUFA15-DEFAULT",
        isDefault: true,
        finalPrice: 86_000_000n,
        stock: { quantity: 3 },
      },
    ],
  });

  // ==================== کیس گیمینگ (۳ محصول) ====================
  await seedProduct({
    slug: "msi-aegis-rs-2026",
    name: "MSI Aegis RS 2026",
    brandId: msi.id,
    categoryId: gamingPcCategory.id,
    modelNumber: "AegisRS2026",
    condition: "NEW",
    priority: 48,
    image: "msi-aegis-rs-2026",
    shortDescription: "کیس آماده‌ی رده‌ی بالا برای بازی و رندر",
    description:
      "Aegis RS از پیش با کابل‌کشی مرتب و خنک‌کاری مایع مونتاژ و تست شده — نیازی به بستن قطعات نیست. برای بازی روی رزولوشن بالا و رندر همزمان مناسب است.",
    specs: [
      { definitionId: cpuPc.id, value: "Intel Core Ultra 9 285K" },
      { definitionId: gpuPc.id, value: "GeForce RTX 5080 ۱۶GB" },
      { definitionId: psuPc.id, value: "۸۵۰ وات — ۸۰+ Gold" },
    ],
    variants: [
      {
        sku: "ARB-MSI-AEGISRS-32-1TB",
        isDefault: false,
        finalPrice: 185_000_000n,
        axes: [
          { definitionId: ramPc.id, value: "۳۲GB" },
          { definitionId: storagePc.id, value: "۱TB" },
        ],
        stock: { quantity: 4 },
      },
      {
        sku: "ARB-MSI-AEGISRS-64-2TB",
        isDefault: true,
        finalPrice: 215_000_000n,
        axes: [
          { definitionId: ramPc.id, value: "۶۴GB" },
          { definitionId: storagePc.id, value: "۲TB" },
        ],
        stock: { quantity: 2 },
      },
    ],
  });

  await seedProduct({
    slug: "asus-rog-strix-ga35",
    name: "ASUS ROG Strix GA35",
    brandId: asus.id,
    categoryId: gamingPcCategory.id,
    modelNumber: "GA35",
    condition: "NEW",
    priority: 44,
    image: "asus-rog-strix-ga35",
    shortDescription: "پلتفرم AMD رده‌ی بالا برای گیمینگ رقابتی",
    description:
      "ROG Strix GA35 با پردازنده‌ی ۱۶ هسته‌ای AMD و گرافیک RTX 5070 Ti برای بازی‌های رقابتی روی نرخ فریم بالا ساخته شده. کیس با پنل شیشه‌ای و نورپردازی Aura Sync عرضه می‌شود.",
    specs: [
      { definitionId: cpuPc.id, value: "AMD Ryzen 9 9950X" },
      { definitionId: gpuPc.id, value: "GeForce RTX 5070 Ti ۱۶GB" },
      { definitionId: psuPc.id, value: "۸۵۰ وات — ۸۰+ Gold" },
    ],
    variants: [
      {
        sku: "ARB-ASUS-GA35-DEFAULT",
        isDefault: true,
        finalPrice: 165_000_000n,
        axes: [
          { definitionId: ramPc.id, value: "۳۲GB" },
          { definitionId: storagePc.id, value: "۲TB" },
        ],
        stock: { quantity: 3 },
      },
    ],
  });

  await seedProduct({
    slug: "msi-codex-r2",
    name: "MSI Codex R2",
    brandId: msi.id,
    categoryId: gamingPcCategory.id,
    modelNumber: "CodexR2",
    condition: "OPEN_BOX",
    priority: 36,
    image: "msi-codex-r2",
    shortDescription: "ورودی گیمینگ باقیمت مناسب — جعبه باز شده",
    description:
      "Codex R2 برای شروع گیمینگ روی FHD/QHD کافی است. این نسخه جعبه‌اش یک‌بار باز شده و دستگاه پیش از عرضه روشن و تست شده.",
    specs: [
      { definitionId: cpuPc.id, value: "Intel Core i7-14700F" },
      { definitionId: gpuPc.id, value: "GeForce RTX 4070 SUPER ۱۲GB" },
      { definitionId: psuPc.id, value: "۶۵۰ وات — ۸۰+ Bronze" },
    ],
    variants: [
      {
        sku: "ARB-MSI-CODEXR2-DEFAULT",
        isDefault: true,
        finalPrice: 96_000_000n,
        stock: { quantity: 5 },
      },
    ],
  });

  return {
    laptopNewCategory: laptopNewCategory.id,
    laptopOpenBoxCategory: laptopOpenBoxCategory.id,
    laptopStockCategory: laptopStockCategory.id,
    surfaceCategory: surfaceCategory.id,
    gamingPcCategory: gamingPcCategory.id,
    totalPower: totalPower.id,
    brightness: brightness.id,
  };
}

/**
 * بند ۷ سند T-150، توسعه‌یافته در T-210 §۴ — بلوک‌های صفحه‌ی اصلی.
 * `config` حالا اسکیمای Zod جدا به‌ازای هر نوع دارد
 * (`HomepageBlockConfigSchema`، `packages/contracts/src/content/block-config.ts`)
 * و شناسه‌ها همه slug هستند، نه id خام — `ContentService` آن‌ها را حل می‌کند.
 * ترتیب بخش‌ها ثابتِ طراحی است (§۴، هشدار)؛ همین ترتیب این‌جا seed می‌شود.
 */
async function seedHomepage(metricDefIds: {
  totalPower: string;
  brightness: string;
}) {
  const blocks: {
    type:
      | "HERO"
      | "CATEGORY_GRID"
      | "FLAGSHIP_DUEL"
      | "PRODUCT_RAIL"
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
      subtitle: "لپ‌تاپ، سرفیس و کیس گیمینگ — تست‌شده پیش از ارسال",
      ctaLabel: "مشاهده‌ی فروشگاه",
      ctaUrl: "/products",
      // T-201 — placeholder مثل seed-images محصول T-150؛ عکس واقعی هیرو
      // هنوز نرسیده (ر.ک. گزارش T-201 برای ابعاد لازم).
      imageDesktop: "/seed-images/hero-desktop.svg",
      imageMobile: "/seed-images/hero-mobile.svg",
      imageAlt: "لپ‌تاپ‌های منتخب آربایت روی میز کار",
      // T-211 — هیروی اسکرولی؛ فریم‌های واقعی هنوز نساخته شده، فقط شکل
      // قرارداد اینجا seed می‌شود.
      config: { framesManifest: "/hero/manifest.json" },
    },
    {
      type: "CATEGORY_GRID",
      sortOrder: 1,
      title: "دسته‌بندی‌ها",
      config: {
        categorySlugs: [
          "laptop-new",
          "laptop-open-box",
          "laptop-stock",
          "surface",
          "gaming-pc",
        ],
      },
    },
    {
      type: "FLAGSHIP_DUEL",
      sortOrder: 2,
      title: "دو پرچم‌دار، یک انتخاب",
      subtitle: "هر دو با RTX 5090. تفاوت در توان پایدار و نمایشگر است.",
      config: {
        productSlugs: ["msi-titan-18-hx", "asus-rog-strix-scar-18"],
        metrics: [metricDefIds.totalPower, metricDefIds.brightness],
      },
    },
    {
      type: "PRODUCT_RAIL",
      sortOrder: 3,
      title: "محصولات منتخب",
      // یکی بزرگ + دو کوچک (Featured) — بدون تکرار دو پرچم‌دار بالا.
      config: {
        productSlugs: [
          "asus-rog-strix-g16",
          "lenovo-legion-pro-7i",
          "microsoft-surface-laptop-studio-2",
        ],
      },
    },
    {
      type: "BENEFITS",
      sortOrder: 4,
      title: "چرا آربایت",
      subtitle:
        "هر دستگاه پیش از ارسال تست می‌شود و با گارانتی رسمی به دست شما می‌رسد.",
    },
    {
      // T-201 — API وبلاگ هنوز نیست (T-207)؛ این بلوک فقط عنوان/جایگاه را
      // نگه می‌دارد، فرانت با حالت خالی رندرش می‌کند.
      type: "BLOG_RAIL",
      sortOrder: 5,
      title: "از وبلاگ آربایت",
    },
  ];

  // T-210 §۴ — بلوک‌های قدیمی (CATEGORY_GRID@1/PRODUCT_RAIL@2 از T-150،
  // با شکل config پیشین) دیگر با ترتیب/نوع جدید یکی نیستند؛ پاک‌سازی و
  // ساخت دوباره ساده‌تر از migrate-in-place روی هر ترکیب type+sortOrder است.
  await prisma.homepageBlock.deleteMany({});

  for (const block of blocks) {
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
  const catalogIds = await seedCatalog();
  await seedHomepage({
    totalPower: catalogIds.totalPower,
    brightness: catalogIds.brightness,
  });
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
