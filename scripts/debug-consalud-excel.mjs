import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_DIR = path.join(__dirname, '..');

const filePath = path.join(BASE_DIR, 'storage/convenios/codigos/CODIGOS CON PLANES CONVENIOS Consalud.xlsx');
const wb = xlsx.readFile(filePath);

console.log('Hojas:', wb.SheetNames);

for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(ws, { defval: '' });
  console.log(`\n=== Hoja: "${sheetName}" — ${rows.length} filas ===`);
  if (rows.length > 0) {
    console.log('Columnas:', Object.keys(rows[0]));
    console.log('\nPrimeras 5 filas:');
    rows.slice(0, 5).forEach((r, i) => console.log(`  [${i}]`, JSON.stringify(r)));
  }
}
