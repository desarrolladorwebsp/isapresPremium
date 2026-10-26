/** SQL real de importación sobre PostgreSQL embebido, sin conexión de red. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {SENDPULSE_IMPORT_EXISTING_SQL as sql} from '../lib/sendpulse/bulk-import-sql.ts';
const require=createRequire(import.meta.url);
const {PGlite}=require(process.env.SENDPULSE_PGLITE_MODULE??'@electric-sql/pglite');
const db=new PGlite();
try{
  await db.exec(`CREATE TABLE staff_accounts(id text PRIMARY KEY,role text);
    CREATE TABLE users(id text PRIMARY KEY,role text,assigned_executive_id text,updated_at timestamp(3),sendpulse_bot_phone text,sendpulse_contact_id text,notes text);
    INSERT INTO staff_accounts VALUES ('exec','EXECUTIVE'),('admin','ADMIN'),('bot-old','BOT'),('bot-new','BOT');
    INSERT INTO users VALUES
    ('exec-client','CLIENT','exec','2026-10-26 10:00:00',NULL,NULL,'conservar'),
    ('admin-client','CLIENT','admin','2026-10-26 10:00:00',NULL,NULL,'conservar'),
    ('bot-client','CLIENT','bot-old','2026-10-26 10:00:00',NULL,NULL,'conservar'),
    ('unassigned','CLIENT',NULL,'2026-10-26 10:00:00',NULL,NULL,'conservar'),
    ('unknown-role','CLIENT','not-loaded','2026-10-26 10:00:00',NULL,NULL,'conservar');`);
  const patch=(id,owner,preserveOwner=false)=>({id,expectedOwnerId:owner,expectedUpdatedAt:'2026-10-26T10:00:00.000Z',preserveOwner,botId:'bot-new',botPhone:'+56980000001',contactId:`contact-${id}`});
  const changes=[patch('exec-client','exec'),patch('admin-client','admin'),patch('bot-client','bot-old'),patch('unassigned',null),patch('unknown-role','not-loaded')];
  assert.equal((await db.query(sql,[JSON.stringify(changes)])).affectedRows,5);
  const saved=new Map((await db.query('SELECT * FROM users')).rows.map(u=>[u.id,u]));
  assert.equal(saved.get('exec-client').assigned_executive_id,'exec');
  assert.equal(saved.get('admin-client').assigned_executive_id,'admin');
  assert.equal(saved.get('unknown-role').assigned_executive_id,'not-loaded');
  assert.equal(saved.get('bot-client').assigned_executive_id,'bot-new');
  assert.equal(saved.get('unassigned').assigned_executive_id,'bot-new');
  assert.equal(saved.get('exec-client').sendpulse_bot_phone,'+56980000001');
  assert.ok([...saved.values()].every(u=>u.notes==='conservar'));
  await db.exec(`UPDATE users SET assigned_executive_id='exec',updated_at='2026-10-26 10:00:00' WHERE id='bot-client'`);
  assert.equal((await db.query(sql,[JSON.stringify([patch('bot-client','bot-old')])])).affectedRows,0);
  await db.exec(`UPDATE users SET assigned_executive_id='bot-old',updated_at='2026-10-26 10:01:00' WHERE id='bot-client'`);
  assert.equal((await db.query(sql,[JSON.stringify([patch('bot-client','bot-old')])])).affectedRows,0);
  await db.exec(`UPDATE users SET assigned_executive_id='bot-old',updated_at='2026-10-26 10:00:00' WHERE id='bot-client'`);
  await assert.rejects(()=>db.transaction(async tx=>{await tx.query(sql,[JSON.stringify([patch('bot-client','bot-old')])]);throw new Error('Probar reversión atómica.');}));
  assert.equal((await db.query(`SELECT assigned_executive_id FROM users WHERE id='bot-client'`)).rows[0].assigned_executive_id,'bot-old');
  await db.query(sql,[JSON.stringify([patch('bot-client','bot-old',true)])]);
  assert.equal((await db.query(`SELECT assigned_executive_id FROM users WHERE id='bot-client'`)).rows[0].assigned_executive_id,'bot-old');
  console.log('10 comprobaciones SQL superadas: ejecutivos, administradores, responsables desconocidos, bots, no asignados, respaldo, otros campos, concurrencia y rollback.');
}finally{await db.close();}
