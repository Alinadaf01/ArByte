/**
 * تست یکپارچگی روی دیتابیس محلی واقعی — T-200: درخت دسته‌بندی عمومی فقط
 * دسته‌بندی‌های فعال و حذف‌نشده را برمی‌گرداند و تودرتو (parentId) می‌سازد.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
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
