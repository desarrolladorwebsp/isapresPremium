-- Perfil obligatorio y suspensión de asignaciones para ejecutivos
ALTER TABLE "executive_accounts"
ADD COLUMN "assignments_suspended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "onboarding_completed" BOOLEAN NOT NULL DEFAULT false;

-- Cuentas existentes se consideran con onboarding completo
UPDATE "executive_accounts"
SET "onboarding_completed" = true
WHERE "onboarding_completed" = false;
