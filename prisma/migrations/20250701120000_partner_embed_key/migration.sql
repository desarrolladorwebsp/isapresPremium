-- Agent Key público para widget y deep links (?agent=)
ALTER TABLE "partner_entities" ADD COLUMN "embed_key" TEXT;

UPDATE "partner_entities" SET "embed_key" = "slug" WHERE "embed_key" IS NULL;

ALTER TABLE "partner_entities" ALTER COLUMN "embed_key" SET NOT NULL;

CREATE UNIQUE INDEX "partner_entities_embed_key_key" ON "partner_entities"("embed_key");
