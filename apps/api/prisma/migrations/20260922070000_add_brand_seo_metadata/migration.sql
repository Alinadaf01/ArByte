-- AlterTable
ALTER TABLE "SeoMetadata" ADD COLUMN "brandId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SeoMetadata_brandId_key" ON "SeoMetadata"("brandId");

-- AddForeignKey
ALTER TABLE "SeoMetadata" ADD CONSTRAINT "SeoMetadata_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
