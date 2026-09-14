import assert from "node:assert/strict";
import {
  buildAdminReports,
  clientMatchesReportExecutives,
  isValidReportPeriod,
} from "../lib/executive/admin-reports";
import { ADMIN_EXECUTIVE_FILTER_UNASSIGNED } from "../lib/executive/dashboard-executive-filter";
import { santiagoDateKey } from "../lib/client-pipeline/agenda-urgency";
import type { UserRecord } from "../types/user";

function chileNoonIso(offsetDays: number): string {
  const today = santiagoDateKey(new Date());
  assert.ok(today);
  const [year, month, day] = today.split("-").map(Number);
  return new Date(
    Date.UTC(year, month - 1, day + offsetDays, 15, 0, 0),
  ).toISOString();
}

function client(
  partial: Partial<UserRecord> & Pick<UserRecord, "id">,
): UserRecord {
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

const today = santiagoDateKey(new Date());
assert.ok(today);
const monthKey = today.slice(0, 7);

assert.equal(isValidReportPeriod({ kind: "month", monthKey }), true);
assert.equal(
  isValidReportPeriod({ kind: "range", fromDay: "2026-10-01", toDay: "2026-10-02" }),
  true,
);
assert.equal(
  isValidReportPeriod({ kind: "range", fromDay: "2026-10-02", toDay: "2026-10-01" }),
  false,
);

const nuevoToday = client({ id: "nuevo", createdAt: chileNoonIso(0) });
const contactado = client({
  id: "cont",
  pipelineStatus: "CONTACTADO",
  createdAt: chileNoonIso(0),
});
const zoomOverdue = client({
  id: "zoom",
  assignedExecutiveId: "exec-b",
  assignedExecutiveName: "Bruno",
  pipelineStatus: "EN_SEGUIMIENTO",
  preferredContactMethod: "ZOOM",
  nextCallAt: chileNoonIso(-1),
  createdAt: chileNoonIso(-20),
});
const otherExec = client({
  id: "other",
  assignedExecutiveId: "exec-b",
  assignedExecutiveName: "Bruno",
  pipelineStatus: "RECEPCIONADO",
  createdAt: chileNoonIso(0),
});

assert.equal(
  clientMatchesReportExecutives(nuevoToday, []),
  true,
);
assert.equal(
  clientMatchesReportExecutives(nuevoToday, ["exec-b"]),
  false,
);
assert.equal(
  clientMatchesReportExecutives(
    { ...nuevoToday, assignedExecutiveId: null },
    [ADMIN_EXECUTIVE_FILTER_UNASSIGNED],
  ),
  true,
);

const all = buildAdminReports({
  clients: [nuevoToday, contactado, zoomOverdue, otherExec],
  period: { kind: "month", monthKey },
  selectedExecutiveIds: [],
});

const ana = all.rows.find((row) => row.executiveId === "exec-a");
const bruno = all.rows.find((row) => row.executiveId === "exec-b");
assert.ok(ana);
assert.ok(bruno);
assert.equal(ana.pipeline.NUEVO, 1);
assert.equal(ana.firstContactPending, 1);
assert.equal(ana.firstContactDone, 1);
assert.equal(ana.firstContactRate, 50);
assert.equal(bruno.pipeline.RECEPCIONADO, 1);

const yesterday = santiagoDateKey(chileNoonIso(-1));
assert.ok(yesterday);
const zoomRange = buildAdminReports({
  clients: [zoomOverdue],
  period: { kind: "range", fromDay: yesterday, toDay: today },
  selectedExecutiveIds: [],
});
assert.equal(zoomRange.totals.zoomOverdue, 1);

const onlyAna = buildAdminReports({
  clients: [nuevoToday, contactado, zoomOverdue, otherExec],
  period: { kind: "month", monthKey },
  selectedExecutiveIds: ["exec-a"],
});
assert.equal(onlyAna.rows.length, 1);
assert.equal(onlyAna.rows[0]?.executiveId, "exec-a");
assert.equal(onlyAna.totals.zoomOverdue, 0);

const range = buildAdminReports({
  clients: [nuevoToday, zoomOverdue],
  period: { kind: "range", fromDay: today, toDay: today },
  selectedExecutiveIds: [],
});
assert.equal(range.totals.pipelineTotal, 1);
assert.equal(range.totals.zoomOverdue, 0);

console.log("OK admin reports");
