/** Pure domain and real dashboard render tests. No DB, data writes or messages. */
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { activeClientPortfolio, showActiveClientPortfolio } from "../lib/executive/active-client-portfolio";
import { santiagoMonthKey } from "../lib/client-pipeline/agenda-urgency";
import type { UserRecord } from "../types/user";
import type * as Home from "../components/executive/executive-dashboard-home";

function client(id:string,extra:Partial<UserRecord>={}):UserRecord{return {id,email:`${id}@example.invalid`,fullName:`QA ${id}`,phone:null,rut:null,role:"CLIENT",active:true,assignedExecutiveId:"a",assignedExecutiveName:"Ana",pipelineStatus:"NUEVO",createdAt:"2020-01-01T15:00:00Z",updatedAt:"2020-01-01T15:00:00Z",...extra};}
const rows=[client("new"),client("closed",{pipelineStatus:"CERRADO"}),client("received",{pipelineStatus:"RECEPCIONADO"}),client("lost",{pipelineStatus:"PERDIDO"}),client("paused",{pipelineStatus:"PAUSADO"}),client("other",{assignedExecutiveId:"b",assignedExecutiveName:"Bruno"}),client("unassigned",{assignedExecutiveId:null,assignedExecutiveName:null}),client("legacy",{pipelineStatus:null}),client("follow",{pipelineStatus:"EN_SEGUIMIENTO"}),client("pending",{pipelineStatus:"PENDIENTE"}),client("no-answer",{pipelineStatus:"NO_CONTESTA"}),client("sent-isapre",{pipelineStatus:"ENVIADO_ISAPRE"})];
const initial=JSON.stringify(rows);
const admin=(extra:Partial<Parameters<typeof activeClientPortfolio>[0]>={})=>activeClientPortfolio({clients:rows,isAdmin:true,executiveId:"admin",...extra});
const now=new Date("2026-11-02T15:00:00Z");
let cases=0;
function test(name:string,run:()=>void){run();cases++;console.log(`OK ${name}`);}
test("only lost and paused excluded, all other stages retained",()=>{const list=admin();assert.equal(list.length,10);assert(!list.some(r=>["lost","paused"].includes(r.id)));for(const id of ["closed","received","legacy","pending","follow","sent-isapre","no-answer"])assert(list.some(r=>r.id===id));});
test("old registration dates remain in current portfolio",()=>assert(admin().some(r=>r.id==="new"&&r.createdAt.startsWith("2020"))));
test("one row per client ID",()=>assert.equal(admin({clients:[...rows,rows[0],rows[0]]}).length,10));
test("same name with distinct client IDs counts twice",()=>assert.equal(admin({clients:[client("one",{fullName:"Same"}),client("two",{fullName:"Same"})]}).length,2));
test("admin selected executive uses current owner",()=>{const list=admin({adminExecutiveFilter:"b"});assert.equal(list.length,1);assert.equal(list[0].id,"other");});
test("admin unassigned filter",()=>{const list=admin({adminExecutiveFilter:"__unassigned__"});assert.equal(list.length,1);assert.equal(list[0].id,"unassigned");});
test("unknown executive has no clients",()=>assert.equal(admin({adminExecutiveFilter:"unknown"}).length,0));
test("non-admin sees only own assigned clients",()=>{const list=activeClientPortfolio({clients:rows,isAdmin:false,executiveId:"a",adminExecutiveFilter:"b"});assert.equal(list.length,8);assert(list.every(r=>r.assignedExecutiveId==="a"));});
test("tracking alone never widens active portfolio",()=>assert.equal(activeClientPortfolio({clients:[client("tracked",{assignedExecutiveId:"b",trackingExecutiveId:"a"})],isAdmin:false,executiveId:"a"}).length,0));
test("missing staff identity does not expose cached clients",()=>assert.equal(activeClientPortfolio({clients:rows,isAdmin:false,executiveId:null}).length,0));
test("empty and all-excluded portfolios return zero",()=>{assert.equal(admin({clients:[]}).length,0);assert.equal(admin({clients:rows.filter(r=>["lost","paused"].includes(r.id))}).length,0);});
test("legacy account active flag does not add an unrequested exclusion",()=>assert.equal(admin({clients:[client("account-disabled",{active:false})]}).length,1));
test("card visible this month and all months",()=>{assert(showActiveClientPortfolio("2026-11",now));assert(showActiveClientPortfolio("",now));assert(showActiveClientPortfolio(null,now));});
test("card hidden in historical, future and malformed months",()=>{for(const month of ["2026-10","2025-11","2026-12","2026-99"])assert(!showActiveClientPortfolio(month,now));});
test("Chile month boundary before UTC month rolls over locally",()=>{const boundary=new Date("2026-11-01T02:30:00Z");assert(showActiveClientPortfolio("2026-10",boundary));assert(!showActiveClientPortfolio("2026-11",boundary));});
test("data and existing ownership unchanged",()=>assert.equal(JSON.stringify(rows),initial));

