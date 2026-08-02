import { readFile } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { seedAuthAccountPassword } from "../lib/auth/account-store";
import {
  ISAPRE_CATALOG,
  resolveIsapreIdFromName,
} from "../lib/isapre-catalog";
import {
  ISAPRE_GES_DEFAULTS,
  DEFAULT_GES_PREMIUM_UF,
} from "../lib/isapre-ges-defaults";
import { buildIsaprePremiumPartnerRecord } from "../lib/partner-entity/isapre-premium-agent";
import { buildCotizadorPremiumPartnerRecord } from "../lib/partner-entity/platform-agent";
import { partnerThemeToPrismaJson } from "../lib/partner-entity/theme";
import type { Clinic } from "../types/clinic";
import type { HealthPlan } from "../types/plan";

const prisma = new PrismaClient();

const PLANS_PATH = path.join(process.cwd(), "src/assets/planes.json");
const CLINICS_PATH = path.join(process.cwd(), "src/assets/clinics.json");

const ADMIN_ACCOUNTS = [
  {
    email: "admin@isaprespremium.cl",
    fullName: "Usuario Prueba Admin 1",
  },
  {
    email: "superadmin@isaprespremium.cl",
    fullName: "Usuario Prueba",
  },
  {
    email: "soyalfredo.dev@gmail.com",
    fullName: "Alfredo Hurtado",
  },
];

const EXECUTIVE_ACCOUNTS = [
  {
    email: "ejecutivo@isaprespremium.cl",
    fullName: "Usuario Prueba Ejecutivo 1",
    phone: "+56911223344",
    rut: "15.555.555-5",
    subscriptionStatus: "TRIAL" as const,
  },
  {
    email: "ventas@isaprespremium.cl",
    fullName: "Usuario Prueba Ejecutivo 2",
    phone: "+56944332211",
    rut: "16.666.666-6",
    subscriptionStatus: "ACTIVE" as const,
  },
];

const CLIENT_USERS = [
  {
    email: "juan.perez@demo.cl",
    fullName: "Usuario Prueba Cliente 1",
    phone: "+56999887766",
    rut: "12.345.678-9",
    role: "CLIENT" as const,
  },
  {
    email: "ana.torres@demo.cl",
    fullName: "Usuario Prueba Cliente 2",
    phone: "+56988776655",
    rut: "18.765.432-1",
    role: "CLIENT" as const,
  },
  {
    email: "carlos.munoz@demo.cl",
    fullName: "Usuario Prueba Cliente 3",
    phone: "+56977665544",
    rut: "19.876.543-2",
    role: "CLIENT" as const,
  },
];

async function seedIsapres() {
  await Promise.all(
    ISAPRE_CATALOG.map((item) => {
      const defaults = ISAPRE_GES_DEFAULTS[item.id] ?? {
        gesPremiumUf: DEFAULT_GES_PREMIUM_UF,
        gesPremiumUfLegacy: null,
      };

      return prisma.isapre.upsert({
        where: { id: item.id },
        create: {
          id: item.id,
          name: item.name,
          gesPremiumUf: defaults.gesPremiumUf,
          gesPremiumUfLegacy: defaults.gesPremiumUfLegacy,
        },
        update: {
          name: item.name,
          active: true,
          gesPremiumUf: defaults.gesPremiumUf,
          gesPremiumUfLegacy: defaults.gesPremiumUfLegacy,
        },
      });
    }),
  );
}

async function seedClinicsAndPlans() {
  const [plansRaw, clinicsRaw] = await Promise.all([
    readFile(PLANS_PATH, "utf-8"),
    readFile(CLINICS_PATH, "utf-8").catch(() => "[]"),
  ]);

  const plans = JSON.parse(plansRaw) as HealthPlan[];
  const clinics = JSON.parse(clinicsRaw) as Clinic[];

  const clinicMap = new Map<string, string>();

  for (const clinic of clinics) {
    clinicMap.set(clinic.id, clinic.name);
  }

  for (const plan of plans) {
    for (const entry of plan.coverage) {
      if (!clinicMap.has(entry.clinic_id)) {
        clinicMap.set(entry.clinic_id, entry.clinic_name);
      }
    }
  }

  await prisma.quote.deleteMany();
  await prisma.coverageEntry.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.clinic.deleteMany();

  await prisma.clinic.createMany({
    data: Array.from(clinicMap.entries()).map(([id, name]) => ({ id, name })),
    skipDuplicates: true,
  });

  for (const plan of plans) {
    const isapreId = resolveIsapreIdFromName(plan.isapre);

    await prisma.isapre.upsert({
      where: { id: isapreId },
      create: { id: isapreId, name: plan.isapre },
      update: { name: plan.isapre },
    });

    await prisma.plan.create({
      data: {
        uniqueCode: plan.unique_code,
        isapreId,
        planName: plan.plan_name,
        basePriceUf: plan.base_price_uf,
        planType:
          plan.plan_type ??
          (plan.has_top ? "preferred" : "free_choice"),
        hasTop: plan.has_top ?? false,
        additionalNotes: plan.additional_notes ?? null,
        pdfUrl: plan.pdf_url ?? null,
        pdfPublicId: plan.pdf_public_id ?? null,
        coverages: {
          create: plan.coverage.map((entry) => ({
            clinicId: entry.clinic_id,
            clinicName: entry.clinic_name,
            percentage: entry.percentage,
            type: entry.type,
          })),
        },
      },
    });
  }

  return { plans, clinicCount: clinicMap.size };
}

