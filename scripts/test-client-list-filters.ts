import { AUTOMATIC_CLIENT_ASSIGNMENT_ENABLED } from "../lib/client-pipeline/assignment-policy";
/** Pure regressions: no database, reassignment, network, or email. */
import assert from "node:assert/strict";
import { filterClientList, compareClientListValues } from "../lib/client-pipeline/client-list-filter";
import { DEFAULT_CLIENT_GESTION_FILTERS, CLIENT_GESTION_FILTER_OPTIONS } from "../lib/client-pipeline/client-gestion-filter";
import type { UserRecord } from "../types/user";
import type { ClientPipelineStatus } from "../types/client-pipeline";

const row = (id: string, status: ClientPipelineStatus | null, owner: string | null, extra: Partial<UserRecord> = {}): UserRecord => ({
  id, fullName: id, email: `${id}@example.invalid`, phone: null, rut: null,
  createdAt: "2026-01-01T00:00:00Z", pipelineStatus: status,
  assignedExecutiveId: owner, ...extra,
} as UserRecord);
const clients = [
  row("Nuevo A", "NUEVO", "a"), row("Nuevo B", null, "b"),
  row("Pausa A", "PAUSADO", "a"), row("Pendiente B", "PENDIENTE", "b"),
  row("Perdido A", "PERDIDO", "a"), row("Recepcionado", "RECEPCIONADO", "c"),
  row("Sin asignar", "NUEVO", null),
  row("Gestionado", "CONTACTADO", "a"),
];
const initial = JSON.stringify(clients);
const defaults = { search: "", statuses: [] as ClientPipelineStatus[], executiveIds: [] as string[], gestion: [...DEFAULT_CLIENT_GESTION_FILTERS], filterExecutives: true };
const ids = (options: Partial<Parameters<typeof filterClientList>[1]> = {}) => filterClientList(clients, {...defaults, ...options}).map(row => row.id);
let cases = 0;
function test(name: string, run: () => void) { run(); cases++; console.log(`OK ${name}`); }

