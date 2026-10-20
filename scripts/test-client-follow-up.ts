/** Regression coverage without database connections or writes. */
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { buildFollowUpHistory, lastFollowUpEvent, nextFollowUpActions, parseFollowUpStamp, pipelineFollowUpEvents } from "../lib/client-pipeline/follow-up";
import { ApiError } from "../lib/api/api-error";
import { assertSessionStaffSection } from "../lib/auth/require-auth";
import type { UserRecord } from "../types/user";
import type { ClientActivityRecord } from "../types/client-activity";
import type * as View from "../components/executive/client-seguimiento-flow-view";
import type * as Route from "../app/api/executive/clients/[id]/activities/route";

const client: UserRecord = { id: "client-a", email: "qa@example.invalid", fullName: "Cliente de prueba", phone: null, rut: null, role: "CLIENT", active: true,
  pipelineStatus: "NUEVO", assignedExecutiveId: "assigned", assignedExecutiveName: "Ejecutiva asignada", trackingExecutiveId: "tracking", trackingExecutiveName: "Ejecutivo de seguimiento",
  createdAt: "2026-10-19T12:00:00Z", updatedAt: "2026-10-25T12:00:00Z" };
const now = new Date("2026-10-20T15:00:00Z");
const notes = "[20-10-26, 10:33 a. m. · Isabel] Contacto realizado.\n[20-10-26, 11:00 a. m. · Ana] Nota: Cliente pide dos opciones.\nPrefiere llamada por la tarde.";
const activity: ClientActivityRecord = { id: "activity-1", userId: client.id, activityType: "QUOTATION_SENT", previousValue: null, newValue: "WHATSAPP", actorRealm: "executive", actorId: "assigned", actorName: "Ejecutiva asignada", description: "Se abrió WhatsApp para compartir la cotización.", createdAt: "2026-10-20T15:30:00Z" };
let count = 0;
async function test(title: string, fn: () => void | Promise<void>) { await fn(); count++; console.log(`✓ ${title}`); }

