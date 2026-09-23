-- T-150: گپ قرارداد/مدل — AvailabilitySchema مقدار PREORDER دارد، مدل نداشت.
-- (نکته: خط "DROP DEFAULT" روی Inventory.availableQuantity که Prisma خودش
-- تولید کرده بود حذف شد — ستون GENERATED است و Postgres اصلاً روی چنین
-- ستونی DEFAULT ندارد تا DROP شود؛ همان false-positive شناخته‌شده‌ی diff
-- Prisma در برابر ستون‌های GENERATED دستی، ر.ک. docs/data-model.md.)

ALTER TABLE "ProductVariant" ADD COLUMN "isPreorder" BOOLEAN NOT NULL DEFAULT false;
