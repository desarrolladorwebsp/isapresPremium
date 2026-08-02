-- CreateTable
CREATE TABLE "partner_entities" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo_url" TEXT NOT NULL,
    "website_url" TEXT NOT NULL,
    "whatsapp_number" TEXT NOT NULL,
    "whatsapp_message" TEXT,
    "exit_label" TEXT NOT NULL DEFAULT 'Volver al sitio',
    "brand_key" TEXT NOT NULL,
    "theme" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_entities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "partner_entities_slug_key" ON "partner_entities"("slug");
