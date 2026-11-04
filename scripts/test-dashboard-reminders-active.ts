/** Pure tests and rendered component checks: no real clients, DB writes or messages. */
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { countExecutiveAgendaStats } from "../lib/client-pipeline/agenda-stats";
import { santiagoMonthKey } from "../lib/client-pipeline/agenda-urgency";
import { filterAgendaItemsByExecutive } from "../lib/executive/dashboard-executive-filter";
import { filterActiveQuotations, groupActiveQuotationsByClient } from "../lib/executive/sent-quotation-kpi";
import type { SentQuotationKpiRow } from "../lib/executive/sent-quotation-kpi";
import type { UserRecord } from "../types/user";
import type * as Home from "../components/executive/executive-dashboard-home";

const now=new Date("2026-11-02T15:00:00Z");
const client=(id:string,extra:Partial<UserRecord>={}):UserRecord=>({id,fullName:`QA ${id}`,email:`${id}@example.invalid`,phone:null,rut:null,role:"CLIENT",active:true,pipelineStatus:"CONTACTADO",assignedExecutiveId:"a",assignedExecutiveName:"Ana",createdAt:"2026-10-01T15:00:00Z",updatedAt:"2026-10-01T15:00:00Z",...extra});
const today=client("today",{reminderAt:"2026-11-02T16:00:00Z",reminderNote:"Enviar antecedentes"});
const stats=(clients:UserRecord[],extra:Partial<Parameters<typeof countExecutiveAgendaStats>[0]>={})=>countExecutiveAgendaStats({clients,executiveId:"a",isAdmin:false,monthKey:"2026-11",now,...extra});
const quote=(id:string,extra:Partial<SentQuotationKpiRow>={}):SentQuotationKpiRow=>({id,number:`QA-${id}`,clientId:`client-${id}`,clientName:`QA ${id}`,executiveId:"a",executiveName:"Ana",status:"SENT",sentAt:"2026-11-01T15:00:00Z",receivedAt:null,acceptedAt:null,rejectedAt:null,isapres:["Banmédica"],...extra});
const quotations=[quote("new"),quote("older",{sentAt:"2026-01-01T15:00:00Z",isapres:["Colmena","Banmédica"]}),quote("other-owner",{executiveId:"b",isapres:["Colmena"]}),quote("accepted",{status:"ACCEPTED"}),quote("rejected",{status:"REJECTED"}),quote("received",{status:"RECEIVED"}),quote("draft",{status:"DRAFT" as SentQuotationKpiRow["status"]}),quote("voided",{status:"VOIDED" as SentQuotationKpiRow["status"]})];
const filters={quotations,selectedExecutiveIds:[] as string[],selectedIsapreIds:[] as string[]};
let cases=0;
function test(name:string,run:()=>void){run();cases++;console.log(`OK ${name}`);}

