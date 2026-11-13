import assert from "node:assert/strict";
import { selectQuotationPlans } from "../lib/client-quotation/holders";
import { countQuotationHolders, filterActiveQuotations, filterOutcomeQuotations, filterSentQuotations, groupQuotationsByIsapre, groupActiveQuotationsByIsapre, type SentQuotationKpiRow } from "../lib/executive/sent-quotation-kpi";

const holders = [{ holderId: "primary", name: "Titular 1" }, { holderId: "additional:2", name: "Titular 2" }];
const plans = [{ planCode: "A", isapre: "Colmena" }, { planCode: "B", isapre: "Banmédica" }];
const same = selectQuotationPlans(holders, plans, { primary: "A", "additional:2": "A" });
assert.equal(same.length, 2);
assert.deepEqual(same.map(h => h.planCode), ["A", "A"]);
const different = selectQuotationPlans(holders, plans, { primary: "A", "additional:2": "B" });
assert.deepEqual(different.map(h => h.planCode), ["A", "B"]);
assert.throws(() => selectQuotationPlans(holders, plans, { primary: "A" }));
assert.throws(() => selectQuotationPlans(holders, plans, { primary: "C", "additional:2": "B" }));

const oct = "2026-10-31T15:00:00Z";
const nov = "2026-11-01T15:00:00Z";
const quote: SentQuotationKpiRow = {
  id: "accepted", number: "QA-1", clientId: "client", clientName: "QA",
  executiveId: "executive", executiveName: "QA", status: "ACCEPTED",
  sentAt: oct, acceptedAt: oct, receivedAt: null, rejectedAt: null,
  isapres: ["Colmena", "Banmédica"],
  holderSelections: [{ ...different[0], receivedAt: oct }, different[1]],
};
const alternative: SentQuotationKpiRow = { ...quote, id: "alternative", status: "NOT_SELECTED", acceptedAt: null, holderSelections: undefined };
const scope = { quotations: [quote, alternative], selectedExecutiveIds: [], selectedIsapreIds: [], period: { kind: "month" as const, monthKey: "2026-10" } };
assert.equal(countQuotationHolders({ ...scope, event: "accepted" }), 2);
assert.equal(countQuotationHolders({ ...scope, event: "received" }), 1);
assert.equal(filterOutcomeQuotations({ ...scope, status: "RECEIVED" }).length, 0);
assert.equal(filterOutcomeQuotations({ ...scope, status: "REJECTED" }).length, 0);
assert.equal(filterActiveQuotations(scope).length, 0);
assert.equal(filterSentQuotations(scope).length, 2);
const complete: SentQuotationKpiRow = { ...quote, status: "RECEIVED", receivedAt: nov, holderSelections: [{ ...different[0], receivedAt: oct }, { ...different[1], receivedAt: nov }] };
const completed = { ...scope, quotations: [complete] };
const november = { ...completed, period: { kind: "month" as const, monthKey: "2026-11" } };
assert.equal(filterOutcomeQuotations({ ...completed, status: "ACCEPTED" }).length, 1);
assert.equal(filterOutcomeQuotations({ ...november, status: "RECEIVED" }).length, 1);
assert.equal(countQuotationHolders({ ...november, event: "received", selectedIsapreIds: ["banmedica"] }), 1);
assert.equal(countQuotationHolders({ ...november, event: "received", selectedIsapreIds: ["colmena"] }), 0);
const colmenaOnly = { ...november, selectedIsapreIds: ["colmena"] };
const documents = filterOutcomeQuotations({ ...colmenaOnly, status: "RECEIVED" });
assert.equal(documents.length, 1);
assert.deepEqual(groupQuotationsByIsapre(documents, colmenaOnly.selectedIsapreIds).map(group => group.isapreId), ["colmena"]);
assert.deepEqual(groupActiveQuotationsByIsapre([{ ...quote, status: "SENT" }], ["banmedica"]).map(group => group.isapreId), ["banmedica"]);
console.log("Selección por titular, alternativas y KPI de recepción parcial verificados.");
