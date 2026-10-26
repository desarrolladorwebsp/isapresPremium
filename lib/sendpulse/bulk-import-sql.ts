/** Parámetros por $1: nunca interpolar contenido de las fuentes en el SQL. */
export const SENDPULSE_IMPORT_EXISTING_SQL = `
  UPDATE users AS u
  SET assigned_executive_id = CASE
        WHEN incoming."preserveOwner" THEN u.assigned_executive_id
        WHEN u.assigned_executive_id IS NULL OR EXISTS (
          SELECT 1 FROM staff_accounts owner
          WHERE owner.id = u.assigned_executive_id AND owner.role::text = 'BOT'
        ) THEN incoming."botId"
        ELSE u.assigned_executive_id
      END,
      sendpulse_bot_phone = incoming."botPhone",
      sendpulse_contact_id = COALESCE(NULLIF(u.sendpulse_contact_id, ''), incoming."contactId"),
      updated_at = CURRENT_TIMESTAMP
  FROM jsonb_to_recordset($1::jsonb) AS incoming(
    id text, "expectedUpdatedAt" text, "expectedOwnerId" text,
    "preserveOwner" boolean, "botId" text, "botPhone" text, "contactId" text
  )
  WHERE u.id = incoming.id AND u.role = 'CLIENT'
    AND u.updated_at = incoming."expectedUpdatedAt"::timestamp
    AND u.assigned_executive_id IS NOT DISTINCT FROM incoming."expectedOwnerId"
`;
