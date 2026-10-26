import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { ApiError } from "../lib/api/api-error";
import * as roles from "../lib/auth/staff-role";
import { prepareSendpulseImport, type SendpulseImportBot, type SendpulseImportRow } from "../lib/sendpulse/bulk-import";
import type * as Accounts from "../lib/auth/account-store";
import type * as Reset from "../lib/auth/password-reset-store";
import type * as UserStore from "../lib/api/user-store";
import type * as Route from "../app/api/admin/accounts/route";

function load<T>(file:string,mocks:Record<string,unknown>):T {
  const filename=path.resolve(file), require=createRequire(filename), loaded={exports:{}};
  const js=ts.transpileModule(readFileSync(filename,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  vm.runInNewContext(js,{module:loaded,exports:loaded.exports,console,process,URL,Request,Response,Buffer,require:(id:string)=>id in mocks?mocks[id]:require(id)},{filename});
  return loaded.exports as T;
}
const bot=(sourceFile:string,phone:string):SendpulseImportBot=>({label:sourceFile,phone,sourceFile,ready:true});
const a=bot("principal.xlsx","+56980000001"),b=bot("secundario.xlsx","+56980000002");
const row=(file:string,id:string,phone:string,email?:string):SendpulseImportRow=>({sourceFile:file,sourceRow:2,contactId:id,phoneDigits:phone,raw:{name:`Contacto ficticio ${id}`,phone,direcc_email:email??null}});
let passed=0;
async function test(name:string,run:()=>unknown){await run();passed++;console.log(`✓ ${name}`);}
async function main(){
  await test("BOT tiene etiqueta propia y no obtiene permisos de ninguna sección",()=>{
    assert.equal(roles.staffRoleToRealm("BOT"),"bot");assert.equal(roles.staffRealmToRole("bot"),"BOT");
    assert.equal(roles.getStaffRoleLabel({realm:"bot"}),"Bot");
    assert.equal(roles.isInteractiveStaffRole("BOT"),false);
    assert.deepEqual(roles.getStaffSectionsForAccount({realm:"bot"}),[]);
    assert.equal(roles.staffCanAccessSection({realm:"bot"},"clientes"),false);
  });
  await test("Un mismo teléfono queda una vez en el bot con mayor cartera de origen",()=>{
    const source=[row(a.sourceFile,"a1","56910000001"),row(a.sourceFile,"a2","56910000002"),row(b.sourceFile,"b1","56910000001")];
    const p=prepareSendpulseImport({rows:source,bots:[a,b],existing:[]});
    assert.equal(p.decisions.length,2);assert.equal(p.decisions[0].botPhone,a.phone);assert.equal(p.decisions[0].sourceRows.length,2);assert.deepEqual(p.bots.map(b=>b.assignedCount),[2,0]);
  });
  await test("La decisión no depende del orden de archivos y resuelve empates de forma estable",()=>{
    const source=[row(a.sourceFile,"a1","56910000001"),row(b.sourceFile,"b1","56910000001")];
    const first=prepareSendpulseImport({rows:source,bots:[a,b],existing:[]}),second=prepareSendpulseImport({rows:[...source].reverse(),bots:[b,a],existing:[]});
    assert.equal(first.decisions[0].botPhone,second.decisions[0].botPhone);
  });
  await test("No se procesa un manifiesto incompleto ni la misma exportación en dos bots",()=>{
    assert.throws(()=>prepareSendpulseImport({rows:[],bots:[{...a,ready:false}],existing:[]}),/Faltan exportaciones/);
    const same=row(a.sourceFile,"shared","56910000001");
    assert.throws(()=>prepareSendpulseImport({rows:[same,{...same,sourceFile:b.sourceFile}],bots:[a,b],existing:[]}),/misma exportación/);
  });
  const existing={id:"client-real-fixture",email:"fixture@example.test",phone:"+56 9 1000 0001",sendpulseContactId:null,assignedExecutiveId:"executive-fixture",updatedAt:"2026-10-26T15:00:00Z"};
  await test("Reutiliza la ficha existente; conserva responsable previo para auditar la reasignación",()=>{
    const p=prepareSendpulseImport({rows:[row(a.sourceFile,"a1","56910000001")],bots:[a],existing:[existing]});
    assert.equal(p.decisions.length,1);assert.equal(p.decisions[0].existing?.id,existing.id);assert.equal(p.decisions[0].existing?.assignedExecutiveId,"executive-fixture");
  });
  await test("Fichas históricas ambiguas y correos de otro cliente quedan en revisión",()=>{
    const source=[row(a.sourceFile,"a1","56910000001")];
    const p=prepareSendpulseImport({rows:source,bots:[a],existing:[existing,{...existing,id:"another-client"}]});
    assert.equal(p.decisions.length,0);assert.equal(p.review.length,1);
    const email=prepareSendpulseImport({rows:[row(a.sourceFile,"a2","56910000002",existing.email)],bots:[a],existing:[existing]});
    assert.equal(email.decisions.length,0);assert.equal(email.review.length,1);
  });
  await test("Un correo compartido no fusiona personas distintas y la fuente completa se conserva",()=>{
    const r1=row(a.sourceFile,"a1","56910000001","shared@example.test"),r2=row(a.sourceFile,"a2","56910000002","shared@example.test");
    r1.raw.edad_titular="42";r1.raw.tags="texto de fuente sin ejecutar";
    const p=prepareSendpulseImport({rows:[r1,r2],bots:[a],existing:[]});
    assert.equal(p.decisions.length,2);assert.notEqual(p.decisions[0].email,p.decisions[1].email);assert.equal(p.decisions[0].sourceRows[0].raw.edad_titular,"42");
  });
  await test("Prepara 13.000 registros y 11.000 clientes distintos sin duplicarlos",()=>{
    const c=bot("tercero.xlsx","+56980000003"),source:SendpulseImportRow[]=[];
    for(const [bot,start,count] of [[a,0,6000],[b,5000,4000],[c,8000,3000]] as const){
      for(let i=0;i<count;i++)source.push(row(bot.sourceFile,`${bot.sourceFile}-${i}`,`569${10000000+start+i}`));
    }
    const p=prepareSendpulseImport({rows:source,bots:[a,b,c],existing:[]});
    assert.equal(p.sourceRows,13000);assert.equal(p.decisions.length,11000);assert.equal(new Set(p.decisions.map(d=>d.phone)).size,11000);assert.deepEqual(p.bots.map(b=>b.assignedCount),[6000,3000,2000]);
  });
  await test("Reutiliza un celular chileno guardado sin +56 en lugar de duplicarlo",()=>{
    const p=prepareSendpulseImport({rows:[row(a.sourceFile,"sp-local","56910000001")],bots:[a],existing:[{id:"local-client",email:"local@example.test",phone:"910000001",sendpulseContactId:null,assignedExecutiveId:"exec",updatedAt:"2026-10-26T12:00:00.000Z"}]});
    assert.equal(p.decisions.length,1);assert.equal(p.decisions[0].existing?.id,"local-client");assert.equal(p.decisions[0].phone,"+56910000001");assert.equal(p.review.length,0);
  });
  let sessions=0,writes=0,verifiedPasswords=0,resetTokens=0;
  const fixture={id:"bot-fixture",email:"bot.fixture@bots.isaprespremium.cl",fullName:"Bot ficticio",role:"BOT",phone:"+56980000001",executiveKind:null,active:true,onboardingCompleted:true,autoAssignmentEnabled:false,assignmentsSuspended:false,createdAt:new Date(),lastLoginAt:null,subscriptionExpiresAt:null,passwordHash:"fixture-only"};
  const db={staffAccount:{findUnique:async()=>fixture,update:async()=>{writes++;return fixture;}},passwordResetToken:{updateMany:async()=>{resetTokens++;},create:async()=>{resetTokens++;}}};
  const passwords={normalizeEmail:(s:string)=>s.trim().toLowerCase(),validatePasswordStrength:()=>null,verifyPassword:async()=>{verifiedPasswords++;return true;},hashPassword:async()=>"fixture-hash"};
  const accounts=load<typeof Accounts>("lib/auth/account-store.ts",{"@/lib/prisma":{prisma:db},"@/lib/auth/password":passwords,"@/lib/auth/session":{issueSession:async()=>{sessions++;}}});
  await test("BOT no autentica aunque la contraseña se verificara como correcta",async()=>{
    await assert.rejects(()=>accounts.authenticateStaff({email:fixture.email,password:"ignored-fixture"}),e=>e instanceof ApiError && e.status===401);
    assert.equal(sessions,0);assert.equal(verifiedPasswords,0);assert.equal(writes,0);
  });
  await test("No puede activarse el reparto automático ni cambiar contraseña de un BOT",async()=>{
    await assert.rejects(()=>accounts.updateStaffAccount("bot",fixture.id,{autoAssignmentEnabled:true}),/cartera BOT/);
    await assert.rejects(()=>accounts.changeStaffPassword("bot",fixture.id,"old-fixture","new-fixture"),/inicio de sesión/);
    assert.equal(writes,0);assert.equal(sessions,0);
  });
  const reset=load<typeof Reset>("lib/auth/password-reset-store.ts",{"@/lib/prisma":{prisma:db},"@/lib/auth/password":passwords});
  await test("La recuperación no crea tokens ni correos para cuentas BOT",async()=>{
    assert.equal(await reset.createPasswordResetTokenForEmail(fixture.email),null);assert.equal(resetTokens,0);
  });
  let authorized=true,botCreated=0,mailSent=0;
  const route=load<typeof Route>("app/api/admin/accounts/route.ts",{
    "@/lib/auth/require-auth":{requireAdminSession:async()=>{if(!authorized)throw new ApiError("Unauthorized",401);return{session:{sub:"admin-fixture"}};}},
    "@/lib/auth/account-store":{createBotStaffAccount:async()=>{botCreated++;return {...fixture,realm:"bot"};}},
    "@/lib/email/send-staff-invite":{sendStaffActivationEmail:async()=>{mailSent++;}},
  });
  const request=()=>new Request("https://example.test/api/admin/accounts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({realm:"bot",fullName:"Bot ficticio",phone:"+56980000001"})});
  await test("Solo un administrador puede crear BOT y la ruta no manda invitaciones",async()=>{
    assert.equal((await route.POST(request())).status,201);assert.equal(botCreated,1);assert.equal(mailSent,0);
    authorized=false;assert.equal((await route.POST(request())).status,401);assert.equal(botCreated,1);assert.equal(mailSent,0);
  });
  await test("Asignar una cartera BOT conserva las cotizaciones y no envía avisos",async()=>{
    let quoteWrites=0,assignmentEmails=0;
    const client={id:"client-fixture",role:"CLIENT",fullName:"Cliente ficticio",email:"client@example.test",assignedExecutiveId:"old-exec",createdAt:new Date(),updatedAt:new Date()};
    const users=load<typeof UserStore>("lib/api/user-store.ts",{
      "@/lib/prisma":{prisma:{staffAccount:{findFirst:async({where}:{where:{role:{in:string[]}}})=>where.role.in.includes("BOT")?{id:fixture.id,role:"BOT",executiveKind:null}:null},user:{findUnique:async()=>client,update:async()=>({...client,assignedExecutiveId:fixture.id})},quote:{updateMany:async()=>{quoteWrites++;}}}},
      "@/lib/email/notify-executive-client-assignment":{queueExecutiveClientAssignmentEmail:()=>{assignmentEmails++;}},
    });
    await assert.rejects(()=>users.assertAssignableExecutive(fixture.id),/no existe/);
    const assigned=await users.assignUserToExecutive(client.id,fixture.id,{allowBot:true});
    assert.equal(assigned.assignedExecutiveId,fixture.id);assert.equal(quoteWrites,0);assert.equal(assignmentEmails,0);
  });
  console.log(`${passed} comprobaciones aisladas superadas; sin escrituras reales, emails ni llamadas a SendPulse.`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
