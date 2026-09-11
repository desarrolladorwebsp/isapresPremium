import assert from "node:assert/strict";
import {
  countExecutiveAgendaStats,
  isZoomScheduledMeeting,
  resolveNewClientIntakeSource,
} from "../lib/client-pipeline/agenda-stats";
import { santiagoDateKey, santiagoMonthKey } from "../lib/client-pipeline/agenda-urgency";
import type { UserRecord } from "../types/user";

function chileNoonIso(offsetDays: number): string {
  const today = santiagoDateKey(new Date());
  assert.ok(today);
  const [year, month, day] = today.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + offsetDays, 15, 0, 0)).toISOString();
}

function client(partial: Partial<UserRecord> & Pick<UserRecord, "id">): UserRecord {
  return {
    email: `${partial.id}@test.cl`,
    phone: null,
    fullName: `Cliente ${partial.id}`,
    rut: null,
    role: "CLIENT",
    active: true,
    assignedExecutiveId: "exec-a",
    assignedExecutiveName: "Ana",
    pipelineStatus: "NUEVO",
    createdAt: chileNoonIso(0),
    updatedAt: chileNoonIso(0),
    ...partial,
  };
}

const execA = "exec-a";
const monthKey = santiagoMonthKey(new Date());
assert.ok(monthKey);

const zoomYesterday = client({
  id: "zoom-overdue",
  preferredContactMethod: "ZOOM",
  nextCallAt: chileNoonIso(-1),
  pipelineStatus: "EN_SEGUIMIENTO",
});
const whatsappYesterday = client({
  id: "wa-overdue",
  preferredContactMethod: "WHATSAPP",
  nextCallAt: chileNoonIso(-1),
  pipelineStatus: "EN_SEGUIMIENTO",
});
const zoomToday = client({
  id: "zoom-today",
  preferredContactMethod: "ZOOM",
  nextCallAt: chileNoonIso(0),
  pipelineStatus: "EN_SEGUIMIENTO",
});
const confirmationYesterday = client({
  id: "conf-overdue",
  confirmationCallAt: chileNoonIso(-1),
  pipelineStatus: "EN_SEGUIMIENTO",
});
const newToday = client({
  id: "new-today",
  clientOrigin: "FORMULARIO_WEB",
  createdAt: chileNoonIso(0),
});
const newYesterdayWeb = client({
  id: "new-yesterday",
  clientOrigin: "COTIZADOR",
  createdAt: chileNoonIso(-1),
});
const newSelf = client({
  id: "new-self",
  clientOrigin: "MANUAL",
  registeredById: execA,
  assignedExecutiveId: execA,
  createdAt: chileNoonIso(0),
});
const newAssigned = client({
  id: "new-assigned",
  clientOrigin: "MANUAL",
  registeredById: "admin-1",
  assignedExecutiveId: execA,
  createdAt: chileNoonIso(0),
});
const noContesta = client({
  id: "no-contesta",
  pipelineStatus: "NO_CONTESTA",
  createdAt: chileNoonIso(-2),
});
const closedZoom = client({
  id: "closed",
  pipelineStatus: "RECEPCIONADO",
  preferredContactMethod: "ZOOM",
  nextCallAt: chileNoonIso(-1),
});
const reassigned = client({
  id: "reassigned",
  assignedExecutiveId: "exec-b",
  assignedExecutiveName: "Bruno",
  clientOrigin: "FORMULARIO_WEB",
  createdAt: chileNoonIso(-1),
});

assert.equal(isZoomScheduledMeeting(zoomYesterday), true);
assert.equal(isZoomScheduledMeeting(whatsappYesterday), false);
assert.equal(resolveNewClientIntakeSource(newYesterdayWeb), "web");
assert.equal(resolveNewClientIntakeSource(newSelf), "self_registered");
assert.equal(resolveNewClientIntakeSource(newAssigned), "assigned");

const stats = countExecutiveAgendaStats({
  clients: [
    zoomYesterday,
    whatsappYesterday,
    zoomToday,
    confirmationYesterday,
    newToday,
    newYesterdayWeb,
    newSelf,
    newAssigned,
    noContesta,
    closedZoom,
    reassigned,
  ],
  executiveId: execA,
  isAdmin: false,
  monthKey,
});

assert.equal(
  stats.items.overdue.some((row) => row.clientId === "zoom-overdue"),
  true,
  "Zoom atrasado debe entrar",
);
assert.equal(
  stats.items.overdue.some((row) => row.clientId === "wa-overdue"),
  false,
  "WhatsApp atrasado no entra en Atrasadas",
);
assert.equal(
  stats.items.dueToday.some((row) => row.clientId === "zoom-today"),
  true,
);
assert.equal(
  stats.items.overdue.some((row) => row.clientId === "conf-overdue"),
  true,
);
assert.equal(
  stats.items.newClients.some((row) => row.clientId === "new-today"),
  true,
);
assert.equal(
  stats.items.overdue.some((row) => row.clientId === "new-today"),
  false,
  "Nuevo de hoy no es atrasado",
);
assert.equal(
  stats.items.newClients.some((row) => row.clientId === "new-yesterday"),
  true,
);
assert.equal(
  stats.items.overdue.some((row) => row.clientId === "new-yesterday"),
  true,
  "Nuevo de un día anterior sin gestión es atrasado",
);
assert.equal(
  stats.items.overdue.some((row) => row.clientId === "no-contesta"),
  false,
  "No contesta sin Zoom no entra en Atrasadas",
);
assert.equal(
  stats.items.overdue.some((row) => row.clientId === "closed"),
  false,
);
assert.equal(
  stats.items.newClients.some((row) => row.clientId === "reassigned"),
  false,
  "Cuenta quien tiene el cliente asignado ahora",
);

const statsB = countExecutiveAgendaStats({
  clients: [reassigned],
  executiveId: "exec-b",
  isAdmin: false,
  monthKey,
});
assert.equal(statsB.items.newClients.some((row) => row.clientId === "reassigned"), true);
assert.equal(statsB.items.overdue.some((row) => row.clientId === "reassigned"), true);

const zoomOverdue = stats.items.overdue.find((row) => row.clientId === "zoom-overdue");
assert.ok(zoomOverdue?.action.includes("reunión Zoom"));

console.log("OK agenda stats KPIs");
