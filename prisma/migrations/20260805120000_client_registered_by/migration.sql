-- AlterTable
ALTER TABLE "users" ADD COLUMN "registered_by_id" TEXT;

-- CreateIndex
CREATE INDEX "users_registered_by_id_idx" ON "users"("registered_by_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_registered_by_id_fkey" FOREIGN KEY ("registered_by_id") REFERENCES "staff_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