test("today reminder count, note, date and owner",()=>{const result=stats([today]);assert.equal(result.remindersToday,1);assert.equal(result.items.remindersToday[0].action,"Enviar antecedentes");assert.equal(result.items.remindersToday[0].responsibleId,"a");assert.equal(result.items.remindersToday[0].kind,"reminder");assert(result.items.remindersToday[0].whenLabel);});
test("reminders do not change existing management counters",()=>{const before=stats([client("today")]);const after=stats([today]);for(const key of ["dueToday","overdue","upcoming","newClients"] as const)assert.equal(after[key],before[key]);});
test("past and future reminders excluded",()=>assert.equal(stats([client("past",{reminderAt:"2026-11-01T16:00:00Z"}),client("future",{reminderAt:"2026-11-03T16:00:00Z"})]).remindersToday,0));
test("missing or invalid dates excluded",()=>assert.equal(stats([client("missing"),client("invalid",{reminderAt:"not-a-date"})]).remindersToday,0));
test("Chile day at UTC midnight: preceding Chile day excluded",()=>assert.equal(stats([client("utc",{reminderAt:"2026-11-02T02:00:00Z"})]).remindersToday,0));
test("Chile day before local midnight includes matching reminder",()=>assert.equal(stats([client("utc",{reminderAt:"2026-11-02T02:00:00Z"})],{now:new Date("2026-11-02T02:30:00Z")}).remindersToday,1));
test("selected historical month excludes today's reminder",()=>assert.equal(stats([today],{monthKey:"2026-10"}).remindersToday,0));
test("wrong executive and missing session excluded",()=>{assert.equal(stats([today],{executiveId:"b"}).remindersToday,0);assert.equal(stats([today],{executiveId:null}).remindersToday,0);});
test("tracking alone does not transfer current responsibility",()=>assert.equal(stats([{...today,trackingExecutiveId:"b"}],{executiveId:"b"}).remindersToday,0));
for(const pipelineStatus of ["PAUSADO","PERDIDO","CERRADO","RECEPCIONADO"] as const)test(`${pipelineStatus} has no daily reminder`,()=>assert.equal(stats([{...today,pipelineStatus}]).remindersToday,0));
test("admin can see assigned and unassigned; executive filters use current owner",()=>{const result=stats([today,client("orphan",{reminderAt:today.reminderAt,assignedExecutiveId:null,assignedExecutiveName:null})],{executiveId:null,isAdmin:true});assert.equal(result.remindersToday,2);assert.equal(filterAgendaItemsByExecutive(result.items.remindersToday,"a").length,1);assert.equal(filterAgendaItemsByExecutive(result.items.remindersToday,"__unassigned__").length,1);});
test("blank note has concrete fallback",()=>assert.match(stats([{...today,reminderNote:" "}]).items.remindersToday[0].action,/Revisar el pendiente/));
test("reminders ordered by time without duplicate items",()=>{const result=stats([today,client("early",{reminderAt:"2026-11-02T12:00:00Z"})]);assert.equal(result.items.remindersToday[0].clientId,"early");assert.equal(new Set(result.items.remindersToday.map(r=>r.id)).size,2);});
test("unique client ID, not quote count, drives active total",()=>{
 const rows=[...filterActiveQuotations(filters),quote("second",{clientId:"client-new",clientName:"QA new"})];
 const groups=groupActiveQuotationsByClient(rows);assert.equal(groups.length,3);assert.equal(groups.find(g=>g.clientId==="client-new")?.items.length,2);
});
test("same name with different client IDs counts two clients",()=>assert.equal(groupActiveQuotationsByClient([quote("one",{clientName:"Same"}),quote("two",{clientName:"Same"})]).length,2));
test("group after monthly scope includes only pending documents from selected month",()=>{const rows=[quote("older",{clientId:"client-new",sentAt:"2026-01-01T15:00:00Z"}),quote("new")];assert.equal(groupActiveQuotationsByClient(filterActiveQuotations({...filters,quotations:rows,period:{kind:"month",monthKey:"2026-11"}}))[0].items.length,1);});
const untouched=JSON.stringify({today,quotations});
test("active includes earlier months; only current SENT state",()=>assert.deepEqual(filterActiveQuotations(filters).map(r=>r.id),["new","older","other-owner"]));
test("active filter by executive",()=>assert.deepEqual(filterActiveQuotations({...filters,selectedExecutiveIds:["b"]}).map(r=>r.id),["other-owner"]));
test("multiple isapres count a document once",()=>assert.equal(filterActiveQuotations({...filters,selectedIsapreIds:["banmedica","colmena"]}).length,3));
test("executive and isapre filters intersect",()=>assert.deepEqual(filterActiveQuotations({...filters,selectedExecutiveIds:["a"],selectedIsapreIds:["colmena"]}).map(r=>r.id),["older"]));
test("unassigned filter does not expose another issuer",()=>assert.equal(filterActiveQuotations({...filters,selectedExecutiveIds:["__unassigned__"]}).length,0));
test("optional explicit sending month supported",()=>assert.deepEqual(filterActiveQuotations({...filters,period:{kind:"month",monthKey:"2026-11"}}).map(r=>r.id),["new","other-owner"]));
test("invalid period and malformed sent date excluded",()=>{assert.equal(filterActiveQuotations({...filters,period:{kind:"month",monthKey:"2026-99"}}).length,0);assert.equal(filterActiveQuotations({...filters,quotations:[quote("bad",{sentAt:"invalid"})]}).length,0);});
test("no source records or saved quotations mutated",()=>assert.equal(JSON.stringify({today,quotations}),untouched));

