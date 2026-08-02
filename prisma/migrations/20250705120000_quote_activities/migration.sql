-- CreateEnum
CREATE TYPE "QuoteActivityType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'EXECUTIVE_ASSIGNED', 'EXECUTIVE_UNASSIGNED', 'DISTRIBUTED');

-- CreateTable
CREATE TABLE "quote_activities" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "activity_type" "QuoteActivityType" NOT NULL,
    "previous_value" TEXT,
    "new_value" TEXT,
    "actor_realm" TEXT,
    "actor_id" TEXT,
    "actor_name" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quote_activities_quote_id_idx" ON "quote_activities"("quote_id");

-- CreateIndex
CREATE INDEX "quote_activities_created_at_idx" ON "quote_activities"("created_at");

-- AddForeignKey
ALTER TABLE "quote_activities" ADD CONSTRAINT "quote_activities_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
