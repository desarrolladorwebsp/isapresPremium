/** Executes actual modules against an in-memory adapter: no DB, webhooks or emails. */
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { ApiError } from "../lib/api/api-error";
import * as policy from "../lib/client-pipeline/assignment-policy";
import type * as Assignment from "../lib/api/lead-assignment";
import type * as Registration from "../lib/clients/register-lead-client";
import type * as Quotes from "../lib/api/quote-store";
import type * as Users from "../lib/api/user-store";
import type * as Pipeline from "../lib/api/client-pipeline-store";
import type * as Sendpulse from "../lib/sendpulse/sync-client";
import type * as Route from "../app/api/executive/clients/distribute/route";

function load<T>(file: string, mocks: Record<string, unknown>, expose=""): T {
  const filename = path.resolve(file), localRequire = createRequire(filename), loaded = { exports:{} };
  const compiled = ts.transpileModule(readFileSync(filename,"utf8")+expose,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(compiled,{module:loaded,exports:loaded.exports,console,process,URL,Request,Response,
    require:(id:string)=>id in mocks?mocks[id]:localRequire(id)},{filename});
  return loaded.exports as T;
}
type Row = {id:string;email:string;role:string;assignedExecutiveId:string|null;createdAt:Date;updatedAt:Date} & Record<string,unknown>;
const clients:Row[]=[],quotes:Record<string,unknown>[]=[],emails:unknown[]=[];
let writes=0, poolReads=0, quoteWrites=0, auth=true, distributionCalls=0;
const row = (id:string,owner:string|null=null):Row=>({id,email:`${id}@example.invalid`,fullName:id,phone:"+56912345678",role:"CLIENT",assignedExecutiveId:owner,createdAt:new Date(),updatedAt:new Date(),clientOrigin:"MANUAL"});
const db={
  staffAccount:{
    findMany:async()=>{poolReads++;return [{id:"human",fullName:"Human",email:"human@example.invalid",role:"ADMIN",executiveKind:null,active:true,autoAssignmentEnabled:true}];},
    findFirst:async()=>({id:"human",role:"ADMIN",active:true,executiveKind:null}),
  },
  user:{
    findUnique:async({where}:{where:Record<string,string>})=>{const found=clients.find(c=>Object.entries(where).every(([k,v])=>c[k]===v));return found?{...found}:null;},
    findFirst:async()=>null,
    findMany:async()=>{throw Error("Distribution must not scan clients");},
    groupBy:async()=>{throw Error("Round robin must not scan portfolio");},
    create:async({data}:{data:Record<string,unknown>})=>{writes++;const created={...row(`created-${clients.length}`),...data} as Row;clients.push(created);return {...created};},
    update:async({where,data}:{where:{id:string};data:Record<string,unknown>})=>{writes++;const target=clients.find(c=>c.id===where.id)!;Object.assign(target,data);return {...target};},
    updateMany:async()=>{throw Error("Automatic owner write attempted");},
    count:async()=>clients.filter(c=>!c.assignedExecutiveId).length,
  },
  quote:{
    findMany:async()=>{throw Error("Distribution must not scan quotes");},
    create:async({data}:{data:Record<string,unknown>})=>{const q={...data,id:`quote-${quotes.length}`,status:"NEW",createdAt:new Date(),updatedAt:new Date()};quotes.push(q);return q;},
    updateMany:async()=>{quoteWrites++;return {count:0};},
  },
};
const mocks={
  "@/lib/client-pipeline/assignment-policy":policy,
  "@/lib/prisma":{prisma:db},
  "@/lib/email/notify-executive-client-assignment":{queueExecutiveClientAssignmentEmail:(input:unknown)=>emails.push(input)},
};
const assignment=load<typeof Assignment>("lib/api/lead-assignment.ts",mocks);
const registration=load<typeof Registration>("lib/clients/register-lead-client.ts",{...mocks,"@/lib/api/lead-assignment":assignment});
const users=load<typeof Users>("lib/api/user-store.ts",mocks);
const quoteStore=load<typeof Quotes>("lib/api/quote-store.ts",{...mocks,
  "@/lib/api/lead-assignment":assignment,
  "./user-store":{...users,upsertUserByEmail:async(input:{email:string})=>clients.find(c=>c.email===input.email)},
  "@/lib/api/quote-activity-store":{logQuoteActivity:async()=>{},resolveExecutiveName:async()=>"Human",formatStatusLabel:()=>"Nuevo"},
});
let cases=0;
async function test(name:string,run:()=>Promise<void>|void){await run();cases++;console.log(`OK ${name}`);}
async function main(){
  await test("global policy is paused, engine and saved preferences retained",()=>assert.equal(policy.AUTOMATIC_CLIENT_ASSIGNMENT_ENABLED,false));
  clients.push(row("owned","human"),row("unassigned"));
  await test("existing human owner returned without writes or emails",async()=>{const before=JSON.stringify(clients);assert.equal(await assignment.autoAssignClientExecutive("owned"),"human");assert.equal(JSON.stringify(clients),before);assert.equal(writes,0);assert.equal(emails.length,0);});
  await test("inbound and every kind leave new clients unassigned",async()=>{for(const executiveKind of ["ISAPRES_PREMIUM","ZOOM","ISAPRES"] as const) assert.equal(await assignment.autoAssignClientExecutive("unassigned",{inboundPool:true,executiveKind}),null);assert.equal(writes,0);assert.equal(poolReads,0);});
  await test("direct round robin cannot bypass pause",async()=>assert.equal(await assignment.pickExecutiveRoundRobin(),null));
  await test("automatic eligibility empty; manual destinations still available",async()=>{assert.equal((await assignment.listEligibleExecutivesForAssignment({automatic:true})).length,0);assert.equal((await assignment.listEligibleExecutivesForAssignment({inboundPool:true})).length,0);assert.equal((await assignment.listEligibleExecutivesForAssignment({withProfile:true}))[0].id,"human");});
  await test("bulk clients blocked before any portfolio read",async()=>assert.rejects(()=>assignment.distributeUnassignedClients(),(e:unknown)=>e instanceof ApiError&&e.status===409&&e.code==="AUTOMATIC_ASSIGNMENT_PAUSED"));
  await test("bulk prospects blocked before any quote read",async()=>assert.rejects(()=>quoteStore.distributeUnassignedQuotes(),(e:unknown)=>e instanceof ApiError&&e.code==="AUTOMATIC_ASSIGNMENT_PAUSED"));
  const input={fullName:"QA Registro",email:"registration@example.invalid",phone:"+56912345678",autoAssign:true};
  await test("form/API lead registers even when requesting automation",async()=>{const result=await registration.registerLeadClient(input);assert(result.created);assert.equal(result.assignedExecutiveId,null);});
  await test("existing form lead preserves human owner",async()=>{const owner=clients[0].assignedExecutiveId;const result=await registration.registerLeadClient({...input,email:clients[0].email});assert.equal(result.assignedExecutiveId,owner);assert.equal(clients[0].assignedExecutiveId,owner);});
  await test("public quote for unassigned client keeps null owner",async()=>{const q=await quoteStore.createQuote({fullName:"QA",email:clients[1].email,phone:"+56912345678"});assert.equal(q.executiveAccountId,null);assert.equal(clients[1].assignedExecutiveId,null);});
  await test("public quote for owned client preserves owner",async()=>{const q=await quoteStore.createQuote({fullName:"QA",email:clients[0].email,phone:"+56912345678"});assert.equal(q.executiveAccountId,"human");assert.equal(clients[0].assignedExecutiveId,"human");});
  await test("manual assignment still validates and saves requested human",async()=>{const result=await users.assignUserToExecutive("unassigned","human");assert.equal(result.assignedExecutiveId,"human");assert.equal(clients[1].assignedExecutiveId,"human");});
  const pipeline=load<typeof Pipeline>("lib/api/client-pipeline-store.ts",{...mocks,"@/lib/api/user-store":users,"@/lib/api/lead-assignment":assignment});
  await test("automatic Premium handoff rejects without changing owner/history",async()=>{const before=JSON.stringify(clients);await assert.rejects(()=>pipeline.redirectClientToIsapresPremium("owned",{autoAssign:true,contactMethod:"ZOOM",appointmentAt:"2027-01-01T15:00:00Z"},{executiveAccountId:"human",isAdmin:true,canRunZoomWorkflow:true}),(e:unknown)=>e instanceof ApiError&&e.code==="AUTOMATIC_ASSIGNMENT_PAUSED");assert.equal(JSON.stringify(clients),before);});
  for(const kind of ["ZOOM","ISAPRES"] as const) await test(`automatic ${kind} handoff rejects without changes`,async()=>{const before=JSON.stringify(clients);await assert.rejects(()=>pipeline.redirectClientFromIsapresPremium("owned",{autoAssign:true},{executiveAccountId:"human",isAdmin:true,isPremium:true},kind),(e:unknown)=>e instanceof ApiError&&e.code==="AUTOMATIC_ASSIGNMENT_PAUSED");assert.equal(JSON.stringify(clients),before);});
  const sendpulse=load<typeof Sendpulse>("lib/sendpulse/sync-client.ts",{...mocks,
    "@/lib/sendpulse/remote":{fetchSendpulseSnapshot:async()=>({contact:null,chat:null,contactRead:false}),tagSendpulseContactInCrm:async()=>({ok:true})},
  });
  await test("SendPulse contact creates without automatic owner",async()=>{const result=await sendpulse.syncSendpulseClient({contactId:"qa-test",botPhone:"+56911111111",webhookName:"QA Sendpulse",webhookPhone:"+56922222222",triggerKey:null,apiKey:null,writeHistory:false});assert(result.ok);assert.equal(clients.find(c=>c.id===result.clientId)?.assignedExecutiveId,null);});
  await test("SendPulse update preserves an existing human owner",async()=>{clients[0].sendpulseContactId="qa-owned";const result=await sendpulse.syncSendpulseClient({contactId:"qa-owned",botPhone:"+56911111111",webhookName:"QA Existente",webhookPhone:"+56922222222",triggerKey:null,apiKey:null,writeHistory:false});assert(result.ok);assert.equal(clients[0].assignedExecutiveId,"human");});
  await test("no automatic emails; only manual assignment notification",()=>{assert.equal(emails.length,1);assert.equal((emails[0] as {assignmentType:string}).assignmentType,"manual");});
  const routeMocks={...mocks,"@/lib/auth/require-auth":{requireAdminSession:async()=>{if(!auth)throw new ApiError("Unauthorized",401);return {user:{id:"admin",fullName:"Admin"}};}},
    "@/lib/api/lead-assignment":{distributeUnassignedClients:async()=>{distributionCalls++;throw Error("Must not run");}},
    "@/lib/api/quote-store":{distributeUnassignedQuotes:async()=>{distributionCalls++;throw Error("Must not run");}},
  };
  for(const file of ["app/api/executive/clients/distribute/route.ts","app/api/quotes/distribute/route.ts"]){
    const route=load<typeof Route>(file,routeMocks);
    await test(`${file}: authenticated distribution refused`,async()=>{auth=true;const response=await route.POST(new Request("http://localhost/api",{method:"POST"}));assert.equal(response.status,409);assert.equal((await response.json()).code,"AUTOMATIC_ASSIGNMENT_PAUSED");});
    await test(`${file}: authentication still required`,async()=>{auth=false;assert.equal((await route.POST(new Request("http://localhost/api",{method:"POST"}))).status,401);});
  }
  await test("staff UI shows global pause while retaining saved preference",()=>{
    const {UsersDirectoryTable}=load<{UsersDirectoryTable:ComponentType<Record<string,unknown>>}>("components/admin/users-panel.tsx",mocks,"\nexport { UsersDirectoryTable };\n");
    const account={id:"human",fullName:"Human",email:"human@example.invalid",realm:"admin",active:true,onboardingCompleted:true,executiveKind:null,autoAssignmentEnabled:true,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    const noop=()=>{};
    const html=renderToStaticMarkup(createElement(UsersDirectoryTable,{rows:[{kind:"account",account,sortAt:account.createdAt}],executivesOnly:false,canManage:true,assignmentCounts:{},assignmentSaving:false,sortProps:()=>({}),onResendInvite:noop,onCancelInvite:noop,onChangeRole:noop,onToggleAssignments:noop,onToggleAutoAssignments:noop,onToggleActive:noop}));
    assert.match(html,/Asignación automática.*en pausa/);assert.match(html,/type="checkbox" disabled=""/);assert.match(html,/checked=""/);assert.equal(account.autoAssignmentEnabled,true);
  });
  assert.equal(distributionCalls,0);assert.equal(clients[0].assignedExecutiveId,"human");assert.equal(quoteWrites,2);
  console.log(`${cases} manual-mode scenarios passed. No real database, webhook, or email calls.`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
