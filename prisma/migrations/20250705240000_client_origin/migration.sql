-- CreateEnum
CREATE TYPE "ClientOrigin" AS ENUM ('COTIZADOR', 'MANUAL');

-- AlterTable
ALTER TABLE "users"
  ADD COLUMN "client_origin" "ClientOrigin" NOT NULL DEFAULT 'COTIZADOR';

-- Backfill: clientes sin cotizaciones y sin ejecutivo → registro manual histórico
UPDATE "users"
SET "client_origin" = 'MANUAL'
WHERE "role" = 'CLIENT'
  AND "assigned_executive_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "quotes" WHERE "quotes"."user_id" = "users"."id"
  );
