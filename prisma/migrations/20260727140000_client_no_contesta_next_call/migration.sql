-- AlterEnum
ALTER TYPE "ClientPipelineStatus" ADD VALUE 'NO_CONTESTA';

-- AlterTable
ALTER TABLE "users" ADD COLUMN "next_call_at" TIMESTAMP(3),
ADD COLUMN "last_call_outcome" TEXT;

-- CreateIndex
CREATE INDEX "users_next_call_at_idx" ON "users"("next_call_at");
