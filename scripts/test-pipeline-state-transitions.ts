/** Actual service exercised in memory: no real clients, notifications or credentials. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import type * as Store from '../lib/api/client-pipeline-store';
import {advancePipelineStatus, CLIENT_PIPELINE_STATUS_OPTIONS} from '../lib/client-pipeline/constants';

async function main(){
let row:any, writes=0, notifications=0, quoteWrites=0, concurrent=false;
const fixture=()=>({id:'qa',pipelineStatus:'EN_SEGUIMIENTO',assignedExecutiveId:'premium',trackingExecutiveId:'zoom',confirmationCallAt:new Date('2026-10-30T12:00:00Z'),updatedAt:new Date('2026-10-01'),createdAt:new Date('2026-10-01'),pipelineClosedRecord:null,pipelineNotes:'Historial previo',clientProfile:{anualidad:true,anualidadExpiresMonth:'2027-10'},assignedPlans:[{id:'plan-original'}],nextCallAt:new Date('2026-10-30T15:00:00Z')});
const receipt={isapre:'Colmena',closedAt:'2026-10-31',planCode:'ORIGINAL'};
const reset=()=>{row=fixture();writes=0;notifications=0;quoteWrites=0;concurrent=false;};
const db={staffAccount:{findFirst:async()=>({id:'target',role:'ADMIN'}),findUnique:async()=>({fullName:'QA Admin'})},user:{update:async({where,data}:any)=>{
 assert.equal(where.updatedAt.getTime(),row.updatedAt.getTime(),'Optimistic concurrency required');
 if(concurrent)throw Object.assign(new Error('Concurrent edit'),{code:'P2025'});
 writes++; const {assignedExecutive,trackingExecutive,...rest}=data;Object.assign(row,rest);
 if(assignedExecutive)row.assignedExecutiveId=assignedExecutive.connect.id;
 if(trackingExecutive?.disconnect)row.trackingExecutiveId=null;
 return structuredClone(row);
}},quote:{updateMany:async()=>{quoteWrites++;return {count:0};}}};
const filename=path.resolve('lib/api/client-pipeline-store.ts'),localRequire=createRequire(filename),loaded={exports:{}};
const mocks:any={'@/lib/prisma':{prisma:db},'@/lib/api/user-store':{readClientOrThrow:async()=>structuredClone(row),clientRecordInclude:{},mapDbClientRecord:(x:any)=>x},'@/lib/email/notify-executive-client-assignment':{queueExecutiveClientAssignmentEmail:()=>{notifications++;}}};
vm.runInNewContext(ts.transpileModule(readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{module:loaded,exports:loaded.exports,require:(id:string)=>id in mocks?mocks[id]:localRequire(id),console,process,Date},{filename});
const store=loaded.exports as typeof Store;
const actor={executiveAccountId:'admin',isAdmin:true,isPremium:true};
const derive=(kind:'ZOOM'|'ISAPRES')=>store.redirectClientFromIsapresPremium('qa',{executiveAccountId:'target'},actor,kind);
let cases=0;async function test(name:string,run:()=>Promise<void>|void){reset();await run();cases++;console.log('OK '+name);}
await test('all nonterminal stages can advance to insurer, then received without backward steps',()=>{
 for(const status of ['NUEVO','PENDIENTE','CONTACTADO','NO_CONTESTA','EN_SEGUIMIENTO'] as const){assert.equal(advancePipelineStatus(status,'ENVIADO_ISAPRE'),'ENVIADO_ISAPRE');}
 assert.equal(advancePipelineStatus('ENVIADO_ISAPRE','RECEPCIONADO'),'RECEPCIONADO');
 for(const status of CLIENT_PIPELINE_STATUS_OPTIONS){assert.equal(advancePipelineStatus('RECEPCIONADO',status),'RECEPCIONADO');assert.equal(advancePipelineStatus('PERDIDO',status),'PERDIDO');assert.equal(advancePipelineStatus('PAUSADO',status),'PAUSADO');}
});
await test('manual sent status preserves ownership, profile, documents and tracking',async()=>{const before=structuredClone(row);await store.updateClientPipeline('qa',{pipelineStatus:'ENVIADO_ISAPRE',manualStatusChange:true,statusChangeNote:'Envío confirmado'},actor);assert.equal(row.pipelineStatus,'ENVIADO_ISAPRE');for(const key of ['assignedExecutiveId','trackingExecutiveId','clientProfile','assignedPlans','nextCallAt'])assert.deepEqual(row[key],before[key]);assert.match(row.pipelineNotes,/Historial previo/);});
await test('legacy or invalid status rejected before any write',async()=>{for(const value of ['CERRADO','cerrado','INVALID'])await assert.rejects(store.updateClientPipeline('qa',{pipelineStatus:value as never},actor),/inválido/);assert.equal(writes,0);});
await test('receipt requires date and insurer, with zero writes on invalid input',async()=>{for(const closedRecord of [undefined,{...receipt,isapre:''},{...receipt,closedAt:'2026-02-30'},{...receipt,closedAt:'2999-01-01'}])await assert.rejects(store.updateClientPipeline('qa',{pipelineStatus:'RECEPCIONADO',closedRecord},actor));assert.equal(writes,0);});
await test('manual receipt saves effective date, clears tracking and preserves commercial documents',async()=>{const before=structuredClone(row);await store.updateClientPipeline('qa',{pipelineStatus:'RECEPCIONADO',closedRecord:receipt},actor);assert.equal(row.pipelineStatus,'RECEPCIONADO');assert.equal(row.pipelineClosedRecord.closedAt,'2026-10-31');assert.equal(row.trackingExecutiveId,null);assert.equal(row.confirmationCallAt,null);for(const key of ['assignedExecutiveId','clientProfile','assignedPlans','nextCallAt'])assert.deepEqual(row[key],before[key]);assert.equal(quoteWrites,0);});
await test('Isapres handoff cannot invent receipt data',async()=>{await assert.rejects(derive('ISAPRES'),/Completa el registro/);assert.equal(writes,0);assert.equal(quoteWrites,0);assert.equal(notifications,0);});
await test('Isapres handoff validates an existing effective receipt date',async()=>{row.pipelineClosedRecord={...receipt,closedAt:'2026-02-30'};await assert.rejects(derive('ISAPRES'));assert.equal(writes,0);});
await test('Isapres handoff saves received, clears tracking, preserves effective date and history',async()=>{row.pipelineClosedRecord=receipt;const before=structuredClone(row);await derive('ISAPRES');assert.equal(row.pipelineStatus,'RECEPCIONADO');assert.equal(row.assignedExecutiveId,'target');assert.equal(row.trackingExecutiveId,null);assert.equal(row.confirmationCallAt,null);for(const key of ['pipelineClosedRecord','clientProfile','assignedPlans','nextCallAt'])assert.deepEqual(row[key],before[key]);assert.ok(row.pipelineNotes.startsWith(before.pipelineNotes));assert.equal(notifications,1);});
await test('Zoom return still saves No contesta and clears tracking',async()=>{await derive('ZOOM');assert.equal(row.pipelineStatus,'NO_CONTESTA');assert.equal(row.trackingExecutiveId,null);assert.equal(row.assignedExecutiveId,'target');});
await test('paused clients cannot be handed off',async()=>{row.pipelineStatus='PAUSADO';for(const kind of ['ZOOM','ISAPRES'] as const)await assert.rejects(derive(kind),/Reactiva/);assert.equal(writes,0);});
await test('unrelated staff cannot change status or owner',async()=>{const outsider={executiveAccountId:'outsider',isAdmin:false,isPremium:true};await assert.rejects(store.redirectClientFromIsapresPremium('qa',{executiveAccountId:'target'},outsider,'ISAPRES'),/permiso/);await assert.rejects(store.updateClientPipeline('qa',{pipelineStatus:'ENVIADO_ISAPRE'},outsider),/permiso/);assert.equal(writes,0);});
await test('concurrent edits abort handoff before downstream writes or notification',async()=>{row.pipelineClosedRecord=receipt;concurrent=true;await assert.rejects(derive('ISAPRES'));assert.equal(writes,0);assert.equal(quoteWrites,0);assert.equal(notifications,0);});
console.log(`${cases} service transition scenarios passed without real data changes.`);
}main().catch(e=>{console.error(e);process.exitCode=1;});
