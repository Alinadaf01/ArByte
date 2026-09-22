/**
 * تست یکپارچگی روی دیتابیس محلی واقعی — معیارهای پذیرش صریح T-101:
 * سلسله‌مراتب حداکثر دو سطح، منع حذف دسته‌بندی دارای محصول، یکتایی slug.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditLogService } from "../../common/audit/audit-log.service";
import { CategoryService } from "./category.service";

const prisma = new PrismaService();
const auditLog = new AuditLogService(prisma);
const categoryService = new CategoryService(prisma, auditLog);

afterAll(async () => {
  await prisma.$disconnect();
});

function uniqueName(prefix: string) {
  return `${prefix} ${randomUUID()}`;
}

describe("CategoryService", () => {
  it("slug را از روی name خودکار می‌سازد وقتی خالی است", async () => {
    const created = await categoryService.create(null, {
      name: uniqueName("Test Category"),
      sortOrder: 0,
      isActive: true,
    });
    expect(created.slug.length).toBeGreaterThan(0);
  });

  it("دو دسته‌بندی با slug یکسان رد می‌شود", async () => {
    const slug = `dup-slug-${randomUUID()}`;
    await categoryService.create(null, {
      name: uniqueName("Cat A"),
      slug,
      sortOrder: 0,
      isActive: true,
    });

    await expect(
      categoryService.create(null, {
        name: uniqueName("Cat B"),
        slug,
        sortOrder: 0,
        isActive: true,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("سلسله‌مراتب فقط دو سطح مجاز است — زیرمجموعه‌ی زیرمجموعه رد می‌شود", async () => {
    const root = await categoryService.create(null, {
      name: uniqueName("Root"),
      sortOrder: 0,
      isActive: true,
    });
    const child = await categoryService.create(null, {
      name: uniqueName("Child"),
      parentId: root.id,
      sortOrder: 0,
      isActive: true,
    });

    await expect(
      categoryService.create(null, {
        name: uniqueName("Grandchild"),
        parentId: child.id,
        sortOrder: 0,
        isActive: true,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("حذف دسته‌بندیِ دارای محصول مسدود می‌شود", async () => {
    const category = await categoryService.create(null, {
      name: uniqueName("Has Products"),
      sortOrder: 0,
      isActive: true,
    });
    const brand = await prisma.brand.create({
      data: { name: uniqueName("Brand"), slug: `brand-${randomUUID()}` },
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
      await categoryService.remove(null, category.id);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ConflictException);
    expect((caught as ConflictException).getResponse()).toMatchObject({
      code: "CONFLICT",
    });
  });

  it("حذف دسته‌بندیِ دارای زیرمجموعه مسدود می‌شود", async () => {
    const root = await categoryService.create(null, {
      name: uniqueName("Parent With Child"),
      sortOrder: 0,
      isActive: true,
    });
    await categoryService.create(null, {
      name: uniqueName("Child Of It"),
      parentId: root.id,
      sortOrder: 0,
      isActive: true,
    });

    await expect(categoryService.remove(null, root.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("حذف دسته‌بندیِ خالی موفق می‌شود (soft delete)", async () => {
    const category = await categoryService.create(null, {
      name: uniqueName("Empty Category"),
      sortOrder: 0,
      isActive: true,
    });
    await categoryService.remove(null, category.id);

    const remaining = await categoryService.list();
    expect(remaining.find((c) => c.id === category.id)).toBeUndefined();

    const row = await prisma.category.findUniqueOrThrow({
      where: { id: category.id },
    });
    expect(row.deletedAt).not.toBeNull();
  });

  it("seo با nested create/upsert درست ذخیره می‌شود", async () => {
    const created = await categoryService.create(null, {
      name: uniqueName("Seo Category"),
      sortOrder: 0,
      isActive: true,
      seo: { metaTitle: "عنوان تست", metaDescription: "توضیح تست" },
    });
    expect(created.seo?.metaTitle).toBe("عنوان تست");

    const updated = await categoryService.update(null, created.id, {
      seo: { metaTitle: "عنوان جدید" },
    });
    expect(updated.seo?.metaTitle).toBe("عنوان جدید");
  });

  it("ویرایش/حذف دسته‌بندیِ ناموجود NotFoundException می‌دهد", async () => {
    await expect(
      categoryService.update(null, "nonexistent-id", { name: "x" }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      categoryService.remove(null, "nonexistent-id"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
