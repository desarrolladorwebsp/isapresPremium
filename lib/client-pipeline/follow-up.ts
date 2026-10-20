import { santiagoDateKey } from "@/lib/client-pipeline/agenda-urgency";
import { clientNoteDisplayText, isPipelineClientNoteLine, stripPipelineNotePrefix } from "@/lib/client-pipeline/note-stamp";
import type { ClientActivityRecord, ClientActivityType } from "@/types/client-activity";
import type { UserRecord } from "@/types/user";

export interface FollowUpEvent {
  id: string;
  kind: "gestion" | "note" | "commercial" | "registration";
  title: string;
  body: string;
  actor: string | null;
  at: string | null;
}

const ACTIVITY_LABELS: Record<ClientActivityType, string> = {
  PLAN_CHANGED: "Plan elegido", ADVISED_PLAN_CLEARED: "Plan elegido removido",
  PLAN_ASSIGNED: "Plan agregado", PLAN_UNASSIGNED: "Plan eliminado",
  QUOTATION_CREATED: "Cotización creada", QUOTATION_SENT: "Cotización compartida",
  QUOTATION_STATUS_CHANGED: "Estado de cotización actualizado",
};

const chileDateTime = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});
const chileParts = (date: Date) => Object.fromEntries(chileDateTime.formatToParts(date).map(({ type, value }) => [type, value]));

/** Legacy stamps are Chilean wall-clock dates, never the browser's timezone. */
export function parseFollowUpStamp(stamp: string): string | null {
  const normalized = stamp.replace(/[.\s\u202f\u00a0]/g, "").toLowerCase();
  const m = normalized.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4}|\d{2}),?(\d{1,2}):(\d{2})(am|pm)?$/);
  if (!m) return null;
  const day = +m[1], month = +m[2], year = +m[3] + (m[3].length === 2 ? 2000 : 0);
  let hour = +m[4]; const minute = +m[5];
  if (minute > 59 || hour > (m[6] ? 12 : 23) || (m[6] && hour < 1)) return null;
  if (m[6]) hour = hour % 12 + (m[6] === "pm" ? 12 : 0);
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  let utc = wall;
  for (let i = 0; i < 3; i++) {
    const p = chileParts(new Date(utc));
    utc += wall - Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  }
  const p = chileParts(new Date(utc));
  if (+p.year !== year || +p.month !== month || +p.day !== day || +p.hour !== hour || +p.minute !== minute) return null;
  return new Date(utc).toISOString();
}

function validIso(value: string | null | undefined): string | null {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

/** Groups multiline notes without modifying the legacy storage or other consumers. */
export function pipelineFollowUpEvents(notes: string): FollowUpEvent[] {
  const groups: string[] = [];
  for (const raw of notes.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (/^\[[^\]]+\]/.test(line) || !groups.length || isPipelineClientNoteLine(line)) groups.push(line);
    else groups[groups.length - 1] += `\n${line}`;
  }
  return groups.map<FollowUpEvent>((line, index) => {
    const stamp = line.match(/^\[([^\]]+)\]/)?.[1];
    const divider = stamp?.lastIndexOf(" · ") ?? -1;
    const dateText = stamp ? (divider < 0 ? stamp : stamp.slice(0, divider)) : "";
    const isNote = isPipelineClientNoteLine(line);
    return {
      id: `pipeline:${index}`, kind: isNote ? "note" : "gestion",
      title: isNote ? "Anotación del equipo" : "Gestión registrada",
      body: isNote ? clientNoteDisplayText(line) : stripPipelineNotePrefix(line),
      actor: divider < 0 ? null : stamp!.slice(divider + 3).trim() || null,
      at: parseFollowUpStamp(dateText),
    };
  }).reverse();
}

export function buildFollowUpHistory(client: UserRecord, notes: string, activities: ClientActivityRecord[], canView: boolean): FollowUpEvent[] {
  // Apply the same gate to all sources, including when a query still has cached data.
  if (!canView) return [];
  const events: FollowUpEvent[] = pipelineFollowUpEvents(notes);
  const seen = new Set<string>();
  for (const a of activities) {
    if (a.userId !== client.id || seen.has(a.id)) continue;
    seen.add(a.id);
    events.push({ id: `activity:${a.id}`, kind: "commercial", title: ACTIVITY_LABELS[a.activityType] ?? "Actividad comercial",
      body: a.description?.trim() || [a.previousValue, a.newValue].filter(Boolean).join(" → ") || "Actividad registrada.",
      actor: a.actorName?.trim() || null, at: validIso(a.createdAt) });
  }
  events.push({ id: `registration:${client.id}`, kind: "registration", title: "Cliente registrado",
    body: "Ingreso de la ficha al CRM.", actor: client.registeredByName?.trim() || null, at: validIso(client.createdAt) });
  return events.sort((a, b) => {
    if (!a.at && !b.at) return 0;
    if (!a.at) return 1;
    if (!b.at) return -1;
    return Date.parse(b.at) - Date.parse(a.at);
  });
}

export function lastFollowUpEvent(events: FollowUpEvent[]): FollowUpEvent | null {
  return events.find(e => e.kind !== "registration" && e.at !== null) ?? null;
}

export interface FollowUpAction {
  kind: "meeting" | "confirmation" | "reminder" | "unscheduled" | "finished";
  title: string;
  detail: string;
  at: string | null;
  responsible: string;
  urgency: "overdue" | "today" | "upcoming" | "unscheduled" | "finished";
}

export function nextFollowUpActions(client: UserRecord, now = new Date()): FollowUpAction[] {
  const responsible = client.assignedExecutiveName?.trim() || "Sin responsable asignado";
  if (["RECEPCIONADO", "PERDIDO", "CERRADO"].includes(client.pipelineStatus ?? "")) {
    return [{ kind: "finished", title: "Seguimiento finalizado", detail: "Sin próxima gestión pendiente para esta etapa.", at: null, responsible, urgency: "finished" }];
  }
  const today = santiagoDateKey(now)!;
  const dated: FollowUpAction[] = [];
  function add(kind: FollowUpAction["kind"], date: string | null | undefined, title: string, detail: string, owner = responsible) {
    const at = validIso(date); if (!at) return;
    const day = santiagoDateKey(at)!;
    dated.push({ kind, at, title, detail, responsible: owner,
      urgency: day < today ? "overdue" : day === today ? "today" : "upcoming" });
  }
  add("confirmation", client.confirmationCallAt, "Confirmar asistencia a Zoom", "Contactar al cliente y registrar el resultado de la confirmación.", client.trackingExecutiveName?.trim() || responsible);
  add("meeting", client.nextCallAt,
    client.preferredContactMethod === "WHATSAPP" ? "Contacto por WhatsApp" : client.preferredContactMethod === "ZOOM" ? "Reunión Zoom" : "Llamado / reunión",
    "Realizar la gestión o confirmar su resultado; si no se realizó, reagendarla.");
  add("reminder", client.reminderAt, "Atender recordatorio", client.reminderNote?.trim() || "Revisar el pendiente y registrar su resolución.");
  dated.sort((a, b) => Date.parse(a.at!) - Date.parse(b.at!));
  if (dated.length) return dated;
  return [{ kind: "unscheduled", title: client.pipelineStatus === "NUEVO" || !client.pipelineStatus ? "Registrar primer contacto" : "Definir próxima gestión",
    detail: "No hay una próxima gestión programada. Coordinar con el responsable desde la ficha de gestión.", at: null, responsible, urgency: "unscheduled" }];
}
