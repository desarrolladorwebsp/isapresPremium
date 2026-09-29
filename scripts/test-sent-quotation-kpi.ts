import assert from "node:assert/strict";
import {
  buildSentQuotationReport,
  filterOutcomeQuotations,
  filterSentQuotations,
  type SentQuotationKpiRow,
} from "../lib/executive/sent-quotation-kpi";

function row(
  partial: Partial<SentQuotationKpiRow> & Pick<SentQuotationKpiRow, "id">,
): SentQuotationKpiRow {
  return {
    number: `COT-${partial.id}`,
    clientId: `client-${partial.id}`,
    clientName: `Cliente ${partial.id}`,
    executiveId: "exec-a",
    executiveName: "Ana",
    status: "SENT",
    sentAt: "2026-09-15T15:00:00.000Z",
    receivedAt: null,
    acceptedAt: null,
    rejectedAt: null,
    isapres: ["Banmédica"],
    ...partial,
  };
}

const quotations = [
  row({ id: "both", isapres: ["Banmédica", "Colmena"] }),
  row({ id: "colmena", isapres: ["Colmena"], executiveId: "exec-b", executiveName: "Bruno" }),
  row({ id: "august", sentAt: "2026-08-15T15:00:00.000Z", isapres: ["Esencial"] }),
  row({
    id: "accepted",
    status: "ACCEPTED",
    isapres: ["Cruz Blanca"],
    acceptedAt: "2026-09-20T15:00:00.000Z",
  }),
  row({
    id: "received",
    status: "RECEIVED",
    isapres: ["Banmédica"],
    receivedAt: "2026-09-18T15:00:00.000Z",
  }),
  row({
    id: "rejected-later",
    status: "REJECTED",
    isapres: ["Colmena"],
    sentAt: "2026-08-10T15:00:00.000Z",
    rejectedAt: "2026-09-22T15:00:00.000Z",
    executiveId: "exec-b",
    executiveName: "Bruno",
  }),
];

const september = { kind: "month" as const, monthKey: "2026-09" };

const allSeptember = filterSentQuotations({
  quotations,
  period: september,
  selectedExecutiveIds: [],
  selectedIsapreIds: [],
});
assert.deepEqual(
  allSeptember.map((item) => item.id),
  ["both", "colmena", "accepted", "received"],
);

const oneIsapre = filterSentQuotations({
  quotations,
  period: september,
  selectedExecutiveIds: [],
  selectedIsapreIds: ["banmedica"],
});
assert.deepEqual(oneIsapre.map((item) => item.id), ["both", "received"]);

const twoIsapres = filterSentQuotations({
  quotations,
  period: september,
  selectedExecutiveIds: [],
  selectedIsapreIds: ["banmedica", "colmena"],
});
assert.deepEqual(
  twoIsapres.map((item) => item.id),
  ["both", "colmena", "received"],
);

const ana = filterSentQuotations({
  quotations,
  period: september,
  selectedExecutiveIds: ["exec-a"],
  selectedIsapreIds: [],
});
assert.deepEqual(ana.map((item) => item.id), ["both", "accepted", "received"]);

const range = filterSentQuotations({
  quotations,
  period: { kind: "range", fromDay: "2026-08-01", toDay: "2026-08-31" },
  selectedExecutiveIds: [],
  selectedIsapreIds: [],
});
assert.deepEqual(range.map((item) => item.id), ["august", "rejected-later"]);

assert.deepEqual(
  filterSentQuotations({
    quotations,
    period: { kind: "range", fromDay: "2026-09-20", toDay: "2026-09-01" },
    selectedExecutiveIds: [],
    selectedIsapreIds: [],
  }),
  [],
);

const report = buildSentQuotationReport({
  quotations,
  period: september,
  selectedExecutiveIds: ["exec-a", "exec-c"],
  selectedIsapreIds: ["banmedica", "colmena"],
  executiveNames: new Map([
    ["exec-a", "Ana"],
    ["exec-c", "Carla"],
  ]),
});
assert.equal(report.total, 2);
assert.equal(report.receivedTotal, 1);
assert.equal(report.acceptedTotal, 0);
assert.equal(report.rejectedTotal, 0);
assert.deepEqual(
  report.rows.map((item) => [
    item.executiveName,
    item.sentCount,
    item.receivedCount,
    item.acceptedCount,
    item.rejectedCount,
  ]),
  [
    ["Ana", 2, 1, 0, 0],
    ["Carla", 0, 0, 0, 0],
  ],
);

const acceptedInSeptember = filterOutcomeQuotations({
  quotations,
  period: september,
  selectedExecutiveIds: [],
  selectedIsapreIds: [],
  status: "ACCEPTED",
});
assert.deepEqual(acceptedInSeptember.map((item) => item.id), ["accepted"]);

const rejectedInSeptember = filterOutcomeQuotations({
  quotations,
  period: september,
  selectedExecutiveIds: [],
  selectedIsapreIds: ["colmena"],
  status: "REJECTED",
});
assert.deepEqual(rejectedInSeptember.map((item) => item.id), ["rejected-later"]);

console.log("sent quotation kpi ok");
