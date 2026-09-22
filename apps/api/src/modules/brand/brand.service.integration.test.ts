/**
 * تست یکپارچگی روی دیتابیس محلی واقعی — معیارهای پذیرش صریح T-101:
 * منع حذف برند دارای محصول، یکتایی name/slug، seo upsert.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditLogService } from "../../common/audit/audit-log.service";
import { BrandService } from "./brand.service";

const prisma = new PrismaService();
const auditLog = new AuditLogService(prisma);
const brandService = new BrandService(prisma, auditLog);

afterAll(async () => {
  await prisma.$disconnect();
});

function uniqueName(prefix: string) {
  return `${prefix} ${randomUUID()}`;
}

describe("BrandService", () => {
  it("دو برند با name یکسان رد می‌شود", async () => {
    const name = uniqueName("Dup Brand Name");
    await brandService.create(null, { name, isActive: true });

    await expect(
      brandService.create(null, { name, isActive: true }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("دو برند با slug یکسان رد می‌شود", async () => {
    const slug = `dup-brand-slug-${randomUUID()}`;
    await brandService.create(null, {
      name: uniqueName("Brand A"),
      slug,
      isActive: true,
    });

    await expect(
      brandService.create(null, {
        name: uniqueName("Brand B"),
        slug,
        isActive: true,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("حذف برندِ دارای محصول مسدود می‌شود", async () => {
    const brand = await brandService.create(null, {
      name: uniqueName("Has Products"),
      isActive: true,
    });
    const category = await prisma.category.create({
      data: {
        name: uniqueName("Cat"),
        slug: `cat-${randomUUID()}`,
        sortOrder: 0,
      },
    });
    await prisma.product.create({
      data: {
        name: uniqueName("Product"),
        slug: `product-${randomUUID()}`,
        brandId: brand.id,
        categoryId: category.id,
        condition: "NEW",
      },
    });

    let caught: unknown;
    try {
      await brandService.remove(null, brand.id);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ConflictException);
    expect((caught as ConflictException).getResponse()).toMatchObject({
      code: "CONFLICT",
    });
  });

  it("حذف برندِ خالی موفق می‌شود (soft delete)", async () => {
    const brand = await brandService.create(null, {
      name: uniqueName("Empty Brand"),
      isActive: true,
    });
    await brandService.remove(null, brand.id);

    const row = await prisma.brand.findUniqueOrThrow({
      where: { id: brand.id },
    });
    expect(row.deletedAt).not.toBeNull();
  });

  it("seo با nested create/upsert درست ذخیره می‌شود", async () => {
    const created = await brandService.create(null, {
      name: uniqueName("Seo Brand"),
      isActive: true,
      seo: { metaTitle: "عنوان برند" },
    });
    expect(created.seo?.metaTitle).toBe("عنوان برند");

    const updated = await brandService.update(null, created.id, {
      seo: { metaTitle: "عنوان جدید برند" },
    });
    expect(updated.seo?.metaTitle).toBe("عنوان جدید برند");
  });

  it("ویرایش/حذف برندِ ناموجود NotFoundException می‌دهد", async () => {
    await expect(
      brandService.update(null, "nonexistent-id", { name: "x" }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      brandService.remove(null, "nonexistent-id"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
