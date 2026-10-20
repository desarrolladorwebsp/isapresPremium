DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'staff_accounts'
      AND column_name = 'auto_assignment_enabled'
  ) THEN
    ALTER TABLE "staff_accounts" ADD COLUMN "auto_assignment_enabled" BOOLEAN NOT NULL DEFAULT false;
    -- Preserve executive eligibility; administrators require explicit opt-in.
    UPDATE "staff_accounts" SET "auto_assignment_enabled" = true
      WHERE "role" = 'EXECUTIVE'
        AND "executive_kind" <> 'MEMBRESIA_ISAPRES_PREMIUM';
  END IF;
END $$;
