-- CreateTable
CREATE TABLE "plan_reviews" (
    "id" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "author_avatar_url" TEXT,
    "user_id" TEXT,
    "plan_code" TEXT NOT NULL,
    "executive_rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_reviews_published_display_order_idx" ON "plan_reviews"("published", "display_order");

-- CreateIndex
CREATE INDEX "plan_reviews_plan_code_idx" ON "plan_reviews"("plan_code");

-- AddForeignKey
ALTER TABLE "plan_reviews" ADD CONSTRAINT "plan_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_reviews" ADD CONSTRAINT "plan_reviews_plan_code_fkey" FOREIGN KEY ("plan_code") REFERENCES "plans"("unique_code") ON DELETE CASCADE ON UPDATE CASCADE;