function load<T>(file: string, mocks: Record<string, unknown>): T {
  const filename = path.resolve(file); const req = createRequire(filename); const loaded = { exports: {} };
  const code = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { module: loaded, exports: loaded.exports, require: (id: string) => id in mocks ? mocks[id] : req(id),
    console: { ...console, error: () => {} }, process, URL, Request, Response });
  return loaded.exports as T;
}
async function main() {
  await test("Legacy Chile dates: summer/winter offsets, AM/PM and midnight", () => {
    assert.equal(parseFollowUpStamp("20-10-26, 10:33 a. m."), "2026-10-20T13:33:00.000Z");
    assert.equal(parseFollowUpStamp("20-07-26, 10:33 a. m."), "2026-07-20T14:33:00.000Z");
    assert.equal(parseFollowUpStamp("20/10/2026, 12:05 p. m."), "2026-10-20T15:05:00.000Z");
    assert.equal(parseFollowUpStamp("20-10-26, 12:05 a. m."), "2026-10-20T03:05:00.000Z");
  });
  await test("Invalid dates and nonexistent DST time never invent a timestamp", () => {
    for (const value of ["31-02-26, 10:00", "20-10-26, 25:00", "20-10-26, 10:70", "unknown", "06-09-26, 00:30"]) assert.equal(parseFollowUpStamp(value), null, value);
  });
  await test("Multiline annotations stay one event and retain their author", () => {
    const events = pipelineFollowUpEvents(notes); assert.equal(events.length, 2);
    assert.equal(events[0].kind, "note"); assert.equal(events[0].actor, "Ana");
    assert.equal(events[0].body, "Cliente pide dos opciones.\nPrefiere llamada por la tarde.");
  });
  await test("History merges actual sources, orders chronologically and deduplicates by ID", () => {
    const events = buildFollowUpHistory(client, notes, [activity, activity, { ...activity, id: "foreign", userId: "another-client" }], true);
    assert.equal(events.length, 4); assert.equal(events[0].id, "activity:activity-1");
    assert.equal(events[0].body, activity.description); assert.ok(!events.some(e => e.id === "activity:foreign"));
    assert.equal(events[3].kind, "registration");
  });
  await test("Last actual event ignores generic updatedAt and registration-only clients", () => {
    assert.equal(lastFollowUpEvent(buildFollowUpHistory(client, "", [], true)), null);
    assert.equal(lastFollowUpEvent(buildFollowUpHistory(client, notes, [activity], true))?.at, "2026-10-20T15:30:00.000Z");
    assert.equal(lastFollowUpEvent(buildFollowUpHistory(client, "Nota: Sin fecha", [], true)), null);
  });
  await test("Same-minute legacy events preserve newest append first; undated data stays visible", () => {
    const events = buildFollowUpHistory(client, "[20-10-26, 10:33 a. m. · Ana] Primero\n[20-10-26, 10:33 a. m. · Ana] Segundo", [], true);
    assert.equal(events[0].body, "Segundo");
    assert.equal(buildFollowUpHistory(client, "Texto histórico sin fecha", [], true).at(-1)?.at, null);
  });
  await test("Revoked internal access hides every source even with cached activities", () => {
    assert.deepEqual(buildFollowUpHistory(client, notes, [activity], false), []);
  });
  await test("Earliest pending action wins, including overdue reminders; confirmation uses tracking owner", () => {
    const actions = nextFollowUpActions({ ...client, reminderAt: "2026-10-19T10:00:00Z", reminderNote: "Pedir documento", confirmationCallAt: "2026-10-20T16:00:00Z", nextCallAt: "2026-10-20T16:10:00Z" }, now);
    assert.equal(actions[0].kind, "reminder"); assert.equal(actions[0].urgency, "overdue"); assert.equal(actions[0].detail, "Pedir documento");
    assert.equal(actions[1].responsible, "Ejecutivo de seguimiento"); assert.equal(actions[2].responsible, "Ejecutiva asignada");
    assert.equal(actions[1].urgency, "today");
  });
  await test("Urgency follows the Chilean calendar day at UTC midnight", () => {
    const actions = nextFollowUpActions({ ...client, nextCallAt: "2026-10-20T02:00:00Z" }, new Date("2026-10-20T01:00:00Z"));
    assert.equal(actions[0].urgency, "today");
    assert.equal(nextFollowUpActions({ ...client, nextCallAt: "2026-10-21T15:00:00Z" }, now)[0].urgency, "upcoming");
  });
  await test("New and unscheduled clients get a clear next step without fictitious dates", () => {
    assert.equal(nextFollowUpActions(client, now)[0].title, "Registrar primer contacto");
    const action = nextFollowUpActions({ ...client, pipelineStatus: "CONTACTADO", nextCallAt: "invalid", assignedExecutiveName: null }, now)[0];
    assert.equal(action.title, "Definir próxima gestión"); assert.equal(action.at, null); assert.equal(action.responsible, "Sin responsable asignado");
  });
  await test("Terminal stages do not resurrect old appointments; Isapre processing remains open", () => {
    for (const pipelineStatus of ["CERRADO", "RECEPCIONADO", "PERDIDO"] as const) assert.equal(nextFollowUpActions({ ...client, pipelineStatus, nextCallAt: "2026-10-19T12:00:00Z" }, now)[0].urgency, "finished");
    assert.equal(nextFollowUpActions({ ...client, pipelineStatus: "ENVIADO_ISAPRE" }, now)[0].urgency, "unscheduled");
  });

  let authorized = true, realm = "executive", user = { id: "assigned", executiveKind: "ISAPRES_PREMIUM" }; let reads = 0;
  const route = load<typeof Route>("app/api/executive/clients/[id]/activities/route.ts", {
    "@/lib/auth/require-auth": { requireExecutiveOrAdminSession: async () => { if (!authorized) throw new ApiError("Unauthorized", 401); return { realm, user }; }, assertSessionStaffSection },
    "@/lib/api/user-store": { readClientOrThrow: async () => client },
    "@/lib/api/client-activity-store": { readClientActivities: async () => { reads++; return [activity]; } },
  });
  await test("Existing activities API: admin, assigned and tracking can read; unrelated executives cannot", async () => {
    for (const [nextRealm, id, expected] of [["admin", "admin", 200], ["executive", "assigned", 200], ["executive", "tracking", 200], ["executive", "outsider", 403]] as const) {
      realm = nextRealm; user = { id, executiveKind: "ISAPRES_PREMIUM" };
      const response = await route.GET(new Request("https://test.invalid"), { params: Promise.resolve({ id: client.id }) }); assert.equal(response.status, expected);
    }
    assert.equal(reads, 3);
  });
  await test("Existing activities API rejects membership and anonymous reads before loading history", async () => {
    realm = "executive"; user = { id: "assigned", executiveKind: "MEMBRESIA_ISAPRES_PREMIUM" };
    assert.equal((await route.GET(new Request("https://test.invalid"), { params: Promise.resolve({ id: client.id }) })).status, 403);
    authorized = false;
    assert.equal((await route.GET(new Request("https://test.invalid"), { params: Promise.resolve({ id: client.id }) })).status, 401);
    assert.equal(reads, 3);
  });

  type QueryState = { data?: ClientActivityRecord[]; isPending: boolean; isError: boolean; isFetching: boolean; refetch: () => void };
  let query: QueryState = { data: [activity], isPending: false, isError: false, isFetching: false, refetch: () => {} };
  let queryOptions: { enabled?: boolean; queryKey?: unknown[] } = {};
  const { ClientSeguimientoFlowView } = load<typeof View>("components/executive/client-seguimiento-flow-view.tsx", { "@tanstack/react-query": { useQuery: (options: typeof queryOptions) => { queryOptions = options; return query; } } });
  function render(canViewInternalNotes = true) { return renderToStaticMarkup(createElement(ClientSeguimientoFlowView, { client, pipelineStatus: "NUEVO", pipelineNotes: notes, canViewInternalNotes, isTrackingOnly: true, onBack: () => {} })); }
  await test("Rendered view includes real action, unified timeline, owner and truthful WhatsApp wording", () => {
    const html = render(); assert.match(html, /Historial unificado/); assert.match(html, /Próxima acción/); assert.match(html, /Ejecutiva asignada/);
    assert.match(html, /Se abrió WhatsApp/); assert.doesNotMatch(html, /Mensaje leído|WhatsApp entregado/);
    assert.ok(queryOptions.queryKey?.includes(client.id)); assert.ok(queryOptions.queryKey?.includes(client.updatedAt));
  });
  await test("Rendered view never exposes internal or cached data when permission is false", () => {
    const html = render(false); assert.equal(queryOptions.enabled, false);
    assert.doesNotMatch(html, /Cliente pide dos opciones|Se abrió WhatsApp|Ingreso de la ficha/); assert.match(html, /Sin acceso al historial/);
  });
  await test("Loading and errors remain explicit; stale commercial history is not presented as complete", () => {
    query = { ...query, isPending: true }; assert.match(render(), /Cargando historial/);
    query = { ...query, isPending: false, isError: true };
    const html = render(); assert.match(html, /Historial incompleto/); assert.match(html, /Actualizar historial/); assert.doesNotMatch(html, /Se abrió WhatsApp/);
  });
  console.log(`\n${count} follow-up scenarios passed. No database writes or permission changes.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
