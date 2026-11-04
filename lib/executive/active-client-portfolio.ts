import type { UserRecord } from "@/types/user";
import { santiagoMonthKey } from "@/lib/client-pipeline/agenda-urgency";
import { filterClientsByExecutive } from "@/lib/executive/dashboard-executive-filter";

/** Current portfolio is not a historical snapshot. Empty month means all months. */
export function showActiveClientPortfolio(month: string | null | undefined, now = new Date()): boolean {
  return !month || month === santiagoMonthKey(now);
}

/** Current ownership only; registration dates and quotation insurer filters do not apply. */
export function activeClientPortfolio(input: {
  clients: readonly UserRecord[];
  isAdmin: boolean;
  executiveId: string | null;
  adminExecutiveFilter?: string;
}): UserRecord[] {
  const scoped = input.isAdmin
    ? filterClientsByExecutive([...input.clients], input.adminExecutiveFilter)
    : input.executiveId
      ? input.clients.filter(client => client.assignedExecutiveId === input.executiveId)
      : [];
  const unique = new Map<string, UserRecord>();
  for (const client of scoped) {
    if (!client.id || client.pipelineStatus === "PERDIDO" || client.pipelineStatus === "PAUSADO") continue;
    if (!unique.has(client.id)) unique.set(client.id, client);
  }
  return [...unique.values()].sort((a, b) =>
    a.fullName.localeCompare(b.fullName, "es", { sensitivity: "base", numeric: true }) || a.id.localeCompare(b.id),
  );
}
