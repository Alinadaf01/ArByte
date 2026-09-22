/**
 * تست یکپارچگی روی دیتابیس محلی واقعی — معیارهای پذیرش صریح T-101:
 * یکتایی key، swatchHex فقط برای COLOR، منع حذفِ مشخصه/مقدارِ در حال استفاده.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditLogService } from "../../common/audit/audit-log.service";
import { SpecificationService } from "./specification.service";

const prisma = new PrismaService();
const auditLog = new AuditLogService(prisma);
const specService = new SpecificationService(prisma, auditLog);

afterAll(async () => {
  await prisma.$disconnect();
});

function uniqueKey(prefix: string) {
  return `${prefix}-${randomUUID()}`;
}

describe("SpecificationService", () => {
  it("دو مشخصه با key یکسان رد می‌شود", async () => {
    const key = uniqueKey("dup-key");
    await specService.create(null, {
      key,
      nameFa: "مشخصه تست",
      type: "TEXT",
      isRequired: false,
      isFilterable: false,
      isSearchable: false,
      isVariantAxis: false,
      sortOrder: 0,
    });

    await expect(
      specService.create(null, {
        key,
        nameFa: "مشخصه دیگر",
        type: "TEXT",
        isRequired: false,
        isFilterable: false,
        isSearchable: false,
        isVariantAxis: false,
        sortOrder: 0,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("swatchHex فقط برای نوع COLOR مجاز است", async () => {
    const textDef = await specService.create(null, {
      key: uniqueKey("text-spec"),
      nameFa: "مشخصه متنی",
      type: "TEXT",
      isRequired: false,
      isFilterable: false,
      isSearchable: false,
      isVariantAxis: false,
      sortOrder: 0,
    });

    await expect(
      specService.addValue(null, textDef.id, {
        value: "قرمز",
        swatchHex: "#ff0000",
        sortOrder: 0,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    const colorDef = await specService.create(null, {
      key: uniqueKey("color-spec"),
      nameFa: "رنگ",
      type: "COLOR",
      isRequired: false,
      isFilterable: false,
      isSearchable: false,
      isVariantAxis: true,
      sortOrder: 0,
    });

    const withValue = await specService.addValue(null, colorDef.id, {
      value: "قرمز",
      swatchHex: "#ff0000",
      sortOrder: 0,
    });
    expect(withValue.values.some((v) => v.swatchHex === "#ff0000")).toBe(true);
  });

  it("حذف مشخصه‌ی در حال استفاده مسدود می‌شود", async () => {
    const def = await specService.create(null, {
      key: uniqueKey("used-spec"),
      nameFa: "مشخصه استفاده‌شده",
      type: "TEXT",
      isRequired: false,
      isFilterable: false,
      isSearchable: false,
      isVariantAxis: false,
      sortOrder: 0,
    });
    await prisma.productSpecification.create({
      data: { specificationDefinitionId: def.id, customValue: "مقدار" },
    });

    let caught: unknown;
    try {
      await specService.remove(null, def.id);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ConflictException);
    expect((caught as ConflictException).getResponse()).toMatchObject({
      code: "CONFLICT",
    });
  });

  it("حذف مقدارِ در حال استفاده مسدود می‌شود", async () => {
    const def = await specService.create(null, {
      key: uniqueKey("used-value-spec"),
      nameFa: "مشخصه با مقدار استفاده‌شده",
      type: "SELECT",
      isRequired: false,
      isFilterable: false,
      isSearchable: false,
      isVariantAxis: false,
      sortOrder: 0,
    });
    const withValue = await specService.addValue(null, def.id, {
      value: "گزینه ۱",
      sortOrder: 0,
    });
    const value = withValue.values[0]!;
    await prisma.productSpecification.create({
      data: {
        specificationDefinitionId: def.id,
        specificationValueId: value.id,
      },
    });

    await expect(
      specService.removeValue(null, def.id, value.id),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("حذف مشخصه/مقدارِ بلااستفاده موفق می‌شود", async () => {
    const def = await specService.create(null, {
      key: uniqueKey("unused-spec"),
      nameFa: "مشخصه بلااستفاده",
      type: "TEXT",
      isRequired: false,
      isFilterable: false,
      isSearchable: false,
      isVariantAxis: false,
      sortOrder: 0,
    });
    await specService.remove(null, def.id);

    await expect(
      prisma.specificationDefinition.findUnique({ where: { id: def.id } }),
    ).resolves.toBeNull();
  });

  it("ویرایش/حذف مشخصه‌ی ناموجود NotFoundException می‌دهد", async () => {
    await expect(
      specService.update(null, "nonexistent-id", { nameFa: "x" }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      specService.remove(null, "nonexistent-id"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
