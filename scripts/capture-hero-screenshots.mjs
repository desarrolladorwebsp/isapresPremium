/**
 * Captura screenshots reales del cotizador para el Hero de la Landing.
 * Uso: node scripts/capture-hero-screenshots.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "../public/images/landing/hero");
const BASE = (process.argv[2] ?? "http://localhost:3001").replace(/\/$/, "");

const SHOTS = [
  {
    file: "cotizador-criterios.png",
    url: `${BASE}/cotizador?agent=cotizadorpremium`,
    waitMs: 2500,
    clip: { x: 0, y: 0, width: 1280, height: 720 },
  },
  {
    file: "cotizador-resultados.png",
    url: `${BASE}/cotizador?agent=cotizadorpremium&region=rm&edad=35&sexo=m&ingreso=1500000&auto=1`,
    waitMs: 6000,
    clip: { x: 0, y: 120, width: 1280, height: 780 },
  },
  {
    file: "cotizador-filtros.png",
    url: `${BASE}/cotizador?agent=cotizadorpremium&region=rm&edad=35&sexo=m&ingreso=1500000&auto=1`,
    waitMs: 6000,
    clip: { x: 0, y: 120, width: 420, height: 900 },
  },
  {
    file: "cotizador-plan-card.png",
    url: `${BASE}/cotizador?agent=cotizadorpremium&region=rm&edad=35&sexo=m&ingreso=1500000&auto=1`,
    waitMs: 6500,
    clip: { x: 440, y: 280, width: 520, height: 560 },
  },
  {
    file: "cotizador-solicitar.png",
    url: `${BASE}/cotizador?agent=cotizadorpremium&region=rm&edad=35&sexo=m&ingreso=1500000&auto=1&vista=solicitar&plan=13-CORE101-26&nombre=María+Pérez&email=maria@ejemplo.cl`,
    waitMs: 8000,
    clip: { x: 180, y: 40, width: 920, height: 820 },
  },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
    locale: "es-CL",
  });

  for (const shot of SHOTS) {
    const page = await context.newPage();
    console.log(`Capturing ${shot.file}…`);
    await page.goto(shot.url, { waitUntil: "networkidle", timeout: 90000 });
    await page.waitForTimeout(shot.waitMs);
    await page.screenshot({
      path: path.join(OUT_DIR, shot.file),
      clip: shot.clip,
      type: "png",
    });
    await page.close();
    console.log(`  → ${shot.file}`);
  }

  await browser.close();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