const filename=path.resolve("components/executive/executive-dashboard-home.tsx"),localRequire=createRequire(filename),loaded={exports:{}};
let adminSession=true,sessionId:string|null="a",kind="ISAPRES_PREMIUM",queryRows=rows,queryError=false;
const query=(data:unknown)=>({data,isLoading:false,isFetching:false,isError:queryError,refetch:async()=>{}});
const mocks:Record<string,unknown>={
 "next/navigation":{useRouter:()=>({push:()=>{}})},
 "@/hooks/use-auth-session":{useStaffSession:()=>({isAdmin:adminSession,user:sessionId?{id:sessionId,fullName:"QA Staff"}:null,executiveKind:kind})},
 "@/hooks/query/use-executive-clients-query":{useExecutiveClientsQuery:()=>query(queryRows)},
 "@/hooks/query/use-sent-quotations-query":{useSentQuotationsQuery:()=>query([])},
 "@/hooks/query/use-executive-accounts-query":{useExecutiveAccountsQuery:()=>query([])},
};
const compiled=ts.transpileModule(readFileSync(filename,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
vm.runInNewContext(compiled,{module:loaded,exports:loaded.exports,console,process,URL,require:(id:string)=>id in mocks?mocks[id]:localRequire(id)},{filename});
const home=loaded.exports as typeof Home;
const currentMonth=santiagoMonthKey(new Date())!;
const date=new Date(`${currentMonth}-15T12:00:00Z`);date.setUTCMonth(date.getUTCMonth()-1);const pastMonth=date.toISOString().slice(0,7);
function render(extra:Partial<Home.DashboardHomeState>={}){return renderToStaticMarkup(createElement(home.ExecutiveDashboardHome,{state:{...home.createDashboardHomeState(),selectedMonth:currentMonth,...extra},onStateChange:()=>{}}));}
function activeButton(html:string){return html.match(/<button[^>]*>[\s\S]*?<p class="premium-dash-stat-label">Clientes activos<\/p>[\s\S]*?<\/button>/)?.[0]??"";}
test("real card count equals filtered unique list and total portfolio unchanged",()=>{const html=render();assert.match(activeButton(html),/premium-dash-stat-value[^>]*>10<\/p>/);assert.match(html,/Mis clientes<\/p>[\s\S]*?premium-dash-stat-value[^>]*>12<\/p>/);});
test("real card visible for all months, hidden for past month",()=>{assert(activeButton(render({selectedMonth:""})));assert.equal(activeButton(render({selectedMonth:pastMonth})),"");});
test("historical state cannot open current active client list",()=>{const html=render({selectedMonth:pastMonth,activeClientsOpen:true});assert(!html.includes('aria-label="Ver ficha de QA new"'));assert(!html.includes('Paginación de clientes activos'));});
test("real detail includes closed/received and excludes lost/paused",()=>{const html=render({activeClientsOpen:true});for(const id of ["new","closed","received"])assert(html.includes(`Ver ficha de QA ${id}`));for(const id of ["lost","paused"])assert(!html.includes(`Ver ficha de QA ${id}`));});
test("real detail and card follow executive filter",()=>{const html=render({activeClientsOpen:true,adminExecutiveFilter:"b"});assert.match(activeButton(html),/premium-dash-stat-value[^>]*>1<\/p>/);assert(html.includes('Ver ficha de QA other'));assert(!html.includes('Ver ficha de QA new'));});
test("unassigned client has clear responsibility label",()=>assert.match(render({activeClientsOpen:true,adminExecutiveFilter:"__unassigned__"}),/Responsable: Sin asignar/));
test("insurer selection does not change portfolio count",()=>assert.match(activeButton(render({selectedIsapreIds:["colmena"]})),/premium-dash-stat-value[^>]*>10<\/p>/));
test("no clients is an explicit zero and empty list",()=>{queryRows=[];const html=render({activeClientsOpen:true});assert.match(activeButton(html),/premium-dash-stat-value[^>]*>0<\/p>/);assert.match(html,/No hay clientes activos/);queryRows=rows;});
test("large portfolio counted before pagination, 50 rows at a time",()=>{queryRows=Array.from({length:125},(_,i)=>client(String(i).padStart(3,"0")));const first=render({activeClientsOpen:true});assert.match(activeButton(first),/premium-dash-stat-value[^>]*>125<\/p>/);assert.equal((first.match(/aria-label="Ver ficha de QA /g)??[]).length,50);const second=render({activeClientsOpen:true,activeClientsPage:2});assert.match(second,/Mostrando 51–100 de 125 clientes/);assert(!second.includes('Ver ficha de QA 000'));assert(second.includes('Ver ficha de QA 050'));queryRows=rows;});
test("out of range page safely clamps to available list",()=>assert.match(render({activeClientsOpen:true,activeClientsPage:999}),/Página 1 de 1/));
test("query failure never presents a false zero",()=>{queryError=true;assert.match(activeButton(render()),/premium-dash-stat-value[^>]*>—<\/p>/);queryError=false;});
test("limited executive kinds retain their cards and own active portfolio",()=>{adminSession=false;for(const k of ["ZOOM","ISAPRES","ISAPRES_PREMIUM"]){kind=k;assert.match(activeButton(render()),/premium-dash-stat-value[^>]*>8<\/p>/);}adminSession=true;kind="ISAPRES_PREMIUM";});
console.log(`${cases} active client portfolio scenarios passed. No real data or assignment changes.`);
