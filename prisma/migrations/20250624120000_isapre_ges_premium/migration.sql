-- AlterTable
ALTER TABLE "isapres" ADD COLUMN "ges_premium_uf" DOUBLE PRECISION NOT NULL DEFAULT 0.731;
ALTER TABLE "isapres" ADD COLUMN "ges_premium_uf_legacy" DOUBLE PRECISION;

-- Valores GES dic 2025 / referencia 2023-2024
UPDATE "isapres" SET "ges_premium_uf" = 0.712, "ges_premium_uf_legacy" = 0.63 WHERE "id" = 'vida-tres';
UPDATE "isapres" SET "ges_premium_uf" = 0.731, "ges_premium_uf_legacy" = 0.602 WHERE "id" = 'consalud';
UPDATE "isapres" SET "ges_premium_uf" = 0.778, "ges_premium_uf_legacy" = 0.602 WHERE "id" = 'banmedica';
UPDATE "isapres" SET "ges_premium_uf" = 0.854, "ges_premium_uf_legacy" = 0.795 WHERE "id" = 'nueva-masvida';
UPDATE "isapres" SET "ges_premium_uf" = 0.91, "ges_premium_uf_legacy" = 0.8 WHERE "id" = 'esencial';
UPDATE "isapres" SET "ges_premium_uf" = 0.971, "ges_premium_uf_legacy" = 0.74 WHERE "id" = 'cruz-blanca';
UPDATE "isapres" SET "ges_premium_uf" = 1.036, "ges_premium_uf_legacy" = 0.77 WHERE "id" = 'colmena';
