import { createHash } from "node:crypto";
import { normalizeSendpulseContactPhone } from "@/lib/sendpulse/contract";

export interface SendpulseImportRow {
  sourceFile: string;
  sourceRow: number;
  contactId: string;
  phoneDigits: string;
  raw: Record<string, string | number | boolean | null>;
}

export interface SendpulseImportBot {
  label: string;
  phone: string;
  sourceFile: string;
  ready: boolean;
}

export interface SendpulseExistingClient {
  id: string;
  email: string;
  phone: string | null;
  sendpulseContactId: string | null;
  assignedExecutiveId: string | null;
  updatedAt: string;
}

export interface SendpulseImportDecision {
  phone: string;
  contactId: string;
  contactIds: string[];
  fullName: string;
  email: string;
  botPhone: string;
  botLabel: string;
  sourceRows: SendpulseImportRow[];
  existing: SendpulseExistingClient | null;
}

export interface SendpulseImportPlan {
  decisions: SendpulseImportDecision[];
  review: Array<{ phone: string; reason: string; existingIds?: string[] }>;
  bots: Array<SendpulseImportBot & { sourceCount: number; assignedCount: number }>;
  sourceRows: number;
}

const text = (v: unknown) => String(v ?? "").trim();
const emailFrom = (row: SendpulseImportRow) =>
  ["direcc_email", "email_cliente", "email_cliente2"].map(key => text(row.raw[key]).toLowerCase())
    .find(value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) ?? null;