async function seedAuthAccounts() {
  const password = process.env.SEED_ACCOUNT_PASSWORD?.trim() || "ChangeMe123!";
  const passwordHash = await seedAuthAccountPassword(password);

  for (const admin of ADMIN_ACCOUNTS) {
    await prisma.staffAccount.upsert({
      where: { email: admin.email },
      create: {
        email: admin.email,
        fullName: admin.fullName,
        role: "ADMIN",
        passwordHash,
        active: true,
        mustChangePassword: false,
        onboardingCompleted: true,
      },
      update: {
        fullName: admin.fullName,
        role: "ADMIN",
        active: true,
        mustChangePassword: false,
        onboardingCompleted: true,
      },
    });
  }

  const trialExpiresAt = new Date();
  trialExpiresAt.setDate(trialExpiresAt.getDate() + 30);

  for (const executive of EXECUTIVE_ACCOUNTS) {
    const existing = await prisma.staffAccount.findUnique({
      where: { email: executive.email },
    });

    if (existing) continue;

    await prisma.staffAccount.create({
      data: {
        email: executive.email,
        fullName: executive.fullName,
        role: "EXECUTIVE",
        executiveKind: "ISAPRES_PREMIUM",
        phone: executive.phone,
        rut: executive.rut,
        passwordHash,
        active: true,
        mustChangePassword: false,
        onboardingCompleted: true,
        subscriptionStatus: executive.subscriptionStatus,
        subscriptionExpiresAt:
          executive.subscriptionStatus === "TRIAL" ? trialExpiresAt : null,
      },
    });
  }

  // Cuentas demo existentes: asegurar kind Premium.
  await prisma.staffAccount.updateMany({
    where: {
      role: "EXECUTIVE",
      executiveKind: null,
    },
    data: { executiveKind: "ISAPRES_PREMIUM" },
  });

  for (const executive of EXECUTIVE_ACCOUNTS) {
    await prisma.staffAccount.updateMany({
      where: { email: executive.email, role: "EXECUTIVE" },
      data: { executiveKind: "ISAPRES_PREMIUM" },
    });
  }

  return {
    adminCount: ADMIN_ACCOUNTS.length,
    executiveCount: EXECUTIVE_ACCOUNTS.length,
  };
}

async function seedClientUsers() {
  for (const user of CLIENT_USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: {
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        rut: user.rut,
        role: user.role,
        active: true,
      },
      update: {
        fullName: user.fullName,
        phone: user.phone,
        rut: user.rut,
        role: user.role,
        active: true,
      },
    });
  }

  return CLIENT_USERS.length;
}

