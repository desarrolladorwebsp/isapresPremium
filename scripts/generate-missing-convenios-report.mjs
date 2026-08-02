/**
 * Reporte correcto de planes faltantes en convenios.
 * Usa JSON.parse para leer los IDs reales del archivo de mappings.
 */
import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_DIR = path.join(__dirname, '..');

// ─── 1. Leer el archivo de mapeo via JSON.parse ───────────────────────────────
const MAPPINGS_FILE = path.join(
  BASE_DIR,
  'src/lib/company-agreements/data/agreement-plan-mappings.ts'
);
const content = fs.readFileSync(MAPPINGS_FILE, 'utf-8');

// Extraer el objeto JS como JSON (remover declaraciones TS)
const jsonStr = content
  .replace(/^\/\/.*$/mg, '')
  .replace(/export interface[\s\S]*?}\n\n/, '')
  .replace(/export const AGREEMENT_PLAN_MAPPINGS[^=]+=\s*/, '')
  .replace(/;\s*$/, '');

const mappingData = JSON.parse(jsonStr);
const mappedIds = {
  colmena:  new Set(Object.keys(mappingData.colmena  || {})),
  consalud: new Set(Object.keys(mappingData.consalud || {})),
};

console.log(`✔ IDs mapeados — Colmena: ${mappedIds.colmena.size}, Consalud: ${mappedIds.consalud.size}`);

// ─── 2. Leer Excel de convenios ───────────────────────────────────────────────
const CODIGOS_DIR = path.join(BASE_DIR, 'storage/convenios/codigos');
const files = fs.readdirSync(CODIGOS_DIR).filter(f => f.endsWith('.xlsx'));

const allRows = [];

for (const file of files) {
  const filePath = path.join(CODIGOS_DIR, file);
  const isapreKey = file.toLowerCase().includes('colmena') ? 'colmena' : 'consalud';
  const isapreLabel = isapreKey === 'colmena' ? 'Colmena' : 'Consalud';
  const wb = xlsx.readFile(filePath);

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    // Usar header:1 para leer headers exactos
    const rawRows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (rawRows.length < 2) continue;

    const headers = rawRows[0].map(h => String(h || '').trim());
    console.log(`📄 [${isapreLabel}] Hoja "${sheetName}": ${rawRows.length - 1} filas | Headers: ${headers.join(' | ')}`);

    const codeIdx     = headers.findIndex(h => h.toUpperCase().startsWith('CODIGO') && !h.toUpperCase().includes('CONVENIO'));
    const nameIdx     = headers.findIndex(h => /nombre/i.test(h));
    const priceIdx    = headers.findIndex(h => /^precio base$/i.test(h));
    const convCodeIdx = headers.findIndex(h => /codigo convenio/i.test(h));
    const convPriceIdx = headers.findIndex(h => /precio base convenio/i.test(h));

    console.log(`   codeIdx=${codeIdx}, nameIdx=${nameIdx}, priceIdx=${priceIdx}, convCodeIdx=${convCodeIdx}, convPriceIdx=${convPriceIdx}`);

    for (let i = 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rawCode = String(row[codeIdx] ?? '').trim();
      if (!rawCode) continue;

      allRows.push({
        isapreKey,
        isapreLabel,
        codigoOriginal: rawCode,
        nombrePlan:     nameIdx >= 0 ? String(row[nameIdx] ?? '').trim() : '',
        precioBase:     priceIdx >= 0 ? row[priceIdx] : '',
        codigoConvenio: convCodeIdx >= 0 ? String(row[convCodeIdx] ?? '').trim() : '',
        precioConvenio: convPriceIdx >= 0 ? row[convPriceIdx] : '',
        isMapped:       mappedIds[isapreKey].has(rawCode),
      });
    }
  }
}

const missingRows = allRows.filter(r => !r.isMapped);
const mappedRows  = allRows.filter(r => r.isMapped);

console.log(`\n📊 Total: ${allRows.length}  |  Mapeados: ${mappedRows.length}  |  Faltantes: ${missingRows.length}`);

// ─── 3. Generar Excel ─────────────────────────────────────────────────────────
const reportDir = path.join(BASE_DIR, 'storage/reportes');
if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

