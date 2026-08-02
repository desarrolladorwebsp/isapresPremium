import { PrismaClient } from '@prisma/client';
import * as xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import { AGREEMENT_PLAN_MAPPINGS } from '../lib/company-agreements/data/agreement-plan-mappings';

const prisma = new PrismaClient();

async function main() {
  console.log('Querying plans from database...');
  // Get all plans for Consalud and Colmena
  const plans = await prisma.plan.findMany({
    where: {
      isapreId: {
        in: ['consalud', 'colmena']
      }
    },
    select: {
      uniqueCode: true,
      planName: true,
      isapreId: true,
      basePriceUf: true,
    }
  });

  const mappedOriginalIds = new Set(AGREEMENT_PLAN_MAPPINGS.map(m => m.originalPlanId));

  const missingPlans = plans.filter(p => !mappedOriginalIds.has(p.uniqueCode));

  // Create Excel file
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(missingPlans.map(p => ({
    Isapre: p.isapreId,
    'Código Plan': p.uniqueCode,
    'Nombre Plan': p.planName,
    'Precio Base (UF)': p.basePriceUf
  })));

  // Auto-size columns slightly
  const wscols = [
    {wch: 15},
    {wch: 20},
    {wch: 40},
    {wch: 15},
  ];
  ws['!cols'] = wscols;

  xlsx.utils.book_append_sheet(wb, ws, 'Planes Sin Convenio');

  const reportDir = path.join(__dirname, '..', 'storage', 'reportes');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const dateStr = new Date().toISOString().split('T')[0];
  const filePath = path.join(reportDir, `planes_faltantes_convenios_${dateStr}.xlsx`);
  
  xlsx.writeFile(wb, filePath);
  
  console.log(`Report generated successfully at ${filePath}`);
  console.log(`Found ${missingPlans.length} missing plans out of ${plans.length} total plans for Colmena/Consalud.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
