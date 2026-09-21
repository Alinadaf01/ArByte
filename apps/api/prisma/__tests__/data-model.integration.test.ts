/**
 * تست‌های یکپارچگی T-003 روی دیتابیس محلی واقعی (نه Mock) — دقیقاً سه مورد
 * معیار پذیرش: تریگر Immutable بودن AuditLog، Partial Unique Index روی
 * slug با Soft Delete، و رزرو همزمان موجودی (Optimistic Locking).
 *
 * نیازمند Postgres در حال اجرا (docker compose -f infra/docker/docker-compose.dev.yml up -d postgres)
 * و DATABASE_URL در apps/api/.env.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

afterAll(async () => {
  await prisma.$disconnect();
});

describe("AuditLog immutability (§۸.۷۷/۸.۷۸ — DB-level trigger)", () => {
  it("rejects a manual UPDATE", async () => {
    const log = await prisma.auditLog.create({
      data: {
        action: "TEST_ACTION",
        entityType: "Test",
        entityId: randomUUID(),
      },
    });

    await expect(
      prisma.$executeRawUnsafe(
        `UPDATE "AuditLog" SET action = 'TAMPERED' WHERE id = $1`,
        log.id,
      ),
    ).rejects.toThrow(/غیرقابل‌تغییر|immutable/i);
  });

  it("rejects a manual DELETE", async () => {
    const log = await prisma.auditLog.create({
      data: {
        action: "TEST_ACTION",
        entityType: "Test",
        entityId: randomUUID(),
      },
    });

    await expect(
      prisma.$executeRawUnsafe(`DELETE FROM "AuditLog" WHERE id = $1`, log.id),
    ).rejects.toThrow(/غیرقابل‌تغییر|immutable/i);
  });
});

describe("Partial unique index — slug + Soft Delete (§۸.۸۱ تله)", () => {
  it("allows reusing a slug after the original product is soft-deleted", async () => {
    const slug = `test-slug-${randomUUID()}`;
    const brand = await prisma.brand.create({
      data: {
        name: `Test Brand ${randomUUID()}`,
        slug: `test-brand-${randomUUID()}`,
      },
    });
    const category = await prisma.category.create({
      data: { name: "Test Category", slug: `test-category-${randomUUID()}` },
    });

    const first = await prisma.product.create({
      data: {
        name: "Product A",
        slug,
        brandId: brand.id,
        categoryId: category.id,
        condition: "NEW",
      },
    });

    // بدون Soft Delete، ساختن محصول دوم با همین slug باید رد شود.
    await expect(
      prisma.product.create({
        data: {
          name: "Product B",
          slug,
          brandId: brand.id,
          categoryId: category.id,
          condition: "NEW",
        },
      }),
    ).rejects.toThrow();

    await prisma.product.update({
      where: { id: first.id },
      data: { deletedAt: new Date() },
    });

    // بعد از Soft Delete، همان slug باید دوباره قابل استفاده باشد.
    const second = await prisma.product.create({
      data: {
        name: "Product B",
        slug,
        brandId: brand.id,
        categoryId: category.id,
        condition: "NEW",
      },
    });

    expect(second.slug).toBe(slug);
    expect(second.id).not.toBe(first.id);
  });
});

describe("رزرو همزمان موجودی — Optimistic Locking (§۸.۸۳، قاعده‌ی فنی #۳)", () => {
  it("allows only one of two concurrent reservations on the last unit", async () => {
    const brand = await prisma.brand.create({
      data: {
        name: `Concurrency Brand ${randomUUID()}`,
        slug: `conc-brand-${randomUUID()}`,
      },
    });
    const category = await prisma.category.create({
      data: {
        name: "Concurrency Category",
        slug: `conc-category-${randomUUID()}`,
      },
    });
    const product = await prisma.product.create({
      data: {
        name: "Concurrency Product",
        slug: `conc-product-${randomUUID()}`,
        brandId: brand.id,
        categoryId: category.id,
        condition: "NEW",
      },
    });
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `CONC-${randomUUID()}`,
        priceModel: "FIXED",
        finalPrice: 1_000_000n,
      },
    });
    const warehouse = await prisma.warehouse.create({
      data: { name: `Concurrency Warehouse ${randomUUID()}` },
    });
    await prisma.inventory.create({
      data: {
        variantId: variant.id,
        warehouseId: warehouse.id,
        quantity: 1,
        reservedQuantity: 0,
      },
    });

    // الگوی مستند در docs/data-model.md — CAS با version، رزرو ۱ عدد.
    async function tryReserve(): Promise<number> {
      const current = await prisma.inventory.findUniqueOrThrow({
        where: {
          variantId_warehouseId: {
            variantId: variant.id,
            warehouseId: warehouse.id,
          },
        },
      });
      const affected = await prisma.$executeRawUnsafe(
        `UPDATE "Inventory"
         SET "reservedQuantity" = "reservedQuantity" + 1, version = version + 1
         WHERE "variantId" = $1 AND "warehouseId" = $2 AND version = $3
           AND "quantity" - "reservedQuantity" >= 1`,
        variant.id,
        warehouse.id,
        current.version,
      );
      return affected as number;
    }

    const [resultA, resultB] = await Promise.all([tryReserve(), tryReserve()]);
    const successCount = [resultA, resultB].filter((n) => n === 1).length;

    expect(successCount).toBe(1);

    const finalInventory = await prisma.inventory.findUniqueOrThrow({
      where: {
        variantId_warehouseId: {
          variantId: variant.id,
          warehouseId: warehouse.id,
        },
      },
    });
    expect(finalInventory.reservedQuantity).toBe(1);
    expect(finalInventory.availableQuantity).toBe(0);
  });
});
