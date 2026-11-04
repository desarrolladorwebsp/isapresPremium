import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { santiagoMonthKey } from "@/lib/client-pipeline/agenda-urgency";
import { appendPipelineNoteLine } from "@/lib/client-pipeline/note-stamp";

/** Atomic status change + history append. Concurrent jobs cannot resume the same pause twice. */
export async function resumeDuePausedClients(now = new Date(), limit = 1000): Promise<number> {
  const month = santiagoMonthKey(now);
  if (!month) throw new Error("Fecha de reactivación inválida.");
  const batch = Math.max(1, Math.min(1000, Math.floor(limit)));
  const note = appendPipelineNoteLine(null, `Pausa finalizada. Cliente pasa a Pendiente para revisión del ejecutivo. Mes de retorno: ${month}.`, "Sistema");
  return prisma.$executeRaw(Prisma.sql`
    WITH due AS (
      SELECT id FROM "users"
      WHERE "role" = 'CLIENT' AND "pipeline_status" = 'PAUSADO'
        AND "pause_until_month" ~ '^[1-9][0-9]{3}-(0[1-9]|1[0-2])$'
        AND "pause_until_month" <= ${month}
      ORDER BY "pause_until_month", id LIMIT ${batch} FOR UPDATE SKIP LOCKED
    )
    UPDATE "users" AS u
    SET "pipeline_status" = 'PENDIENTE'::"ClientPipelineStatus", "pending_since" = ${now}, "updated_at" = ${now},
      "pipeline_notes" = COALESCE(u."pipeline_notes", '') || E'\n' || ${note},
      "last_call_outcome" = 'Pausa finalizada: pendiente de revisión'
    FROM due WHERE u.id = due.id
  `);
}
