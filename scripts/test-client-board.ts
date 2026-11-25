import assert from "node:assert/strict";
import { CLIENT_PIPELINE_STATUS_OPTIONS } from "@/lib/client-pipeline/constants";
import {
  clientBoardCardNote,
  clientBoardColumn,
  isClientBoardWorkStatus,
  summarizeClientBoardQuotations,
  type ClientBoardQuotationEvidence,
} from "@/lib/executive/client-board";

const now = new Date("2026-11-25T15:00:00Z");
const evidence = (clientId: string, extra: Partial<ClientBoardQuotationEvidence> = {}): ClientBoardQuotationEvidence => ({
  clientId,
  status: "SENT",
  sentAt: new Date("2026-11-24T15:00:00Z"),
  validUntil: new Date("2026-12-01T15:00:00Z"),
  sentConfirmed: true,
  holderSelections: null,
  ...extra,
});

const rows = [
  evidence("waiting"),
  evidence("whatsapp-only", { sentConfirmed: false }),
  evidence("no-sent-date", { sentAt: null }),
  evidence("expired", { validUntil: new Date("2026-11-23T15:00:00Z") }),
  evidence("legacy-no-expiry", { validUntil: null }),
  evidence("other-status", { status: "NOT_SELECTED" }),
  evidence("accepted", { status: "ACCEPTED", sentConfirmed: false, validUntil: now }),
  evidence("accepted"),
  evidence("partial", { status: "ACCEPTED", holderSelections: [{ receivedAt: now.toISOString() }, { receivedAt: null }] }),
  evidence("partial", { status: "RECEIVED", holderSelections: [{ receivedAt: now.toISOString() }] }),
  evidence("received", { status: "RECEIVED" }),
];
const original = JSON.stringify(rows);
const reports = new Map(summarizeClientBoardQuotations(rows, now).map((quote) => [quote.clientId, quote]));

assert.equal(reports.get("waiting")?.awaitingResponse, true);
assert.equal(reports.get("legacy-no-expiry")?.awaitingResponse, true);
for (const id of ["whatsapp-only", "expired", "no-sent-date", "other-status"]) assert.equal(reports.has(id), false);
assert.equal(reports.get("accepted")?.accepted, true);
assert.deepEqual(reports.get("partial")?.receipt, { received: 1, total: 2 });
assert.equal(reports.get("received")?.accepted, false);
assert.equal(JSON.stringify(rows), original);

assert.deepEqual(CLIENT_PIPELINE_STATUS_OPTIONS.filter(isClientBoardWorkStatus), [
  "NUEVO", "PENDIENTE", "CONTACTADO", "NO_CONTESTA", "EN_SEGUIMIENTO", "ENVIADO_ISAPRE",
]);
for (const state of ["PAUSADO", "RECEPCIONADO", "PERDIDO", "ENVIADO_ISAPRE"] as const) {
  assert.equal(clientBoardColumn(state, reports.get("accepted")), state);
}
assert.equal(clientBoardColumn(null), "POR_CONTACTAR");
assert.equal(clientBoardColumn("PENDIENTE", reports.get("accepted")), "POR_CONTACTAR");
assert.equal(clientBoardColumn("NO_CONTESTA"), "POR_CONTACTAR");
assert.equal(clientBoardColumn("CONTACTADO"), "EN_GESTION");
assert.equal(clientBoardColumn("EN_SEGUIMIENTO", reports.get("received")), "EN_GESTION");
assert.equal(clientBoardColumn("NO_CONTESTA", reports.get("waiting")), "COTIZACION_ENVIADA");
assert.equal(clientBoardCardNote("NO_CONTESTA", "COTIZACION_ENVIADA", reports.get("waiting")), "Esperando respuesta · No contesta");
assert.equal(clientBoardCardNote("CONTACTADO", "COTIZACION_ENVIADA", reports.get("accepted")), "Aceptada · falta enviar a Isapre");
assert.equal(clientBoardCardNote("ENVIADO_ISAPRE", "ENVIADO_ISAPRE", reports.get("partial")), "1 de 2 titulares recepcionados");
console.log("OK tablero: nueve estados, cotizaciones vigentes, confirmación de envío, reactivación y recepción parcial; datos fuente intactos.");