async function seedQuotes(plans: HealthPlan[]) {
  const clients = await prisma.user.findMany({
    where: { role: "CLIENT" },
    orderBy: { email: "asc" },
  });

  if (clients.length === 0 || plans.length === 0) return 0;

  const sampleQuotes = [
    {
      clientIndex: 0,
      planIndex: 0,
      status: "PENDING" as const,
      region: "rm",
      sex: "M",
      monthlyIncome: "1500000",
      contributorAge: 34,
      dependentsCount: 1,
      dependentAges: [32],
      finalPriceUf: 4.12,
      finalPriceClp: 158_420,
      ufValue: 38_450,
      beneficiaryCount: 2,
      totalFactors: 1.85,
      quoteReason: "Cotización web pública",
    },
    {
      clientIndex: 1,
      planIndex: Math.min(1, plans.length - 1),
      status: "CONTACTED" as const,
      region: "rm",
      sex: "F",
      monthlyIncome: "2200000",
      contributorAge: 28,
      dependentsCount: 0,
      dependentAges: [],
      finalPriceUf: 3.55,
      finalPriceClp: 136_498,
      ufValue: 38_450,
      beneficiaryCount: 1,
      totalFactors: 1.0,
      quoteReason: "Solicitud desde comparador",
      notes: "Cliente contactado por ejecutivo de prueba",
    },
    {
      clientIndex: 2,
      planIndex: Math.min(2, plans.length - 1),
      status: "CONVERTED" as const,
      region: "valparaiso",
      sex: "M",
      monthlyIncome: "980000",
      contributorAge: 45,
      dependentsCount: 2,
      dependentAges: [12, 8],
      finalPriceUf: 5.2,
      finalPriceClp: 199_940,
      ufValue: 38_450,
      beneficiaryCount: 3,
      totalFactors: 2.4,
      quoteReason: "Plan familiar",
      notes: "Contrato firmado",
    },
    {
      clientIndex: 0,
      planIndex: Math.min(3, plans.length - 1),
      status: "CANCELLED" as const,
      region: "rm",
      sex: "M",
      monthlyIncome: "1500000",
      contributorAge: 34,
      dependentsCount: 1,
      dependentAges: [32],
      finalPriceUf: 4.8,
      finalPriceClp: 184_560,
      ufValue: 38_450,
      beneficiaryCount: 2,
      totalFactors: 1.85,
      quoteReason: "Comparación de alternativas",
      notes: "Cliente eligió otra isapre",
    },
  ];

  for (const sample of sampleQuotes) {
    const client = clients[sample.clientIndex % clients.length];
    const plan = plans[sample.planIndex];

    await prisma.quote.create({
      data: {
        userId: client.id,
        planCode: plan.unique_code,
        status: sample.status,
        fullName: client.fullName,
        email: client.email,
        phone: client.phone ?? "",
        rut: client.rut,
        region: sample.region,
        sex: sample.sex,
        monthlyIncome: sample.monthlyIncome,
        contributorAge: sample.contributorAge,
        dependentsCount: sample.dependentsCount,
        dependentAges: sample.dependentAges,
        quoteReason: sample.quoteReason,
        finalPriceUf: sample.finalPriceUf,
        finalPriceClp: sample.finalPriceClp,
        ufValue: sample.ufValue,
        beneficiaryCount: sample.beneficiaryCount,
        totalFactors: sample.totalFactors,
        notes: sample.notes ?? null,
      },
    });
  }

  return sampleQuotes.length;
}

const PARTNER_ENTITIES = [
  {
    slug: "cotizaloantes",
    embedKey: "cotizaloantes",
    name: "Cotízalo Antes",
    logoUrl: "/images/logo-cotizalo-antes.png",
    websiteUrl: "https://cotizaloantes.cl",
    whatsappNumber: "56964133848",
    whatsappMessage: "Hola, quiero cotizar un plan de salud",
    exitLabel: "Volver a Cotízalo Antes",
    brandKey: "cotizalo-antes",
    theme: {
      primary: "#ed7d11",
      primaryHover: "#f59324",
      primaryDark: "#92450a",
      primaryForeground: "#ffffff",
      secondary: "#0e7c9c",
      secondaryMuted: "#eef6f8",
      bgLayout: "#ffffff",
      foreground: "#1a1a1a",
      muted: "#6b7280",
      border: "#e5e7eb",
      surfaceHover: "#f4f4f5",
      criteriaSurface: "#ed7d11",
      criteriaRing: "#c4650c",
      convenioAccent: "#ed7d11",
      convenioAccentStrong: "#0e7c9c",
      convenioAccentMuted: "#eef6f8",
    },
  },
  {
    slug: "desdetu7",
    embedKey: "desdetu7",
    name: "Desde Tu 7",
    logoUrl: "https://desdetu7.cl/logo.png",
    websiteUrl: "https://desdetu7.cl",
    whatsappNumber: "56964133848",
    whatsappMessage: "Hola, quiero cotizar un plan de salud desde Desde Tu 7",
    exitLabel: "Volver a Desde Tu 7",
    brandKey: "desdetu7",
    theme: {
      primary: "#ff6600",
      primaryHover: "#ff8533",
      primaryDark: "#cc5200",
      primaryForeground: "#ffffff",
      secondary: "#111827",
      secondaryMuted: "#f5f7fa",
      bgLayout: "#ffffff",
      foreground: "#111827",
      muted: "#6b7280",
      border: "#e5e7eb",
      surfaceHover: "#f4f4f5",
      criteriaSurface: "#ff6600",
      criteriaRing: "#cc5200",
      convenioAccent: "#ff6600",
      convenioAccentStrong: "#111827",
      convenioAccentMuted: "#f5f7fa",
    },
  },
  buildIsaprePremiumPartnerRecord(),
  buildCotizadorPremiumPartnerRecord(),
];

