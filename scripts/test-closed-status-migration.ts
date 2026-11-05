/** Runs the exact SQL migration in an isolated DEV schema; always rolls back. */
import {PrismaClient} from '@prisma/client';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const url=process.env.DIRECT_URL_DEV;
if(!url || (process.env.DIRECT_URL_PROD && new URL(url).hostname===new URL(process.env.DIRECT_URL_PROD).hostname))throw Error('A distinct DIRECT_URL_DEV is required.');
const db=new PrismaClient({datasources:{db:{url}}});
const statements=readFileSync('prisma/migrations/20261105190000_remove_closed_pipeline_status/migration.sql','utf8').replace(/^--.*$/gm,'').split(/;(?=(?:[^$]*\$migration\$[^$]*\$migration\$)*[^$]*$)/).map(x=>x.trim()).filter(x=>x&&!['BEGIN','COMMIT'].includes(x));
async function main(){
 const values=['PAUSADO','PENDIENTE','NUEVO','CONTACTADO','NO_CONTESTA','EN_SEGUIMIENTO','ENVIADO_ISAPRE','RECEPCIONADO','PERDIDO'];
 for(const includeLegacy of [true,false]){
  const schema='qa_status_'+randomUUID().replaceAll('-','');const rollback=new Error('EXPECTED_ROLLBACK');
  try{await db.$transaction(async tx=>{
   await tx.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
   await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
   const enumValues=includeLegacy?[...values,'CERRADO']:values;
   await tx.$executeRawUnsafe(`CREATE TYPE "ClientPipelineStatus" AS ENUM (${enumValues.map(s=>`'${s}'`).join(',')})`);
   await tx.$executeRawUnsafe(`CREATE TABLE users(id text PRIMARY KEY,pipeline_status "ClientPipelineStatus" DEFAULT 'NUEVO',pipeline_notes text,updated_at timestamp,owner text,profile jsonb)`);
   await tx.$executeRawUnsafe(`INSERT INTO users VALUES('received','RECEPCIONADO','Receipt original','2026-10-31','human','{"receipt":"2026-10-31"}'),('sent','ENVIADO_ISAPRE','Send original','2026-10-30','other','{"annuality":true}')`);
   if(includeLegacy)await tx.$executeRawUnsafe(`INSERT INTO users VALUES('old','CERRADO',E'  Original note\nsecond line  ','2026-10-01','original','{"plan":"saved"}'),('empty','CERRADO',NULL,'2026-10-01','second','{}')`);
   const columns='id,pipeline_status::text AS pipeline_status,pipeline_notes,updated_at,owner,profile';
   const before:any[]=await tx.$queryRawUnsafe(`SELECT ${columns} FROM users ORDER BY id`);
   for(const sql of statements)await tx.$executeRawUnsafe(sql);
   const after:any[]=await tx.$queryRawUnsafe(`SELECT ${columns} FROM users ORDER BY id`);
   assert.equal(before.length,after.length);
   for(const old of before){const now=after.find(r=>r.id===old.id)!;if(old.pipeline_status==='CERRADO'){
    assert.equal(now.pipeline_status,'ENVIADO_ISAPRE');assert.equal(now.owner,old.owner);assert.deepEqual(now.profile,old.profile);
    if(old.pipeline_notes)assert.ok(now.pipeline_notes.startsWith(old.pipeline_notes+'\n'));
    assert.match(now.pipeline_notes,/Confirmar con el cliente/);assert.match(now.pipeline_notes,/recepcionado.*pendiente de cierre/);
   }else assert.deepEqual(now,old);}
   const enums:any[]=await tx.$queryRawUnsafe(`SELECT enumlabel FROM pg_enum WHERE enumtypid='"ClientPipelineStatus"'::regtype ORDER BY enumsortorder`);
   assert.deepEqual(enums.map(x=>x.enumlabel),values);
   await tx.$executeRawUnsafe(`INSERT INTO users(id) VALUES('default')`);
   assert.equal((await tx.$queryRawUnsafe<any[]>(`SELECT pipeline_status::text AS pipeline_status FROM users WHERE id='default'`))[0].pipeline_status,'NUEVO');
   for(const sql of statements)await tx.$executeRawUnsafe(sql);
   assert.deepEqual(await tx.$queryRawUnsafe(`SELECT ${columns} FROM users WHERE id<>'default' ORDER BY id`),after,'Rerun must not add duplicate notes');
   throw rollback;
  },{timeout:30000});}catch(e){if(e!==rollback)throw e;}
  const schemas:any[]=await db.$queryRaw`SELECT schema_name FROM information_schema.schemata WHERE schema_name=${schema}`;
  assert.equal(schemas.length,0,'Fixture schema must be rolled back');
  console.log(`OK SQL migration: ${includeLegacy?'legacy rows converted with note':'no legacy rows; production-like enum'}, fields preserved, repeat safe, fixture rolled back.`);
 }
}main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>db.$disconnect());