test("default statuses preserve pending and hide paused/managed", () => assert.deepEqual(ids(), ["Nuevo A", "Nuevo B", "Pendiente B", "Sin asignar"]));
test("multiple states union", () => assert.deepEqual(ids({statuses:["NUEVO","PERDIDO"]}), ["Nuevo A","Nuevo B","Perdido A","Sin asignar"]));
test("null state remains Nuevo", () => assert(ids({statuses:["NUEVO"]}).includes("Nuevo B")));
test("multiple executives union", () => assert.deepEqual(ids({executiveIds:["a","b"]}), ["Nuevo A","Nuevo B","Pendiente B"]));
test("combine states and executives intersects groups", () => assert.deepEqual(ids({statuses:["NUEVO","PERDIDO"],executiveIds:["b"]}),["Nuevo B"]));
test("unassigned can combine with owner", () => assert.deepEqual(ids({executiveIds:["a","__unassigned__"]}),["Nuevo A","Sin asignar"]));
test("single unassigned excludes every existing owner", () => assert.deepEqual(ids({executiveIds:["__unassigned__"]}),["Sin asignar"]));
test("owner filter never widens executive portfolio", () => assert.deepEqual(filterClientList(clients.slice(0,1),{...defaults,executiveIds:["b"]}),[]));
test("executive-only view ignores unavailable admin filter", () => assert.deepEqual(ids({executiveIds:["unknown"], filterExecutives:false}),ids()));
test("explicit pause visible despite pending gestion", () => assert.deepEqual(ids({statuses:["PAUSADO"]}),["Pausa A"]));
test("mixed pause selection does not bypass gestion for other rows", () => assert.deepEqual(ids({statuses:["PAUSADO","CONTACTADO"]}),["Pausa A"]));
test("mixed selected states respect each row", () => assert.deepEqual(ids({statuses:["PAUSADO","NUEVO"]}),["Nuevo A","Nuevo B","Pausa A","Sin asignar"]));
test("multiple gestion options union", () => assert.deepEqual(ids({gestion:["hoy","gestionadas"]}),["Nuevo A","Nuevo B","Pendiente B","Perdido A","Recepcionado","Sin asignar","Gestionado"]));
test("no gestion selected yields no pending rows", () => assert.deepEqual(ids({gestion:[]}),[]));
test("search preserves historic terminal lookup", () => assert.deepEqual(ids({search:"perdido"}),["Perdido A"]));
test("search never implicitly exposes pause", () => assert.deepEqual(ids({search:"Pausa"}),[]));
test("search with explicit pause and owner", () => assert.deepEqual(ids({statuses:["PAUSADO","NUEVO"],search:"PAUSA",executiveIds:["a"]}),["Pausa A"]));
test("search still intersects selected states", () => assert.deepEqual(ids({statuses:["NUEVO"],search:"Perdido"}),[]));
test("all gestion includes active states only by default", () => assert(!ids({gestion:CLIENT_GESTION_FILTER_OPTIONS.map(o=>o.value)}).includes("Pausa A")));
test("sorting text asc/desc", () => {assert(compareClientListValues("Álvaro","Zoe","asc")<0);assert(compareClientListValues("Álvaro","Zoe","desc")>0);});
test("sorting numeric dates asc/desc", () => {assert(compareClientListValues(100,200,"asc")<0);assert(compareClientListValues(100,200,"desc")>0);});
test("missing schedules always last", () => {for(const direction of ["asc","desc"] as const) {assert(compareClientListValues(Infinity,200,direction)>0);assert(compareClientListValues(200,Infinity,direction)<0);assert.equal(compareClientListValues(Infinity,Infinity,direction),0);}});
test("filters cover entire portfolio before pagination", () => {const large=Array.from({length:150},(_,i)=>row(String(i),i>=100?"PERDIDO":"NUEVO","a"));assert.equal(filterClientList(large,{...defaults,statuses:["PERDIDO"]}).length,50);});
test("no duplicate rows when filters overlap", () => {const result=ids({statuses:["NUEVO","NUEVO"],executiveIds:["a","a"]}); assert.deepEqual(result,["Nuevo A"]);});
test("all source records and assignments preserved", () => assert.equal(JSON.stringify(clients),initial));
test("bulk assignment stays in code but unavailable in UI", () => assert.equal(AUTOMATIC_CLIENT_ASSIGNMENT_ENABLED,false));
const originClients = [
  row("manual-legacy", "NUEVO", "a"),
  row("manual", "NUEVO", "b", {clientOrigin:"MANUAL"}),
  row("whatsapp", "NUEVO", "a", {clientOrigin:"CAMPANA_LEAD_WHATSAPP"}),
  row("consalud", "NUEVO", "a", {clientOrigin:"CAMPANA_CONSALUD"}),
  row("web", "NUEVO", "b", {clientOrigin:"FORMULARIO_WEB", webFormSource:"Formulario personalizado"}),
  row("quote", "NUEVO", "a", {clientOrigin:"COTIZADOR"}),
  row("sendpulse", "NUEVO", "a", {clientOrigin:"SENDPULSE",sendpulseBotPhone:"+56911111111"}),
  row("paused-origin", "PAUSADO", "a", {clientOrigin:"CAMPANA_CONSALUD"}),
];
const originBefore=JSON.stringify(originClients);
const originIds = (options: Partial<Parameters<typeof filterClientList>[1]> = {}) => filterClientList(originClients,{...defaults,...options}).map(row=>row.id);
test("origin default preserves all existing results",()=>assert.deepEqual(originIds(),originClients.slice(0,7).map(row=>row.id)));
test("single campaign origin",()=>assert.deepEqual(originIds({origins:["CAMPANA_CONSALUD"]}),["consalud"]));
test("multiple origin selection unions results",()=>assert.deepEqual(originIds({origins:["CAMPANA_CONSALUD","CAMPANA_LEAD_WHATSAPP"]}),["whatsapp","consalud"]));
test("legacy missing origin remains manual",()=>assert.deepEqual(originIds({origins:["MANUAL"]}),["manual-legacy","manual"]));
test("SendPulse source can be filtered despite not being a manual creation choice",()=>assert.deepEqual(originIds({origins:["SENDPULSE"]}),["sendpulse"]));
test("form source includes customized form labels",()=>assert.deepEqual(originIds({origins:["FORMULARIO_WEB"]}),["web"]));
test("origin intersects executive, state and search",()=>assert.deepEqual(originIds({origins:["MANUAL","FORMULARIO_WEB"],executiveIds:["b"],statuses:["NUEVO"],search:"web"}),["web"]));
test("search never bypasses origin selection",()=>assert.deepEqual(originIds({origins:["CAMPANA_CONSALUD"],search:"whatsapp"}),[]));
test("origin does not bypass hidden paused clients",()=>assert(!originIds({origins:["CAMPANA_CONSALUD"]}).includes("paused-origin")));
test("explicit pause works with origin selection",()=>assert.deepEqual(originIds({origins:["CAMPANA_CONSALUD"],statuses:["PAUSADO"]}),["paused-origin"]));
test("unmatched origin returns an empty list",()=>assert.deepEqual(originIds({origins:["CAMPANA_BANMEDICA"]}),[]));
test("origin filtering preserves source fields and assignments",()=>assert.equal(JSON.stringify(originClients),originBefore));
console.log(`${cases} client filter/sort regressions passed.`);