async function seedPartnerEntities() {
  for (const partner of PARTNER_ENTITIES) {
    await prisma.partnerEntity.upsert({
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
  }

  return PARTNER_ENTITIES.length;
}

const PLAN_REVIEWS_SEED = [
  {
    authorName: "María González",
    planCode: "13-SF1001-26",
    executiveRating: 5,
    comment:
      "El ejecutivo me explicó cada cobertura con paciencia y me ayudó a elegir el plan ideal para mi familia. Respuesta rápida por WhatsApp en todo momento.",
    featured: true,
    displayOrder: 0,
  },
  {
    authorName: "Carlos Muñoz",
    planCode: "13-SF2001-26",
    executiveRating: 5,
    comment:
      "Proceso muy claro de principio a fin. Comparé opciones en minutos y el ejecutivo resolvió todas mis dudas sobre prestadores y copagos.",
    featured: true,
    displayOrder: 1,
  },
  {
    authorName: "Ana Torres",
    planCode: "13-SF3001-26",
    executiveRating: 4,
    comment:
      "Excelente acompañamiento al cotizar. Me orientaron sobre el plan más conveniente según mi edad y cargas, sin presión comercial.",
    featured: false,
    displayOrder: 2,
  },
  {
    authorName: "Felipe Rojas",
    planCode: "13-SF4001-26",
    executiveRating: 5,
    comment:
      "La atención fue personalizada y profesional. Recibí el PDF del plan y un resumen comparativo que me facilitó tomar la decisión.",
    featured: false,
    displayOrder: 3,
  },
  {
    authorName: "Camila Soto",
    planCode: "13-SF5001-26",
    executiveRating: 5,
    comment:
      "Muy buena experiencia digital. El cotizador es rápido y el ejecutivo hizo seguimiento hasta cerrar mi contrato con la isapre.",
    featured: false,
    displayOrder: 4,
  },
  {
    authorName: "Jorge Pérez",
    planCode: "13-SF1001-26",
    executiveRating: 4,
    comment:
      "Me gustó la transparencia en precios y coberturas. El ejecutivo fue amable y siempre disponible para resolver consultas puntuales.",
    featured: false,
    displayOrder: 5,
  },
] as const;

async function seedPlanReviews(plans: HealthPlan[]) {
  if (plans.length === 0) return 0;

  const planCodes = new Set(plans.map((plan) => plan.unique_code));
  const clients = await prisma.user.findMany({
    where: { role: "CLIENT" },
    orderBy: { email: "asc" },
    take: PLAN_REVIEWS_SEED.length,
  });

  await prisma.planReview.deleteMany({});

  let count = 0;
  for (const [index, review] of PLAN_REVIEWS_SEED.entries()) {
    if (!planCodes.has(review.planCode)) continue;

    await prisma.planReview.create({
      data: {
        authorName: review.authorName,
        planCode: review.planCode,
        executiveRating: review.executiveRating,
        comment: review.comment,
        featured: review.featured,
        displayOrder: review.displayOrder,
        published: true,
        userId: clients[index]?.id ?? null,
      },
    });
    count += 1;
  }

  return count;
}

async function main() {
  await seedIsapres();
  const { plans, clinicCount } = await seedClinicsAndPlans();
  const { adminCount, executiveCount } = await seedAuthAccounts();
  const clientCount = await seedClientUsers();
  const quoteCount = await seedQuotes(plans);
  const reviewCount = await seedPlanReviews(plans);
  const partnerCount = await seedPartnerEntities();

  console.log("Seed completado:");
  console.log(`  - ${ISAPRE_CATALOG.length} isapres`);
  console.log(`  - ${clinicCount} clínicas`);
  console.log(`  - ${plans.length} planes`);
  console.log(
    `  - ${adminCount} admins, ${executiveCount} ejecutivos, ${clientCount} clientes`,
  );
  console.log(`  - ${quoteCount} cotizaciones`);
  console.log(`  - ${reviewCount} reseñas publicadas`);
  console.log(`  - ${partnerCount} entidades aliadas`);
  console.log(
    "  - Cuentas demo: usa SEED_ACCOUNT_PASSWORD (por defecto ChangeMe123!)",
  );
}

main()
  .catch((error) => {
    console.error("Error en seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
