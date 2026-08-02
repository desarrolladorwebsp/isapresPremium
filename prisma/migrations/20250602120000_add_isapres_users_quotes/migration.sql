-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CLIENT', 'EXECUTIVE', 'ADMIN');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('PENDING', 'CONTACTED', 'CONVERTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "isapres" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "isapres_pkey" PRIMARY KEY ("id")
);

-- Seed isapres catalog
INSERT INTO "isapres" ("id", "name", "updated_at") VALUES
  ('consalud', 'Consalud', CURRENT_TIMESTAMP),
  ('banmedica', 'Banmédica', CURRENT_TIMESTAMP),
  ('colmena', 'Colmena', CURRENT_TIMESTAMP),
  ('cruz-blanca', 'Cruz Blanca', CURRENT_TIMESTAMP),
  ('vida-tres', 'Vida Tres', CURRENT_TIMESTAMP),
  ('nueva-masvida', 'Nueva Masvida', CURRENT_TIMESTAMP),
  ('esencial', 'Esencial', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- Add isapre_id column (nullable during backfill)
ALTER TABLE "plans" ADD COLUMN "isapre_id" TEXT;

-- Backfill isapre_id from legacy isapre text column
UPDATE "plans" SET "isapre_id" = CASE
  WHEN LOWER("isapre") = 'consalud' THEN 'consalud'
  WHEN LOWER("isapre") IN ('banmédica', 'banmedica') THEN 'banmedica'
  WHEN LOWER("isapre") = 'colmena' THEN 'colmena'
  WHEN LOWER("isapre") = 'cruz blanca' THEN 'cruz-blanca'
  WHEN LOWER("isapre") = 'vida tres' THEN 'vida-tres'
  WHEN LOWER("isapre") = 'nueva masvida' THEN 'nueva-masvida'
  WHEN LOWER("isapre") = 'esencial' THEN 'esencial'
  ELSE lower(regexp_replace(regexp_replace(trim("isapre"), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
END;

-- Insert any isapres referenced by plans that are not in catalog
INSERT INTO "isapres" ("id", "name", "updated_at")
SELECT DISTINCT p."isapre_id", p."isapre", CURRENT_TIMESTAMP
FROM "plans" p
WHERE p."isapre_id" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "isapres" i WHERE i."id" = p."isapre_id")
ON CONFLICT ("id") DO NOTHING;

-- Enforce NOT NULL and FK
ALTER TABLE "plans" ALTER COLUMN "isapre_id" SET NOT NULL;
ALTER TABLE "plans" DROP COLUMN "isapre";
CREATE INDEX "plans_isapre_id_idx" ON "plans"("isapre_id");
ALTER TABLE "plans" ADD CONSTRAINT "plans_isapre_id_fkey" FOREIGN KEY ("isapre_id") REFERENCES "isapres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable users
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "full_name" TEXT NOT NULL,
    "rut" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateTable quotes
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "plan_code" TEXT,
    "status" "QuoteStatus" NOT NULL DEFAULT 'PENDING',
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "rut" TEXT,
    "region" TEXT,
    "sex" TEXT,
    "monthly_income" TEXT,
    "contributor_age" INTEGER,
    "dependents_count" INTEGER NOT NULL DEFAULT 0,
    "dependent_ages" JSONB,
    "contact_preference" TEXT,
    "quote_reason" TEXT,
    "final_price_uf" DOUBLE PRECISION,
    "final_price_clp" DOUBLE PRECISION,
    "uf_value" DOUBLE PRECISION,
    "beneficiary_count" INTEGER,
    "total_factors" DOUBLE PRECISION,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "quotes_status_idx" ON "quotes"("status");
CREATE INDEX "quotes_plan_code_idx" ON "quotes"("plan_code");
CREATE INDEX "quotes_user_id_idx" ON "quotes"("user_id");
CREATE INDEX "quotes_created_at_idx" ON "quotes"("created_at");

ALTER TABLE "quotes" ADD CONSTRAINT "quotes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_plan_code_fkey" FOREIGN KEY ("plan_code") REFERENCES "plans"("unique_code") ON DELETE SET NULL ON UPDATE CASCADE;
