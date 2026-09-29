CREATE TYPE "ClientQuotationStatus" AS ENUM ('DRAFT', 'SENT', 'RECEIVED', 'ACCEPTED', 'REJECTED', 'VOIDED');
CREATE TYPE "ClientQuotationActivityType" AS ENUM ('CREATED', 'PDF_DOWNLOADED', 'EMAIL_SENT', 'EMAIL_FAILED', 'WHATSAPP_OPENED', 'STATUS_CHANGED');
ALTER TYPE "ClientActivityType" ADD VALUE IF NOT EXISTS 'QUOTATION_CREATED';
ALTER TYPE "ClientActivityType" ADD VALUE IF NOT EXISTS 'QUOTATION_SENT';
ALTER TYPE "ClientActivityType" ADD VALUE IF NOT EXISTS 'QUOTATION_STATUS_CHANGED';

CREATE TABLE "client_quotations" (
  "id" TEXT NOT NULL, "number" TEXT NOT NULL, "client_id" TEXT NOT NULL,
  "executive_id" TEXT NOT NULL, "status" "ClientQuotationStatus" NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "client_snapshot" JSONB NOT NULL, "executive_snapshot" JSONB NOT NULL,
  "valid_until" TIMESTAMP(3), "issued_at" TIMESTAMP(3), "sent_at" TIMESTAMP(3),
  "received_at" TIMESTAMP(3), "accepted_at" TIMESTAMP(3), "rejected_at" TIMESTAMP(3),
  "voided_at" TIMESTAMP(3), "outcome_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "client_quotations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "client_quotation_items" (
  "id" TEXT NOT NULL, "quotation_id" TEXT NOT NULL, "plan_code" TEXT NOT NULL,
  "position" INTEGER NOT NULL, "plan_snapshot" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "client_quotation_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "client_quotation_activities" (
  "id" TEXT NOT NULL, "quotation_id" TEXT NOT NULL,
  "activity_type" "ClientQuotationActivityType" NOT NULL, "actor_id" TEXT,
  "actor_name" TEXT, "channel" TEXT, "previous_value" TEXT, "new_value" TEXT,
  "description" TEXT, "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "client_quotation_activities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "client_quotations_number_key" ON "client_quotations"("number");
CREATE INDEX "client_quotations_client_id_created_at_idx" ON "client_quotations"("client_id", "created_at");
CREATE INDEX "client_quotations_executive_id_created_at_idx" ON "client_quotations"("executive_id", "created_at");
CREATE INDEX "client_quotations_executive_id_status_created_at_idx" ON "client_quotations"("executive_id", "status", "created_at");
CREATE INDEX "client_quotations_status_created_at_idx" ON "client_quotations"("status", "created_at");
CREATE UNIQUE INDEX "client_quotation_items_quotation_id_plan_code_key" ON "client_quotation_items"("quotation_id", "plan_code");
CREATE UNIQUE INDEX "client_quotation_items_quotation_id_position_key" ON "client_quotation_items"("quotation_id", "position");
CREATE INDEX "client_quotation_items_plan_code_idx" ON "client_quotation_items"("plan_code");
CREATE INDEX "client_quotation_activities_quotation_id_created_at_idx" ON "client_quotation_activities"("quotation_id", "created_at");
CREATE INDEX "client_quotation_activities_actor_id_activity_type_created_at_idx" ON "client_quotation_activities"("actor_id", "activity_type", "created_at");
CREATE INDEX "client_quotation_activities_activity_type_created_at_idx" ON "client_quotation_activities"("activity_type", "created_at");

ALTER TABLE "client_quotations" ADD CONSTRAINT "client_quotations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_quotations" ADD CONSTRAINT "client_quotations_executive_id_fkey" FOREIGN KEY ("executive_id") REFERENCES "staff_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "client_quotation_items" ADD CONSTRAINT "client_quotation_items_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "client_quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_quotation_activities" ADD CONSTRAINT "client_quotation_activities_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "client_quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
