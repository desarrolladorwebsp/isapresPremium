-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "clinics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "unique_code" TEXT NOT NULL,
    "isapre" TEXT NOT NULL,
    "plan_name" TEXT NOT NULL,
    "base_price_uf" DOUBLE PRECISION NOT NULL,
    "has_top" BOOLEAN NOT NULL DEFAULT false,
    "additional_notes" TEXT,
    "pdf_url" TEXT,
    "pdf_public_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("unique_code")
);

-- CreateTable
CREATE TABLE "coverage_entries" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "clinic_name" TEXT NOT NULL,
    "percentage" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "plan_code" TEXT NOT NULL,

    CONSTRAINT "coverage_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plans_isapre_idx" ON "plans"("isapre");

-- CreateIndex
CREATE INDEX "coverage_entries_plan_code_idx" ON "coverage_entries"("plan_code");

-- CreateIndex
CREATE INDEX "coverage_entries_clinic_id_idx" ON "coverage_entries"("clinic_id");

-- AddForeignKey
ALTER TABLE "coverage_entries" ADD CONSTRAINT "coverage_entries_plan_code_fkey" FOREIGN KEY ("plan_code") REFERENCES "plans"("unique_code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coverage_entries" ADD CONSTRAINT "coverage_entries_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

