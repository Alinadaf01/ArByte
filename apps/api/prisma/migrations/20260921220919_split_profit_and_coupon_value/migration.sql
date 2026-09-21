/*
  Warnings:

  - You are about to drop the column `value` on the `Coupon` table. All the data in the column will be lost.
  - You are about to drop the column `profitValue` on the `PriceRule` table. All the data in the column will be lost.
  - You are about to drop the column `profitValue` on the `ProductVariant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Coupon" DROP COLUMN "value",
ADD COLUMN     "amountToman" BIGINT,
ADD COLUMN     "percentBasisPoints" INTEGER;

-- این ALTER عمداً حذف شد: Prisma فکر می‌کرد availableQuantity یک ستون معمولی
-- با DEFAULT است (به‌خاطر همان محدودیت مستندشده در docs/data-model.md —
-- schema.prisma نمی‌تواند GENERATED ALWAYS AS را توصیف کند)، و
-- `ALTER COLUMN ... DROP DEFAULT` روی یک ستون واقعاً Generated خطای
-- Postgres می‌دهد (باید DROP EXPRESSION باشد، که اینجا هم لازم نیست — ستون
-- از migration اول درست تعریف شده و دست‌نخورده می‌ماند).

-- AlterTable
ALTER TABLE "PriceRule" DROP COLUMN "profitValue",
ADD COLUMN     "profitAmountToman" BIGINT,
ADD COLUMN     "profitPercentBasisPoints" INTEGER;

-- AlterTable
ALTER TABLE "ProductVariant" DROP COLUMN "profitValue",
ADD COLUMN     "profitAmountToman" BIGINT,
ADD COLUMN     "profitPercentBasisPoints" INTEGER;

-- ============================================================================
-- دستی — T-003-DECISION: بدون این CHECKها، دو ستون nullable فقط ابهام قبلی
-- را با اسم دیگری برمی‌گرداند. هر سه جفت دقیقاً یکی از دو ستون‌شان پر باشد
-- (ProductVariant اجازه‌ی «هیچ‌کدام» را هم دارد، چون profitType خودش nullable
-- است — سود واریانت اختیاری است؛ PriceRule/Coupon چون type‌شان الزامی است،
-- «هیچ‌کدام» مجاز نیست).
-- ============================================================================
ALTER TABLE "ProductVariant" ADD CONSTRAINT profit_shape CHECK (
  ("profitType" = 'AMOUNT'  AND "profitAmountToman" IS NOT NULL AND "profitPercentBasisPoints" IS NULL)
  OR
  ("profitType" = 'PERCENT' AND "profitPercentBasisPoints" IS NOT NULL AND "profitAmountToman" IS NULL)
  OR
  ("profitType" IS NULL AND "profitAmountToman" IS NULL AND "profitPercentBasisPoints" IS NULL)
);

ALTER TABLE "PriceRule" ADD CONSTRAINT profit_shape CHECK (
  ("profitType" = 'AMOUNT'  AND "profitAmountToman" IS NOT NULL AND "profitPercentBasisPoints" IS NULL)
  OR
  ("profitType" = 'PERCENT' AND "profitPercentBasisPoints" IS NOT NULL AND "profitAmountToman" IS NULL)
);

ALTER TABLE "Coupon" ADD CONSTRAINT value_shape CHECK (
  ("type" = 'AMOUNT'  AND "amountToman" IS NOT NULL AND "percentBasisPoints" IS NULL)
  OR
  ("type" = 'PERCENT' AND "percentBasisPoints" IS NOT NULL AND "amountToman" IS NULL)
);
