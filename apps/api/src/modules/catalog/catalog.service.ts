import { Inject, Injectable } from "@nestjs/common";
import type { CategoryTreeNode } from "@arbyte/contracts";
import { PrismaService } from "../../prisma/prisma.service";

/** §۸.۱۸، T-200. عمومی — بدون احراز هویت، فقط دسته‌بندی‌های فعال و حذف‌نشده. */
@Injectable()
export class CatalogService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getCategoryTree(): Promise<CategoryTreeNode[]> {
    const rows = await this.prisma.category.findMany({
      where: { isActive: true, deletedAt: null },
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
}
