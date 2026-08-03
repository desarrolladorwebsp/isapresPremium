-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tracking_executive_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "confirmation_call_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "users_tracking_executive_id_idx" ON "users"("tracking_executive_id");
CREATE INDEX IF NOT EXISTS "users_confirmation_call_at_idx" ON "users"("confirmation_call_at");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_tracking_executive_id_fkey'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_tracking_executive_id_fkey"
      FOREIGN KEY ("tracking_executive_id")
      REFERENCES "staff_accounts"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
