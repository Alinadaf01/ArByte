-- T-149: حذف اقساط و انبار مکان‌دار (هیچ‌کدام درخواست واقعی نداشتند)

-- ProductVariant: حذف فیلدهای اقساط
ALTER TABLE "ProductVariant" DROP COLUMN "installmentEligible";
ALTER TABLE "ProductVariant" DROP COLUMN "maxInstallments";

-- Inventory / InventoryTransaction: حذف بُعد مکان (warehouseId)
ALTER TABLE "Inventory" DROP CONSTRAINT "Inventory_warehouseId_fkey";
ALTER TABLE "InventoryTransaction" DROP CONSTRAINT "InventoryTransaction_warehouseId_fkey";

DROP INDEX "Inventory_warehouseId_idx";
DROP INDEX "InventoryTransaction_warehouseId_idx";

ALTER TABLE "Inventory" DROP CONSTRAINT "Inventory_pkey";
ALTER TABLE "Inventory" DROP COLUMN "warehouseId";
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_pkey" PRIMARY KEY ("variantId");

ALTER TABLE "InventoryTransaction" DROP COLUMN "warehouseId";

-- Warehouse: حذف کامل موجودیت
DROP TABLE "Warehouse";
