import path from "path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { buildIsaprePremiumPartnerRecord } from "../lib/partner-entity/isapre-premium-agent";
import { partnerThemeToPrismaJson } from "../lib/partner-entity/theme";

config({ path: path.join(process.cwd(), ".env.local") });

const prisma = new PrismaClient();

async function main() {
  const partner = buildIsaprePremiumPartnerRecord();

  const saved = await prisma.partnerEntity.upsert({
    where: { slug: partner.slug },
    create: {
      slug: partner.slug,
      embedKey: partner.embedKey,
      name: partner.name,
      logoUrl: partner.logoUrl,
      websiteUrl: partner.websiteUrl,
      whatsappNumber: partner.whatsappNumber,
      whatsappMessage: partner.whatsappMessage,
      exitLabel: partner.exitLabel,
      brandKey: partner.brandKey,
      theme: partnerThemeToPrismaJson(partner.theme),
      active: true,
    },
    update: {
      embedKey: partner.embedKey,
      name: partner.name,
      logoUrl: partner.logoUrl,
      websiteUrl: partner.websiteUrl,
      whatsappNumber: partner.whatsappNumber,
      whatsappMessage: partner.whatsappMessage,
      exitLabel: partner.exitLabel,
      brandKey: partner.brandKey,
      theme: partnerThemeToPrismaJson(partner.theme),
      active: true,
    },
  });

  console.log("Agente Isapres Premium sincronizado en BD:");
  console.log(`  - slug / agent: ${saved.slug}`);
  console.log(`  - embedKey: ${saved.embedKey}`);
  console.log(`  - brandKey: ${saved.brandKey}`);
  console.log(`  - website: ${saved.websiteUrl}`);
  console.log(`  - logo: ${saved.logoUrl}`);
  console.log(`  - theme.primary: ${(saved.theme as { primary?: string }).primary}`);
}

main()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
