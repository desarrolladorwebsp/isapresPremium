import assert from "node:assert/strict";
import {
  ADMIN_EXECUTIVE_FILTER_ALL,
  ADMIN_EXECUTIVE_FILTER_UNASSIGNED,
  buildAdminExecutiveFilterOptions,
  filterAgendaItemsByExecutive,
  filterClientsByExecutive,
  filterQuotesByExecutive,
  groupAgendaItemsByExecutive,
} from "../lib/executive/dashboard-executive-filter";
import type { ExecutiveAgendaStatItem } from "../lib/client-pipeline/agenda-stats";
import type { StaffAccountRecord } from "../types/staff-account";
import type { QuoteRecord } from "../types/quote";
import type { UserRecord } from "../types/user";

function item(
  id: string,
  responsibleId: string | null,
  responsibleName: string | null,
): ExecutiveAgendaStatItem {
  return {
    id,
    clientId: id,
    clientName: `Cliente ${id}`,
    responsibleId,
    responsibleName,
    responsibleRole: responsibleId ? "Ejecutivo asignado" : null,
    kind: "meeting",
    title: "Llamado / reunión",
    action: "Realizar el llamado o contacto de hoy.",
    whenIso: null,
    whenLabel: null,
    bucket: "dueToday",
  };
}

function client(id: string, executiveId: string | null): UserRecord {
  return {
    id,
    email: `${id}@test.cl`,
    phone: null,
    fullName: `Cliente ${id}`,
    rut: null,
    role: "CLIENT",
    active: true,
    assignedExecutiveId: executiveId,
    assignedExecutiveName: executiveId ? `Nombre ${executiveId}` : null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };
}

function quote(id: string, executiveId: string | null): QuoteRecord {
  return {
    id,
    userId: null,
    fullName: `Lead ${id}`,
    email: `${id}@lead.cl`,
    phone: "+56900000000",
    status: id === "q-pending" ? "PENDING" : "CONTACTED",
    executiveAccountId: executiveId,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };
}

function account(
  id: string,
  fullName: string,
  kind: StaffAccountRecord["executiveKind"],
  email: string,
): StaffAccountRecord {
  return {
    id,
    realm: "executive",
    executiveKind: kind,
    email,
    fullName,
    active: true,
    mustChangePassword: false,
    lastLoginAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

const execA = "exec-a";
const execB = "exec-b";

const clients = [
  client("c1", execA),
  client("c2", execA),
  client("c3", execB),
  client("c4", null),
];

const quotes = [
  quote("q1", execA),
  quote("q2", execB),
  quote("q-pending", execA),
  quote("q3", null),
];

const dueToday = [
  item("g1", execA, "Ana Perez Soto"),
  item("g2", execA, "Ana Perez Soto"),
  item("g3", execB, "Bruno Diaz"),
  item("g4", null, null),
];

// Todos: no filtra.
assert.equal(filterClientsByExecutive(clients, ADMIN_EXECUTIVE_FILTER_ALL).length, 4);
assert.equal(filterQuotesByExecutive(quotes, "").length, 4);
assert.equal(filterAgendaItemsByExecutive(dueToday, "").length, 4);

// Ejecutivo A.
assert.deepEqual(
  filterClientsByExecutive(clients, execA).map((row) => row.id),
  ["c1", "c2"],
);
assert.deepEqual(
  filterQuotesByExecutive(quotes, execA).map((row) => row.id),
  ["q1", "q-pending"],
);
assert.deepEqual(
  filterAgendaItemsByExecutive(dueToday, execA).map((row) => row.id),
  ["g1", "g2"],
);
assert.equal(
  filterQuotesByExecutive(quotes, execA).filter((row) => row.status === "PENDING")
    .length,
  1,
);

// Ejecutivo B.
assert.equal(filterClientsByExecutive(clients, execB).length, 1);
assert.equal(filterAgendaItemsByExecutive(dueToday, execB).length, 1);

// Sin asignar.
assert.deepEqual(
  filterClientsByExecutive(clients, ADMIN_EXECUTIVE_FILTER_UNASSIGNED).map(
    (row) => row.id,
  ),
  ["c4"],
);
assert.deepEqual(
  filterAgendaItemsByExecutive(dueToday, ADMIN_EXECUTIVE_FILTER_UNASSIGNED).map(
    (row) => row.id,
  ),
  ["g4"],
);

// Agrupación Todos: nombre, conteo, sin duplicar ni omitir.
const groups = groupAgendaItemsByExecutive(dueToday);
assert.equal(
  groups.reduce((sum, group) => sum + group.count, 0),
  dueToday.length,
);
assert.equal(groups.length, 3);
assert.equal(groups[0]?.name, "Ana Perez Soto");
assert.equal(groups[0]?.count, 2);
assert.equal(groups[1]?.name, "Bruno Diaz");
assert.equal(groups[1]?.count, 1);
assert.equal(groups[groups.length - 1]?.name, "Sin asignar");
assert.equal(groups[groups.length - 1]?.count, 1);
assert.deepEqual(
  groups.flatMap((group) => group.items.map((row) => row.id)).sort(),
  ["g1", "g2", "g3", "g4"],
);

// Select: nombre completo + tipo, Todos / ejecutivo, reutiliza cuentas.
const options = buildAdminExecutiveFilterOptions({
  accounts: [
    account(execA, "Ana Perez Soto", "ZOOM", "ana@test.cl"),
    account(execB, "Bruno Diaz", "ISAPRES_PREMIUM", "bruno@test.cl"),
  ],
  clients,
});
assert.equal(options[0]?.value, ADMIN_EXECUTIVE_FILTER_ALL);
assert.equal(options[0]?.label, "Todos");
assert.equal(options[1]?.value, ADMIN_EXECUTIVE_FILTER_UNASSIGNED);
const ana = options.find((option) => option.value === execA);
assert.ok(ana?.label.includes("Ana Perez Soto"));
assert.ok(ana?.label.includes("Ejecutivo Zoom"));
assert.ok(!ana?.label.includes("("));

console.log("OK dashboard executive filter");
