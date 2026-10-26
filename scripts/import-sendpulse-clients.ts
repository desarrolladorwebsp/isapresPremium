/**
 * Importación auditada, sin emails ni llamadas a SendPulse.
 * Por defecto solo prepara el lote. El manifiesto exige todas las exportaciones corregidas.
 * node scripts/with-db-env.mjs -- node --import tsx scripts/import-sendpulse-clients.ts MANIFEST.json
 * Escritura: añadir --apply --plan-sha SHA_PREVIAMENTE_REVISADO y guards de producción.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { hashPassword } from "../lib/auth/password";
import { prisma } from "../lib/prisma";
import { assertSafeForDestructiveCommand, resolveDatabaseTargets } from "../lib/db/resolve-database-env.mjs";
import { prepareSendpulseImport, type SendpulseImportBot, type SendpulseImportRow } from "../lib/sendpulse/bulk-import";
import type { Prisma } from "@prisma/client";

interface Manifest { batch: string; rowsFile: string; reportDir: string; complete: boolean; bots: SendpulseImportBot[] }
const sha = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
async function main() {
  const manifestPath=process.argv[2];
  if(!manifestPath || manifestPath.startsWith("--")) throw new Error("Indica un manifiesto de importación JSON.");
  const manifest:Manifest=JSON.parse(await readFile(manifestPath,"utf8"));
  if(!manifest.complete || manifest.bots.some(b=>!b.ready)) throw new Error("Lote incompleto: falta corregir y confirmar las exportaciones de todos los bots.");
  const rowsBytes=await readFile(path.resolve(path.dirname(manifestPath),manifest.rowsFile));
  const rows:SendpulseImportRow[]=JSON.parse(rowsBytes.toString("utf8"));
  const reportDir=path.resolve(path.dirname(manifestPath),manifest.reportDir);
  await mkdir(reportDir,{recursive:true,mode:0o700});
  const apply=process.argv.includes("--apply");
  const existing=await prisma.user.findMany({where:{role:"CLIENT"},orderBy:{id:"asc"},select:{id:true,email:true,phone:true,sendpulseContactId:true,assignedExecutiveId:true,updatedAt:true}});
  const plan=prepareSendpulseImport({rows,bots:manifest.bots,existing:existing.map(c=>({...c,updatedAt:c.updatedAt.toISOString()}))});
  const sourceSha=sha(rowsBytes);
  const planSha=sha(JSON.stringify({batch:manifest.batch,sourceSha,plan}));
  const summary={mode:apply?"apply":"dry-run",batch:manifest.batch,sourceSha,planSha,sourceRows:plan.sourceRows,distinctContacts:plan.decisions.length+plan.review.length,create:plan.decisions.filter(d=>!d.existing).length,update:plan.decisions.filter(d=>d.existing).length,review:plan.review.length,bots:plan.bots.map(b=>({label:b.label,phone:b.phone,source:b.sourceCount,assigned:b.assignedCount}))};
  await writeFile(path.join(reportDir,"plan.json"),JSON.stringify({summary,plan},null,2)+"\n",{mode:0o600});
  console.log(JSON.stringify(summary));
  if(!apply)return;
  assertSafeForDestructiveCommand();
  const targets=resolveDatabaseTargets();
  if(!targets.useProd)throw new Error("Esta importación requiere production explícito.");
  const expected=process.argv[process.argv.indexOf("--plan-sha")+1];
  if(!process.argv.includes("--plan-sha") || expected!==planSha)throw new Error("El SHA del plan no coincide. Genera y revisa de nuevo el dry-run.");
  const snapshot=await prisma.user.findMany({where:{id:{in:plan.decisions.flatMap(d=>d.existing?[d.existing.id]:[])}},include:{sendpulseImport:true}});
  await writeFile(path.join(reportDir,`clientes-antes-${Date.now()}.json`),JSON.stringify(snapshot,null,2)+"\n",{mode:0o600});
  const botInputs=await Promise.all(plan.bots.map(async bot=>({...bot,passwordHash:await hashPassword(randomBytes(48).toString("hex"))})));
  const completedAt=new Date();
  const result=await prisma.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(719026, 2610)`;
    const botIds=new Map<string,string>();
    for(const bot of botInputs){
      const email=`bot.${bot.phone.slice(1)}@bots.isaprespremium.cl`;
      const account=await tx.staffAccount.upsert({where:{email},create:{email,phone:bot.phone,fullName:bot.label,role:"BOT",executiveKind:null,passwordHash:bot.passwordHash,active:true,onboardingCompleted:true,autoAssignmentEnabled:false},update:{}});
      if(account.role!=="BOT" || !account.active || account.phone!==bot.phone || account.autoAssignmentEnabled)throw new Error("Una cuenta BOT no coincide con el manifiesto o está deshabilitada.");
      botIds.set(bot.phone,account.id);
    }
    const newIds=new Map(plan.decisions.filter(d=>!d.existing).map(d=>[d.phone,randomUUID()]));
    const createData=plan.decisions.filter(d=>!d.existing).map(d=>({id:newIds.get(d.phone)!,email:d.email,fullName:d.fullName,phone:d.phone,role:"CLIENT" as const,active:true,clientOrigin:"SENDPULSE" as const,sendpulseContactId:d.contactId,sendpulseBotPhone:d.botPhone,assignedExecutiveId:botIds.get(d.botPhone)!}));
    if(createData.length)await tx.user.createMany({data:createData});
    const updateData=plan.decisions.filter(d=>d.existing).map(d=>({id:d.existing!.id,expectedUpdatedAt:d.existing!.updatedAt,botId:botIds.get(d.botPhone)!,botPhone:d.botPhone,contactId:d.contactId}));
    let updated=0;
    if(updateData.length){
      updated=await tx.$executeRaw`
        UPDATE users AS u
        SET assigned_executive_id = incoming."botId",
            sendpulse_bot_phone = incoming."botPhone",
            sendpulse_contact_id = COALESCE(NULLIF(u.sendpulse_contact_id, ''), incoming."contactId"),
            updated_at = CURRENT_TIMESTAMP
        FROM jsonb_to_recordset(${JSON.stringify(updateData)}::jsonb)
          AS incoming(id text, "expectedUpdatedAt" text, "botId" text, "botPhone" text, "contactId" text)
        WHERE u.id = incoming.id AND u.updated_at = incoming."expectedUpdatedAt"::timestamp
      `;
      if(updated!==updateData.length)throw new Error("Un cliente cambió durante la preparación; se revierte la transacción completa.");
    }
    const importedIds:string[]=[];
    const firstImportAt=new Map(snapshot.map(c=>[c.id,c.sendpulseImport?.createdAt]));
    const importData=[];
    for(const d of plan.decisions){
      const userId=d.existing?.id??newIds.get(d.phone)!;
      importedIds.push(userId);
      importData.push({userId,sourceBotAccountId:botIds.get(d.botPhone)!,sourceContactIds:d.contactIds,sourceBatch:manifest.batch,createdAt:firstImportAt.get(userId)??completedAt,rawData:{policy:"largest-source-bot-first",sourceRows:d.sourceRows,sourceSha,planSha,importedAt:completedAt.toISOString()} as unknown as Prisma.InputJsonValue});
    }
    await tx.sendpulseClientImport.deleteMany({where:{userId:{in:importedIds}}});
    await tx.sendpulseClientImport.createMany({data:importData});
    const persisted=await tx.user.findMany({where:{id:{in:importedIds}},select:{id:true,phone:true,assignedExecutiveId:true}});
    if(persisted.length!==plan.decisions.length)throw new Error("Conteo de contactos importados incompleto.");
    const persistedById=new Map(persisted.map(p=>[p.id,p]));
    for(const d of plan.decisions){
      const id=d.existing?.id??newIds.get(d.phone)!;
      const saved=persistedById.get(id);
      if(!saved || saved.assignedExecutiveId!==botIds.get(d.botPhone))throw new Error("Un contacto quedó en una cartera incorrecta.");
    }
    return {batch:manifest.batch,planSha,created:createData.length,updated,quarantined:plan.review.length,botAccounts:[...botIds],importedIds,completedAt:completedAt.toISOString()};
  },{timeout:240000,isolationLevel:"Serializable"});
  await writeFile(path.join(reportDir,"resultado.json"),JSON.stringify(result,null,2)+"\n",{mode:0o600});
  const after=await prisma.user.count({where:{id:{in:result.importedIds}}});
  if(after!==plan.decisions.length)throw new Error("La verificación posterior de producción falló; conserva el informe de resultado.");
  console.log(JSON.stringify({created:result.created,updated:result.updated,quarantined:result.quarantined,verified:after}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>prisma.$disconnect());