// Render the real dashboard with mocked read-only query/session boundaries.
const filename=path.resolve("components/executive/executive-dashboard-home.tsx"),localRequire=createRequire(filename),loaded={exports:{}};
let admin=true;
const displayClient=client("render-reminder",{reminderAt:new Date().toISOString(),reminderNote:"QA Nota del recordatorio"});
const query=(data:unknown)=>({data,isLoading:false,isFetching:false,refetch:async()=>{}});
const mocks:Record<string,unknown>={
  "next/navigation":{useRouter:()=>({push:()=>{}})},
  "@/hooks/use-auth-session":{useStaffSession:()=>({isAdmin:admin,user:{id:"a",fullName:"QA Ejecutivo"},executiveKind:"ISAPRES_PREMIUM"})},
  "@/hooks/query/use-executive-clients-query":{useExecutiveClientsQuery:()=>query([displayClient])},
  "@/hooks/query/use-sent-quotations-query":{useSentQuotationsQuery:()=>query([...quotations,quote("second",{clientId:"client-new",clientName:"QA new"})])},
  "@/hooks/query/use-executive-accounts-query":{useExecutiveAccountsQuery:()=>query([])},
};
const compiled=ts.transpileModule(readFileSync(filename,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
vm.runInNewContext(compiled,{module:loaded,exports:loaded.exports,console,process,URL,require:(id:string)=>id in mocks?mocks[id]:localRequire(id)},{filename});
const home=loaded.exports as typeof Home;
const state=()=>({...home.createDashboardHomeState(),selectedMonth:santiagoMonthKey(new Date())!});
function render(extra:Partial<Home.DashboardHomeState>={}){return renderToStaticMarkup(createElement(home.ExecutiveDashboardHome,{state:{...state(),...extra},onStateChange:()=>{}}));}
test("real dashboard renders both new cards",()=>{const html=render();assert.match(html,/Recordatorios de hoy/);assert.match(html,/Cotizaciones activas/);assert.match(html,/Clientes sin respuesta del mes elegido/);});
test("reminder detail has note, responsibility and client navigation",()=>{const html=render({openBucket:"remindersToday"});assert.match(html,/QA Nota del recordatorio/);assert.match(html,/Ana/);assert.match(html,/Ver ficha de QA render-reminder/);});
test("active detail includes older SENT and excludes answered documents",()=>{const html=render({quotationList:"active",selectedMonth:""});assert.match(html,/QA-older/);assert.match(html,/QA-new/);assert(!html.includes("QA-accepted"));assert(!html.includes("QA-rejected"));});
test("active follows sending month, including empty historical results",()=>{const october=render({quotationList:"active",selectedMonth:"2026-10"});assert(!october.includes("QA-older"));assert.match(october,/No hay cotizaciones activas/);assert.match(render({quotationList:"active",selectedMonth:"2026-01"}),/QA-older/);});
test("real card counts each client once and detail groups documents",()=>{const html=render({quotationList:"active"});assert.match(html,/Cotizaciones activas<\/p>[\s\S]*?premium-dash-stat-value[^>]*>2<\/p>/);assert.match(html,/2 cotizaciones pendientes/);assert.match(html,/QA-second/);assert.equal((html.match(/aria-label="Ver ficha de QA new"/g)??[]).length,1);});
test("detail applies executive and isapre selection",()=>{const html=render({quotationList:"active",adminExecutiveFilter:"b",selectedIsapreIds:["colmena"]});assert.match(html,/QA-other-owner/);assert(!html.includes("QA-older"));});
test("non-admin reminder uses session owner without admin controls",()=>{admin=false;const html=render({openBucket:"remindersToday"});assert.match(html,/QA Nota del recordatorio/);assert(!html.includes('aria-label="Filtrar por ejecutivo"'));});
console.log(`${cases} reminder/active-quotation scenarios passed. No real data writes or messages.`);