/** Sin I/O. Una ficha por teléfono/ID; el bot con mayor cartera de origen tiene prioridad. */
export function prepareSendpulseImport(input: {
  rows: SendpulseImportRow[];
  bots: SendpulseImportBot[];
  existing: SendpulseExistingClient[];
}): SendpulseImportPlan {
  if (!input.bots.length || input.bots.some(bot => !bot.ready)) {
    throw new Error("Faltan exportaciones corregidas o confirmadas de los bots. No se calcula una asignación definitiva con un lote incompleto.");
  }
  const bots = input.bots.map(bot => {
    const phone = normalizeSendpulseContactPhone(bot.phone);
    if (!phone) throw new Error(`Teléfono de bot inválido: ${bot.label}`);
    return { ...bot, phone, sourceCount: 0, assignedCount: 0 };
  });
  if (new Set(bots.map(b=>b.phone)).size !== bots.length || new Set(bots.map(b=>b.sourceFile)).size !== bots.length) {
    throw new Error("Un teléfono o archivo está asociado a más de un bot.");
  }
  const byFile = new Map(bots.map(bot => [bot.sourceFile, bot]));
  const groups = new Map<string, SendpulseImportRow[]>();
  const files = new Map<string, SendpulseImportRow[]>();
  const idPhones = new Map<string, Set<string>>();
  for (const row of input.rows) {
    if (!byFile.has(row.sourceFile)) throw new Error("El lote contiene un archivo que no está en el manifiesto.");
    const phone = normalizeSendpulseContactPhone(row.phoneDigits);
    if (!phone || !text(row.contactId) || row.contactId.length > 128) throw new Error(`Contacto inválido en ${row.sourceFile}, fila ${row.sourceRow}.`);
    const group = groups.get(phone) ?? []; group.push(row); groups.set(phone, group);
    const fileRows = files.get(row.sourceFile) ?? []; fileRows.push(row); files.set(row.sourceFile, fileRows);
    const phones = idPhones.get(row.contactId) ?? new Set(); phones.add(phone); idPhones.set(row.contactId, phones);
  }
  const fingerprints = new Set<string>();
  for (const bot of bots) {
    const rows = files.get(bot.sourceFile) ?? [];
    if (!rows.length) throw new Error(`No hay contactos para ${bot.label}.`);
    const ids = rows.map(r=>r.contactId);
    if (new Set(ids).size !== ids.length) throw new Error(`IDs repetidos dentro del archivo de ${bot.label}.`);
    bot.sourceCount = new Set(rows.map(r=>normalizeSendpulseContactPhone(r.phoneDigits))).size;
    const fingerprint = createHash("sha256").update(JSON.stringify(rows.map(r=>[r.contactId,r.phoneDigits,r.raw]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))))).digest("hex");
    if (fingerprints.has(fingerprint)) throw new Error("Dos bots tienen exactamente la misma exportación. Hay que confirmar/corregir los archivos antes de importar.");
    fingerprints.add(fingerprint);
  }
  const byId = new Map(input.existing.filter(c=>c.sendpulseContactId).map(c=>[c.sendpulseContactId,c]));
  const byPhone = new Map<string, SendpulseExistingClient[]>();
  const byEmail = new Map(input.existing.map(c=>[c.email.toLowerCase(),c]));
  for (const client of input.existing) {
    const phone = client.phone ? normalizeSendpulseContactPhone(client.phone) : null;
    if (phone) { const list=byPhone.get(phone)??[];list.push(client);byPhone.set(phone,list); }
  }
  const emailPhones = new Map<string, Set<string>>();
  for (const [phone, rows] of groups) for (const row of rows) {
    const email=emailFrom(row); if(!email)continue;
    const numbers=emailPhones.get(email)??new Set();numbers.add(phone);emailPhones.set(email,numbers);
  }
  const decisions: SendpulseImportDecision[] = [], review: SendpulseImportPlan["review"] = [];
  const claimedExisting = new Set<string>();
  const usedContactIds = new Set<string>();
  for (const [phone, rows] of [...groups].sort((a,b)=>a[0].localeCompare(b[0]))) {
    if (rows.some(r=>(idPhones.get(r.contactId)?.size??0)>1)) {
      review.push({phone,reason:"El mismo ID de SendPulse tiene teléfonos distintos en el lote."});continue;
    }
    rows.sort((a,b)=>{
      const left=byFile.get(a.sourceFile)!,right=byFile.get(b.sourceFile)!;
      return right.sourceCount-left.sourceCount || left.phone.localeCompare(right.phone);
    });
    const winner=rows[0], bot=byFile.get(winner.sourceFile)!;
    const ids=[...new Set(rows.map(r=>r.contactId))];
    const byContactMatches=[...new Map(ids.flatMap(id=>byId.has(id)?[byId.get(id)!]:[]).map(c=>[c.id,c])).values()];
    const phoneMatches=byPhone.get(phone)??[];
    const candidates=byContactMatches.length ? byContactMatches : phoneMatches;
    if (candidates.length>1 || (byContactMatches.length && phoneMatches.some(c=>c.id!==candidates[0].id))) {
      review.push({phone,reason:"Hay más de una ficha del CRM para este contacto; no se fusionan historiales automáticamente.",existingIds:[...new Set([...candidates,...phoneMatches].map(c=>c.id))]});continue;
    }
    const existing=candidates[0]??null;
    if (existing && claimedExisting.has(existing.id)) {
      review.push({phone,reason:"Una ficha existente coincide con varios contactos del lote.",existingIds:[existing.id]});continue;
    }
    const sourceEmail=rows.map(emailFrom).find(Boolean)??null;
    const emailOwner=sourceEmail ? byEmail.get(sourceEmail) : undefined;
    if (emailOwner && emailOwner.id!==existing?.id) {
      review.push({phone,reason:"El correo pertenece a una ficha con otro teléfono/ID; requiere revisión.",existingIds:[emailOwner.id]});continue;
    }
    const generatedEmail=`sp.${createHash("sha256").update(phone).digest("hex").slice(0,24)}@clientes.isaprespremium.cl`;
    if (!existing && byEmail.has(generatedEmail)) {
      review.push({phone,reason:"El identificador interno del contacto ya existe; requiere revisión."});continue;
    }
    if (usedContactIds.has(winner.contactId)) throw new Error("La preparación duplicó un ID de SendPulse.");
    usedContactIds.add(winner.contactId);
    if(existing)claimedExisting.add(existing.id);
    const fullName = rows.map(r=>text(r.raw["Nombre y Apellido"])||text(r.raw.name)).find(Boolean)||"Contacto SendPulse";
    decisions.push({phone,contactId:winner.contactId,contactIds:ids,fullName:fullName.slice(0,160),email:sourceEmail && emailPhones.get(sourceEmail)?.size===1?sourceEmail:generatedEmail,botPhone:bot.phone,botLabel:bot.label,sourceRows:rows,existing});
    bot.assignedCount+=1;
  }
  return {decisions,review,bots,sourceRows:input.rows.length};
}
