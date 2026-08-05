-- CreateEnum
CREATE TYPE "ClientDocumentKind" AS ENUM ('RUT', 'LIQUIDACION', 'PLAN', 'OTROS');

-- CreateTable
CREATE TABLE "client_documents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" "ClientDocumentKind" NOT NULL,
    "custom_label" TEXT,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "storage_backend" TEXT NOT NULL DEFAULT 'blob',
    "uploaded_by_id" TEXT,
    "uploaded_by_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_documents_user_id_idx" ON "client_documents"("user_id");

-- CreateIndex
CREATE INDEX "client_documents_kind_idx" ON "client_documents"("kind");

-- CreateIndex
CREATE INDEX "client_documents_created_at_idx" ON "client_documents"("created_at");

-- AddForeignKey
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "staff_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
