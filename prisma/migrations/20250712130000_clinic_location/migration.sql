-- Add editable, map-backing location fields to clinics
ALTER TABLE "clinics"
  ADD COLUMN "address" TEXT,
  ADD COLUMN "lat" DOUBLE PRECISION,
  ADD COLUMN "lng" DOUBLE PRECISION,
  ADD COLUMN "location_source" TEXT,
  ADD COLUMN "location_updated_at" TIMESTAMP(3);
