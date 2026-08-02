-- AlterTable
ALTER TABLE "quotes" ADD COLUMN "partner_entity_slug" TEXT;
ALTER TABLE "quotes" ADD COLUMN "partner_entity_name" TEXT;

-- CreateIndex
CREATE INDEX "quotes_partner_entity_slug_idx" ON "quotes"("partner_entity_slug");
