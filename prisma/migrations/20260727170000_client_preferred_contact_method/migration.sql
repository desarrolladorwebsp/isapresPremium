-- CreateEnum
CREATE TYPE "ClientContactMethod" AS ENUM ('ZOOM', 'WHATSAPP');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "preferred_contact_method" "ClientContactMethod";
