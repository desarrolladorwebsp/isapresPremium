-- Invitaciones staff (activación por enlace exclusivo)
CREATE TABLE "staff_invites" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "rut" TEXT,
    "realm" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "invited_by_admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "staff_invites_token_hash_key" ON "staff_invites"("token_hash");
CREATE INDEX "staff_invites_email_idx" ON "staff_invites"("email");

-- RUT en cuentas admin
ALTER TABLE "admin_accounts" ADD COLUMN "rut" TEXT;

-- Asignación de clientes a ejecutivos
ALTER TABLE "users" ADD COLUMN "assigned_executive_id" TEXT;
CREATE INDEX "users_assigned_executive_id_idx" ON "users"("assigned_executive_id");
ALTER TABLE "users" ADD CONSTRAINT "users_assigned_executive_id_fkey" FOREIGN KEY ("assigned_executive_id") REFERENCES "executive_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Asignación de cotizaciones a ejecutivos
ALTER TABLE "quotes" ADD COLUMN "executive_account_id" TEXT;
CREATE INDEX "quotes_executive_account_id_idx" ON "quotes"("executive_account_id");
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_executive_account_id_fkey" FOREIGN KEY ("executive_account_id") REFERENCES "executive_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