const dateStr = new Date().toISOString().split('T')[0];
const outPath = path.join(reportDir, `reporte_planes_faltantes_convenios_${dateStr}.xlsx`);

const wbOut = xlsx.utils.book_new();

function toRow(r) {
  return {
    'Isapre':               r.isapreLabel,
    'Código Original':      r.codigoOriginal,
    'Nombre Plan':          r.nombrePlan,
    'Precio Base (UF)':     r.precioBase,
    'Código Convenio':      r.codigoConvenio,
    'Precio Convenio (UF)': r.precioConvenio,
  };
}

// Hoja 1: Planes FALTANTES
const wsFaltantes = xlsx.utils.json_to_sheet(missingRows.map(toRow));
wsFaltantes['!cols'] = [{ wch:12 },{ wch:20 },{ wch:45 },{ wch:15 },{ wch:20 },{ wch:20 }];
xlsx.utils.book_append_sheet(wbOut, wsFaltantes, 'Planes Faltantes');

// Hoja 2: Todos los planes con estado
const wsAll = xlsx.utils.json_to_sheet(
  allRows.map(r => ({ ...toRow(r), '¿Mapeado?': r.isMapped ? 'SÍ' : 'NO' }))
);
wsAll['!cols'] = [{ wch:12 },{ wch:20 },{ wch:45 },{ wch:15 },{ wch:20 },{ wch:20 },{ wch:11 }];
xlsx.utils.book_append_sheet(wbOut, wsAll, 'Todos los Planes');

// Hoja 3: Resumen
const groups = ['colmena','consalud'];
const resumenRows = groups.map(g => {
  const label    = g.charAt(0).toUpperCase() + g.slice(1);
  const total    = allRows.filter(r => r.isapreKey === g).length;
  const mapeados = mappedRows.filter(r => r.isapreKey === g).length;
  const faltantes = missingRows.filter(r => r.isapreKey === g).length;
  return { 'Isapre': label, 'Total en Excel': total, 'Mapeados': mapeados, 'Faltantes': faltantes };
});
resumenRows.push({ 'Isapre': 'TOTAL', 'Total en Excel': allRows.length, 'Mapeados': mappedRows.length, 'Faltantes': missingRows.length });

const wsResumen = xlsx.utils.json_to_sheet(resumenRows);
wsResumen['!cols'] = [{ wch:12 },{ wch:15 },{ wch:12 },{ wch:12 }];
xlsx.utils.book_append_sheet(wbOut, wsResumen, 'Resumen');

xlsx.writeFile(wbOut, outPath);

console.log(`\n✅ Reporte guardado en: ${outPath}`);
const cFalt = missingRows.filter(r => r.isapreKey==='colmena').length;
const sFalt = missingRows.filter(r => r.isapreKey==='consalud').length;
console.log(`\n┌──────────┬───────────┬──────────┬────────────┐`);
console.log(`│ Isapre   │ Total XLS │ Mapeados │  Faltantes │`);
console.log(`├──────────┼───────────┼──────────┼────────────┤`);
console.log(`│ Colmena  │ ${String(allRows.filter(r=>r.isapreKey==='colmena').length).padEnd(9)} │ ${String(mappedIds.colmena.size).padEnd(8)} │ ${String(cFalt).padEnd(10)} │`);
console.log(`│ Consalud │ ${String(allRows.filter(r=>r.isapreKey==='consalud').length).padEnd(9)} │ ${String(mappedIds.consalud.size).padEnd(8)} │ ${String(sFalt).padEnd(10)} │`);
console.log(`├──────────┼───────────┼──────────┼────────────┤`);
console.log(`│ TOTAL    │ ${String(allRows.length).padEnd(9)} │ ${String(mappedRows.length).padEnd(8)} │ ${String(missingRows.length).padEnd(10)} │`);
console.log(`└──────────┴───────────┴──────────┴────────────┘`);

if (missingRows.length > 0) {
  console.log('\n🔍 Planes faltantes:');
  missingRows.forEach(r => {
    console.log(`   [${r.isapreLabel}] ${r.codigoOriginal}  →  convenio: ${r.codigoConvenio || 'N/A'}`);
  });
}
