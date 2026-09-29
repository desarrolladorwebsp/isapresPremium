import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  PDFDocument,
  PDFString,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import type { ClientQuotationPlanSnapshot } from "@/types/client-quotation";

type QuotationPdfSource = {
  number: string;
  status: string;
  version: number;
  createdAt: Date;
  validUntil: Date | null;
  clientSnapshot: unknown;
  executiveSnapshot: unknown;
  items: Array<{ planSnapshot: unknown }>;
};

const ISAPRE_LOGOS: Record<string, string> = {
  banmedica: "isapre-banmedica.png",
  colmena: "isapre-colmena.png",
  consalud: "isapre-consalud.png",
  "cruz blanca": "isapre-cruz-blanca.jpeg",
  esencial: "isapre-esencial.png",
  "nueva masvida": "isapre-nueva-masvida.png",
  "vida tres": "isapre-vida-tres.png",
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function text(value: unknown, fallback = "—") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function formatDate(value: Date | null) {
  return value ? new Intl.DateTimeFormat("es-CL").format(value) : "—";
}

function wrap(font: PDFFont, value: string, size: number, maxWidth: number): string[] {
  const words = value.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
    else { if (line) lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function drawWrapped(page: PDFPage, font: PDFFont, value: string, options: {
  x: number; y: number; size?: number; maxWidth: number; color?: ReturnType<typeof rgb>; lineHeight?: number;
}) {
  const size = options.size ?? 10;
  const lineHeight = options.lineHeight ?? size + 3;
  const lines = wrap(font, value, size, options.maxWidth);
  lines.forEach((line, index) => page.drawText(line, {
    x: options.x, y: options.y - index * lineHeight, size, font,
    color: options.color ?? rgb(0.12, 0.18, 0.28),
  }));
}

async function embedImage(document: PDFDocument, relativePath: string) {
  try {
    const bytes = await readFile(path.join(process.cwd(), "public", relativePath));
    return relativePath.toLowerCase().endsWith(".png") ? document.embedPng(bytes) : document.embedJpg(bytes);
  } catch { return null; }
}

function logoPathForIsapre(name: string) {
  const normalized = name.toLocaleLowerCase("es-CL").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const entry = Object.entries(ISAPRE_LOGOS).find(([key]) => normalized.includes(key));
  return entry ? `images/isapres/${entry[1]}` : null;
}

function drawExternalLink(input: {
  document: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  label: string;
  url: string;
  x: number;
  y: number;
  width: number;
}) {
  const { document, page, font, label, url, x, y, width } = input;
  page.drawRectangle({
    x,
    y: y - 6,
    width,
    height: 30,
    color: rgb(0.035, 0.145, 0.345),
    borderColor: rgb(0.02, 0.72, 0.86),
    borderWidth: 1,
  });
  const textWidth = font.widthOfTextAtSize(label, 10);
  page.drawText(label, {
    x: x + Math.max(12, (width - textWidth) / 2),
    y: y + 4,
    size: 10,
    font,
    color: rgb(1, 1, 1),
  });
  const annotation = document.context.register(document.context.obj({
    Type: "Annot",
    Subtype: "Link",
    Rect: [x, y - 6, x + width, y + 24],
    Border: [0, 0, 0],
    A: {
      Type: "Action",
      S: "URI",
      URI: PDFString.of(url),
    },
  }));
  page.node.addAnnot(annotation);
}

export async function buildClientQuotationPdf(source: QuotationPdfSource): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.035, 0.145, 0.345);
  const cyan = rgb(0.02, 0.72, 0.86);
  const muted = rgb(0.35, 0.42, 0.52);
  const client = record(source.clientSnapshot);
  const executive = record(source.executiveSnapshot);
  const plans = source.items.map((item) => item.planSnapshot as ClientQuotationPlanSnapshot);
  const page = document.addPage([595.28, 841.89]);

  page.drawRectangle({ x: 0, y: 742, width: 595.28, height: 99.89, color: navy });
  const premiumLogo = await embedImage(document, "logo-isapres-premium.png");
  if (premiumLogo) {
    const dimensions = premiumLogo.scaleToFit(145, 62);
    page.drawImage(premiumLogo, { x: 42, y: 760, ...dimensions });
  } else page.drawText("ISAPRES PREMIUM", { x: 42, y: 790, size: 20, font: bold, color: rgb(1, 1, 1) });
  page.drawText("COTIZACIÓN DE PLANES DE SALUD", { x: 260, y: 794, size: 13, font: bold, color: rgb(1, 1, 1) });
  page.drawText(source.number, { x: 260, y: 771, size: 18, font: bold, color: cyan });
  page.drawText(`Versión ${source.version}`, { x: 260, y: 754, size: 9, font: regular, color: rgb(0.85, 0.9, 0.98) });

  page.drawText("DATOS DE LA COTIZACIÓN", { x: 42, y: 709, size: 11, font: bold, color: navy });
  page.drawLine({ start: { x: 42, y: 701 }, end: { x: 553, y: 701 }, thickness: 1, color: cyan });
  const info = [
    `Cliente: ${text(client.fullName)}`, `RUT: ${text(client.rut)}`,
    `Correo: ${text(client.email)}`, `Teléfono: ${text(client.phone)}`,
    `Fecha de emisión: ${formatDate(source.createdAt)}`, `Válida hasta: ${formatDate(source.validUntil)}`,
    `Ejecutivo: ${text(executive.fullName)}`, `Contacto: ${text(executive.email)} · ${text(executive.phone)}`,
  ];
  info.forEach((line, index) => page.drawText(line, {
    x: index < 4 ? 42 : 310, y: 682 - (index % 4) * 20, size: 9.5,
    font: index % 4 === 0 ? bold : regular, color: index % 4 === 0 ? navy : muted,
  }));

  let y = 580;
  for (let index = 0; index < plans.length; index += 1) {
    const plan = plans[index];
    const boxHeight = 142;
    page.drawRectangle({ x: 42, y: y - boxHeight + 15, width: 511, height: boxHeight, borderColor: rgb(0.82, 0.86, 0.91), borderWidth: 1, color: rgb(0.98, 0.99, 1) });
    page.drawRectangle({ x: 42, y: y - 12, width: 511, height: 27, color: navy });
    page.drawText(`PROPUESTA ${index + 1}`, { x: 55, y: y - 3, size: 10, font: bold, color: rgb(1, 1, 1) });
    const logoPath = logoPathForIsapre(plan.isapre);
    const isapreLogo = logoPath ? await embedImage(document, logoPath) : null;
    if (isapreLogo) {
      const dimensions = isapreLogo.scaleToFit(95, 36);
      page.drawImage(isapreLogo, { x: 55, y: y - 62, ...dimensions });
    } else page.drawText(plan.isapre, { x: 55, y: y - 46, size: 12, font: bold, color: navy });
    page.drawText(plan.planName, { x: 170, y: y - 39, size: 12, font: bold, color: navy });
    page.drawText(`Código: ${plan.planCode}`, { x: 170, y: y - 57, size: 8.5, font: regular, color: muted });
    page.drawText(`Valor: UF ${plan.finalPriceUf.toLocaleString("es-CL", { maximumFractionDigits: 4 })}`, { x: 390, y: y - 39, size: 11, font: bold, color: navy });
    if (plan.finalPriceClp) page.drawText(`$${Math.round(plan.finalPriceClp).toLocaleString("es-CL")}`, { x: 390, y: y - 57, size: 9, font: regular, color: muted });
    const coverage = plan.coverageSummary.slice(0, 3).join(" · ") || "Consulta el detalle de coberturas con tu ejecutivo.";
    drawWrapped(page, regular, coverage, { x: 55, y: y - 88, size: 8.5, maxWidth: 480, color: muted, lineHeight: 11 });
    y -= boxHeight + 14;
  }

  page.drawRectangle({ x: 42, y: 55, width: 511, height: 62, color: rgb(0.95, 0.97, 1) });
  drawWrapped(page, regular, "Esta cotización es informativa y está sujeta a validación comercial, médica y contractual de la Isapre. Los valores en pesos dependen del valor de la UF y pueden variar. La aceptación debe ser confirmada con tu ejecutivo.", { x: 55, y: 98, size: 8, maxWidth: 485, color: muted, lineHeight: 10 });
  page.drawText("Isapres Premium · Asesoría personalizada en planes de salud", { x: 42, y: 28, size: 8.5, font: bold, color: navy });

  for (let index = 0; index < plans.length; index += 1) {
    const plan = plans[index];
    const detailPage = document.addPage([595.28, 841.89]);
    detailPage.drawRectangle({ x: 0, y: 760, width: 595.28, height: 81.89, color: navy });
    detailPage.drawText(`PROPUESTA ${index + 1} DE ${plans.length}`, {
      x: 42, y: 805, size: 10, font: bold, color: cyan,
    });
    detailPage.drawText(plan.planName, {
      x: 42, y: 780, size: 18, font: bold, color: rgb(1, 1, 1),
    });

    const detailLogoPath = logoPathForIsapre(plan.isapre);
    const detailLogo = detailLogoPath ? await embedImage(document, detailLogoPath) : null;
    if (detailLogo) {
      const dimensions = detailLogo.scaleToFit(125, 48);
      detailPage.drawImage(detailLogo, { x: 42, y: 684, ...dimensions });
    } else {
      detailPage.drawText(plan.isapre, { x: 42, y: 705, size: 16, font: bold, color: navy });
    }

    detailPage.drawText("IDENTIFICACIÓN DEL PLAN", { x: 205, y: 730, size: 10, font: bold, color: navy });
    detailPage.drawText(`Isapre: ${plan.isapre}`, { x: 205, y: 708, size: 10, font: regular, color: muted });
    detailPage.drawText(`Código: ${plan.planCode}`, { x: 205, y: 690, size: 10, font: regular, color: muted });
    detailPage.drawText(`Tipo: ${plan.planType}`, { x: 205, y: 672, size: 10, font: regular, color: muted });

    detailPage.drawRectangle({ x: 42, y: 584, width: 511, height: 62, color: rgb(0.95, 0.97, 1) });
    detailPage.drawText("VALOR DE LA PROPUESTA", { x: 55, y: 624, size: 10, font: bold, color: navy });
    detailPage.drawText(`Precio cotizado: UF ${plan.finalPriceUf.toLocaleString("es-CL", { maximumFractionDigits: 4 })}`, { x: 55, y: 601, size: 13, font: bold, color: navy });
    detailPage.drawText(`Precio base catálogo: UF ${plan.basePriceUf.toLocaleString("es-CL", { maximumFractionDigits: 4 })}`, { x: 310, y: 601, size: 9.5, font: regular, color: muted });
    if (plan.finalPriceClp) {
      detailPage.drawText(`Referencia en pesos: $${Math.round(plan.finalPriceClp).toLocaleString("es-CL")}`, { x: 310, y: 619, size: 9.5, font: regular, color: muted });
    }

    detailPage.drawText("COBERTURAS DESTACADAS", { x: 42, y: 548, size: 11, font: bold, color: navy });
    detailPage.drawLine({ start: { x: 42, y: 540 }, end: { x: 553, y: 540 }, thickness: 1, color: cyan });
    const coverages = plan.coverageSummary.length
      ? plan.coverageSummary.slice(0, 12)
      : ["El detalle de coberturas se encuentra en el PDF oficial del plan."];
    let coverageY = 518;
    for (const coverage of coverages) {
      detailPage.drawCircle({ x: 49, y: coverageY + 3, size: 2.5, color: cyan });
      const lines = wrap(regular, coverage, 9, 485);
      lines.forEach((line, lineIndex) => detailPage.drawText(line, {
        x: 60,
        y: coverageY - lineIndex * 12,
        size: 9,
        font: regular,
        color: muted,
      }));
      coverageY -= Math.max(20, lines.length * 12 + 5);
      if (coverageY < 225) break;
    }

    if (plan.planPdfUrl && /^https?:\/\//i.test(plan.planPdfUrl)) {
      drawExternalLink({
        document,
        page: detailPage,
        font: bold,
        label: "VER PDF OFICIAL DEL PLAN",
        url: plan.planPdfUrl,
        x: 42,
        y: 142,
        width: 230,
      });
      drawWrapped(detailPage, regular, plan.planPdfUrl, {
        x: 42, y: 119, size: 7, maxWidth: 500, color: muted, lineHeight: 9,
      });
    } else {
      detailPage.drawText("PDF oficial no disponible en el catálogo.", { x: 42, y: 150, size: 9, font: bold, color: muted });
    }
    detailPage.drawText("El PDF oficial contiene el detalle contractual completo de beneficios, topes, prestadores y condiciones del plan.", { x: 42, y: 78, size: 8.5, font: regular, color: muted });
    detailPage.drawText(`${source.number} · Isapres Premium`, { x: 42, y: 30, size: 8.5, font: bold, color: navy });
    detailPage.drawText(`Página ${index + 2}`, { x: 500, y: 30, size: 8, font: regular, color: muted });
  }

  document.setTitle(`Cotización ${source.number}`);
  document.setAuthor("Isapres Premium");
  document.setSubject("Cotización formal de planes de salud");
  return document.save();
}
