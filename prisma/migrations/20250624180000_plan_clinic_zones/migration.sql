-- Zonas geográficas para filtrado por sector/región
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "zones" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "zones" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
