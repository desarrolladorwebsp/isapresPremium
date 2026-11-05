/** Real quotation store and KPI filters with an in-memory DB adapter. No production writes. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ClientQuotationRecord } from '../types/client-quotation';
import type { UserRecord } from '../types/user';
import { parseReceptionDate, formatReceptionDate } from '../lib/client-quotation/reception-date';
import { santiagoDateKey } from '../lib/client-pipeline/agenda-urgency';
import { filterOutcomeQuotations, filterSentQuotations, buildSentQuotationReport, type SentQuotationKpiRow } from '../lib/executive/sent-quotation-kpi';
import type * as Store from '../lib/api/client-quotation-store';

function load<T>(file: string, mocks: Record<string, unknown>, extra=''): T {
  const filename=path.resolve(file), localRequire=createRequire(filename), module={exports:{}};
  const code=ts.transpileModule(readFileSync(filename,'utf8')+extra,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(code,{module,exports:module.exports,console,process,Date,Error,URL,Request,Response,require:(id:string)=>id in mocks?mocks[id]:localRequire(id)},{filename});
  return module.exports as T;
}
async function main() {
let count=0;
async function test(name:string, action:()=>unknown|Promise<unknown>) {await action();count++;console.log(`OK ${name}`);}
const clock=new Date('2026-11-05T14:00:00Z');
await test('previous-month and first-day receipt retain the selected Chile day',()=>{for(const day of ['2026-10-31','2026-10-01','2026-01-01','2024-02-29'])assert.equal(santiagoDateKey(parseReceptionDate(day,clock)),day);});
await test('day/month/year required, rejects malformed, impossible and future dates',()=>{for(const bad of [undefined,null,12,'','2026-10','2026-02-30','2025-02-29','2026-11-06','2026-1-03','2026-10-01T00:00:00Z'])assert.throws(()=>parseReceptionDate(bad,clock));});
await test('UTC midnight obeys the preceding Chile date',()=>{assert.throws(()=>parseReceptionDate('2026-11-05',new Date('2026-11-05T01:00:00Z')));assert.equal(santiagoDateKey(parseReceptionDate('2026-11-04',new Date('2026-11-05T01:00:00Z'))),'2026-11-04');});
await test('display never invents a time of reception',()=>assert.ok(!formatReceptionDate('2026-10-31T12:00:00Z').includes(':')));

let row:Record<string,unknown>;
let writes=0;
const activities:Record<string,unknown>[]=[],clientLog:Record<string,unknown>[]=[];
function reset(status='ACCEPTED',receivedAt:Date|null=null){
  writes=0;activities.length=0;clientLog.length=0;
  row={id:'q1',number:'COT-QA',clientId:'client',executiveId:'human',executive:{fullName:'QA Ejecutivo'},status,version:1,items:[],activities:[],createdAt:new Date('2026-10-01T12:00:00Z'),updatedAt:new Date('2026-11-01T12:00:00Z'),sentAt:new Date('2026-10-02T12:00:00Z'),acceptedAt:new Date('2026-11-04T12:00:00Z'),receivedAt,outcomeReason:null};
}
const db={clientQuotation:{
 findFirst:async({where}:{where:{id:string;clientId:string}})=>where.id===row.id&&where.clientId===row.clientId?{...row}:null,
 update:async({data}:{data:Record<string,unknown>})=>{writes++;const {activities:activity,...patch}=data;Object.assign(row,patch);if(activity){const created=(activity as {create:Record<string,unknown>}).create;activities.push({...created,createdAt:new Date()});}return {...row,activities:activities.map((a,i)=>({...a,id:String(i)})),updatedAt:new Date()};},
}};
const mocks={'server-only':{},'@/lib/prisma':{prisma:db},'@/lib/api/client-activity-store':{logClientActivity:async(input:Record<string,unknown>)=>{clientLog.push(input);}}};
const store=load<typeof Store>('lib/api/client-quotation-store.ts',mocks);
const input={clientId:'client',quotationId:'q1',status:'RECEIVED' as const,actorId:'human',actorName:'QA Ejecutivo'};
reset();
await test('new receipt requires explicit date before writing',async()=>{await assert.rejects(store.updateClientQuotationStatus(input),/fecha/);assert.equal(writes,0);});
await test('invalid dates cannot write status, history or KPI timestamp',async()=>{for(const receivedOn of ['2026-02-30','2999-01-01',null,123])await assert.rejects(store.updateClientQuotationStatus({...input,receivedOn}));assert.equal(writes,0);assert.equal(activities.length,0);});
await test('receipt may precede the day acceptance was entered; historical acceptance and send are preserved',async()=>{const before=JSON.stringify({sent:row.sentAt,accepted:row.acceptedAt,items:row.items,executiveId:row.executiveId});const result=await store.updateClientQuotationStatus({...input,receivedOn:'2026-10-31'});assert.equal(result.receivedAt,'2026-10-31T12:00:00.000Z');assert.equal(result.status,'RECEIVED');assert.equal(JSON.stringify({sent:row.sentAt,accepted:row.acceptedAt,items:row.items,executiveId:row.executiveId}),before);assert.equal((activities[0].metadata as Record<string,string>).receivedOn,'2026-10-31');assert.ok((activities[0].createdAt as Date).getTime()>Date.parse('2026-11-01'));assert.equal(clientLog.length,1);});
const kpiRow=():SentQuotationKpiRow=>({id:'q1',number:'QA',clientId:'client',clientName:'QA',executiveId:'human',executiveName:'QA',status:'RECEIVED',sentAt:(row.sentAt as Date).toISOString(),receivedAt:(row.receivedAt as Date).toISOString(),acceptedAt:(row.acceptedAt as Date).toISOString(),rejectedAt:null,isapres:['Colmena']});
const scope={selectedExecutiveIds:[],selectedIsapreIds:[]};
await test('received KPI and admin report count October, not November registration; sent KPI unchanged',()=>{for(const month of ['2026-10','2026-11']){const filter={...scope,quotations:[kpiRow()],period:{kind:'month' as const,monthKey:month}};assert.equal(filterOutcomeQuotations({...filter,status:'RECEIVED'}).length,month==='2026-10'?1:0);assert.equal(buildSentQuotationReport(filter).receivedTotal,month==='2026-10'?1:0);}assert.equal(filterSentQuotations({...scope,quotations:[kpiRow()],period:{kind:'month',monthKey:'2026-10'}}).length,1);});
await test('receipt KPI still intersects executive and Isapre filters',()=>{const f={...scope,quotations:[kpiRow()],status:'RECEIVED' as const};assert.equal(filterOutcomeQuotations({...f,selectedExecutiveIds:['other']}).length,0);assert.equal(filterOutcomeQuotations({...f,selectedIsapreIds:['banmedica']}).length,0);assert.equal(filterOutcomeQuotations({...f,selectedExecutiveIds:['human'],selectedIsapreIds:['colmena']}).length,1);});
await test('explicit correction of a received date updates its KPI period with audit history',async()=>{await store.updateClientQuotationStatus({...input,receivedOn:'2026-11-01'});assert.equal((activities[1].metadata as Record<string,string>).previousReceivedOn,'2026-10-31');assert.match(String(activities[1].description),/corregida/);assert.equal(filterOutcomeQuotations({...scope,quotations:[kpiRow()],status:'RECEIVED',period:{kind:'month',monthKey:'2026-11'}}).length,1);});
await test('retry same date adds no duplicate activity',async()=>{await store.updateClientQuotationStatus({...input,receivedOn:'2026-11-01'});assert.equal(activities.length,2);assert.equal(clientLog.length,2);});
await test('legacy received timestamp remains unchanged without explicit correction',async()=>{const legacy=new Date('2026-10-31T19:42:00Z');reset('RECEIVED',legacy);await store.updateClientQuotationStatus(input);assert.equal((row.receivedAt as Date).toISOString(),legacy.toISOString());await store.updateClientQuotationStatus({...input,receivedOn:'2026-10-31'});assert.equal((row.receivedAt as Date).toISOString(),legacy.toISOString());assert.equal(activities.length,0);});
await test('other status cannot carry receipt date; invalid transitions remain blocked',async()=>{reset('ACCEPTED');await assert.rejects(store.updateClientQuotationStatus({...input,status:'VOIDED',receivedOn:'2026-10-31'}),/estado Recepcionada/);reset('SENT');await assert.rejects(store.updateClientQuotationStatus({...input,receivedOn:'2026-10-31'}),/No se puede cambiar/);assert.equal(writes,0);});
await test('wrong client cannot modify another quotation',async()=>{reset();await assert.rejects(store.updateClientQuotationStatus({...input,clientId:'other',receivedOn:'2026-10-31'}),/no encontrada/);assert.equal(writes,0);});
await test('pipeline closing requires a valid effective date too',()=>{
 const pipeline=load<{__validate:(record:unknown)=>unknown}>('lib/api/client-pipeline-store.ts',mocks,'\nexport const __validate = validateClosedRecord;');
 assert.throws(()=>pipeline.__validate({isapre:'Colmena',closedAt:'2026-02-30'}));
 assert.throws(()=>pipeline.__validate({isapre:'Colmena',closedAt:'2999-01-01'}));
 assert.equal((pipeline.__validate({isapre:'Colmena',closedAt:'2026-10-31'}) as {closedAt:string}).closedAt,'2026-10-31');
});
await test('PATCH route forwards the receipt day and still checks write access',async()=>{
 let authorized=true, forwarded:unknown=null;
 const route=load<{PATCH:(req:Request,ctx:unknown)=>Promise<Response>}>('app/api/executive/clients/[id]/quotations/[quotationId]/route.ts',{
  '@/lib/api/client-quotation-access':{requireClientQuotationAccess:async(_req:unknown,_id:unknown,write:boolean)=>{assert.equal(write,true);if(!authorized)throw new Error('unauthorized');return {user:{id:'human',fullName:'QA'}};}},
  '@/lib/api/client-quotation-store':{updateClientQuotationStatus:async(data:unknown)=>{forwarded=data;return {};}}
 });
 const req=()=>new Request('http://localhost/api/receipt',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status:'RECEIVED',receivedOn:'2026-10-31'})});
 assert.equal((await route.PATCH(req(),{params:Promise.resolve({id:'client',quotationId:'q1'})})).status,200);
 assert.equal((forwarded as {receivedOn:string}).receivedOn,'2026-10-31');
 authorized=false;forwarded=null;
 assert.notEqual((await route.PATCH(req(),{params:Promise.resolve({id:'client',quotationId:'q1'})})).status,200);
 assert.equal(forwarded,null);
});
await test('real quotation UI renders editable receipt date, audit explanation and correction action',()=>{
 const quotation={id:'q1',number:'QA',status:'RECEIVED',plans:[],activities:[],createdAt:'2026-10-01T12:00:00Z',receivedAt:'2026-10-31T12:00:00Z',executiveName:'QA'} as unknown as ClientQuotationRecord;
 const states:unknown[]=[true,[quotation],'q1',[],false,false,null,{quotationId:'q1',day:'2026-10-31'}];let index=0;
 const ui=load<{ClientQuotationManager:React.ComponentType<{client:UserRecord;canEdit:boolean}>}>('components/executive/client-quotation-manager.tsx',{
  '@tanstack/react-query':{useQueryClient:()=>({invalidateQueries:async()=>{}})},
  react:{...React,useEffect:()=>{},useMemo:(fn:()=>unknown)=>fn(),useState:()=>[states[index++],()=>{}]}
 });
 const html=renderToStaticMarkup(React.createElement(ui.ClientQuotationManager,{client:{id:'client',assignedPlans:[]} as unknown as UserRecord,canEdit:true}));
 assert.match(html,/type="date"/);assert.match(html,/required=""/);assert.match(html,/value="2026-10-31"/);
 assert.match(html,/Corregir fecha de recepción/);assert.match(html,/Los KPI usarán esta fecha/);assert.match(html,/Confirmar recepción/);
 quotation.receivedAt=null;index=0;const missing=renderToStaticMarkup(React.createElement(ui.ClientQuotationManager,{client:{id:'client',assignedPlans:[]} as unknown as UserRecord,canEdit:true}));assert.match(missing,/Sin fecha registrada/);assert.match(missing,/Corregir fecha de recepción/);
});
console.log(`${count} receipt-date scenarios passed. No real database writes, emails or saved PDF changes.`);

}
main().catch(error=>{console.error(error);process.exitCode=1;});
