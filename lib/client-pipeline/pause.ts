import { isAnnualityMonth, resolveAnnualityExpiry } from "@/lib/client-profile/annuality";
import { santiagoMonthKey } from "@/lib/client-pipeline/agenda-urgency";
import type { UpdateClientPipelineInput } from "@/types/client-pipeline";
import type { UserRecord } from "@/types/user";

export function validatePause(month: unknown, reason: unknown, now = new Date()): { month: string; reason: string } {
  if (!isAnnualityMonth(month) || month <= (santiagoMonthKey(now) ?? "")) {
    throw new Error("Elige un mes y año posteriores al mes actual para retomar el contacto.");
  }
  if (typeof reason !== "string" || !reason.trim() || reason.trim().length > 1000) {
    throw new Error("Indica un motivo de pausa de hasta 1.000 caracteres.");
  }
  return { month, reason: reason.trim() };
}

/** A viewer can only pause, edit a pause or resume to Pendiente. No other data permissions change. */
export function isPauseOnlyChange(input: UpdateClientPipelineInput, currentStatus: string): boolean {
  const allowed = new Set(["pipelineStatus", "manualStatusChange", "statusChangeNote", "pauseUntilMonth", "pauseReason"]);
  return input.manualStatusChange === true && Object.keys(input).every(key => allowed.has(key)) &&
    (input.pipelineStatus === "PAUSADO" || (currentStatus === "PAUSADO" && input.pipelineStatus === "PENDIENTE"));
}

export function defaultPauseMonth(client: UserRecord, now = new Date()): string {
  if (client.pipelineStatus === "PAUSADO" && client.pauseUntilMonth) return client.pauseUntilMonth;
  const annuality = resolveAnnualityExpiry(client.clientProfile, client.createdAt);
  const current = santiagoMonthKey(now) ?? "";
  if (annuality > current) return annuality;
  const [year, month] = current.split("-").map(Number);
  return `${year + (month === 12 ? 1 : 0)}-${String(month === 12 ? 1 : month + 1).padStart(2,"0")}`;
}
