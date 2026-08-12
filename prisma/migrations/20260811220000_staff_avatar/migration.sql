-- Foto de perfil del staff (ejecutivos y administradores).
ALTER TABLE "staff_accounts" ADD COLUMN IF NOT EXISTS "avatar_url" TEXT;
ALTER TABLE "staff_accounts" ADD COLUMN IF NOT EXISTS "avatar_storage_key" TEXT;
