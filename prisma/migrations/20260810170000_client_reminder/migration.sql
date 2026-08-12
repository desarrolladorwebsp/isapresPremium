-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reminder_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reminder_note" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "users_reminder_at_idx" ON "users"("reminder_at");
