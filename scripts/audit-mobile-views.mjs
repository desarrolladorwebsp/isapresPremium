/**
 * Auditoría móvil del cotizador y widget embed.
 * Uso: node scripts/audit-mobile-views.mjs [baseUrl]
 */
import { chromium, devices } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "../storage/debug-screenshots/mobile-audit-postfix");
const BASE = (process.argv[2] ?? "http://localhost:3001").replace(/\/$/, "");

const VIEWS = [
  {
    id: "cotizador-criterios",
    url: `${BASE}/cotizador?agent=cotizadorpremium`,
    waitMs: 3000,
    actions: [],
  },
  {
    id: "cotizador-resultados",
    url: `${BASE}/cotizador?agent=cotizadorpremium&region=rm&edad=35&sexo=m&ingreso=1500000&auto=1`,
    waitMs: 7000,
    actions: [],
  },
  {
    id: "cotizador-filtros-drawer",
    url: `${BASE}/cotizador?agent=cotizadorpremium&region=rm&edad=35&sexo=m&ingreso=1500000&auto=1`,
    waitMs: 7000,
    actions: [
      { type: "click", selector: 'button[aria-label="Abrir filtros y beneficiarios"]' },
      { type: "wait", ms: 800 },
    ],
  },
  {
    id: "cotizador-solicitar-modal",
    url: `${BASE}/cotizador?agent=cotizadorpremium&region=rm&edad=35&sexo=m&ingreso=1500000&auto=1&vista=solicitar&plan=13-CORE101-26&nombre=María+Pérez&email=maria@ejemplo.cl`,
    waitMs: 9000,
    actions: [],
  },
  {
    id: "embed-criterios",
    url: `${BASE}/embed/cotizadorpremium`,
    waitMs: 3000,
    actions: [],
  },
  {
    id: "embed-resultados",
    url: `${BASE}/embed/cotizadorpremium?region=rm&edad=35&sexo=m&ingreso=1500000&auto=1`,
    waitMs: 7000,
    actions: [],
  },
  {
    id: "embed-solicitar-modal",
    url: `${BASE}/embed/cotizadorpremium?region=rm&edad=35&sexo=m&ingreso=1500000&tipo=dependiente&auto=1&vista=solicitar&plan=13-CORE101-26&nombre=María+Pérez&email=maria@ejemplo.cl`,
    waitMs: 9000,
    actions: [],
  },
  {
    id: "embed-filtros-drawer",
    url: `${BASE}/embed/cotizadorpremium?region=rm&edad=35&sexo=m&ingreso=1500000&auto=1`,
    waitMs: 7000,
    actions: [
      { type: "click", selector: 'button[aria-label="Abrir filtros y beneficiarios"]' },
      { type: "wait", ms: 800 },
    ],
  },
];

async function measureOverflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const appShell = document.querySelector(".app-shell-scroll");
    const embedRoot = document.querySelector('[data-embed="true"]');
    const modalScroll = document.querySelector(
      '[role="dialog"][aria-labelledby="contract-plan-title"] .app-shell-scroll, [role="dialog"][aria-labelledby="contract-plan-title"] [class*="overflow-y-auto"]',
    );
    const filterScroll = document.querySelector(
      'aside[aria-label="Filtros de búsqueda"] .filters-sidebar-scroll',
    );
    const scrollables = Array.from(
      document.querySelectorAll(".app-shell-scroll, [role='dialog'], aside[aria-label='Filtros de búsqueda']"),
    ).map((el) => {
      const style = window.getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute("role"),
        ariaLabel: el.getAttribute("aria-label"),
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        overflowY: style.overflowY,
        canScroll: el.scrollHeight > el.clientHeight + 2,
      };
    });

    return {
      docScrollWidth: doc.scrollWidth,
      docClientWidth: doc.clientWidth,
      bodyScrollWidth: body.scrollWidth,
      bodyClientWidth: body.clientWidth,
      horizontalOverflow: Math.max(doc.scrollWidth - doc.clientWidth, body.scrollWidth - body.clientWidth),
      viewportHeight: window.innerHeight,
      docScrollHeight: doc.scrollHeight,
      appShell: appShell
        ? {
            scrollHeight: appShell.scrollHeight,
            clientHeight: appShell.clientHeight,
            overflowY: window.getComputedStyle(appShell).overflowY,
          }
        : null,
      embedRoot: embedRoot
        ? {
            scrollHeight: embedRoot.scrollHeight,
            clientHeight: embedRoot.clientHeight,
          }
        : null,
      modalScroll: modalScroll
        ? {
            scrollHeight: modalScroll.scrollHeight,
            clientHeight: modalScroll.clientHeight,
            overflowY: window.getComputedStyle(modalScroll).overflowY,
            canScroll: modalScroll.scrollHeight > modalScroll.clientHeight + 2,
          }
        : null,
      filterScroll: filterScroll
        ? {
            scrollHeight: filterScroll.scrollHeight,
            clientHeight: filterScroll.clientHeight,
            overflowY: window.getComputedStyle(filterScroll).overflowY,
            canScroll: filterScroll.scrollHeight > filterScroll.clientHeight + 2,
          }
        : null,
      scrollables,
    };
  });
}

async function runActions(page, actions) {
  for (const action of actions) {
    if (action.type === "wait") {
      await page.waitForTimeout(action.ms);
      continue;
    }
    if (action.type === "click") {
      const locator = page.locator(action.selector);
      const target = action.first ? locator.first() : locator;
      if (await target.count()) {
        await target.click({ timeout: 8000 }).catch(() => undefined);
      }
    }
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const iphone = devices["iPhone 13"];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...iphone,
    locale: "es-CL",
  });

  const report = [];

  for (const view of VIEWS) {
    const page = await context.newPage();
    console.log(`Auditing ${view.id}…`);
    try {
      await page.goto(view.url, { waitUntil: "networkidle", timeout: 120000 });
      await page.waitForTimeout(view.waitMs);
      await runActions(page, view.actions);

      const metrics = await measureOverflow(page);
      const shotPath = path.join(OUT_DIR, `${view.id}.png`);
      await page.screenshot({ path: shotPath, fullPage: true });

      report.push({
        id: view.id,
        url: view.url,
        metrics,
        screenshot: shotPath,
        issues: [
          ...(metrics.horizontalOverflow > 2
            ? [`horizontal overflow ${metrics.horizontalOverflow}px`]
            : []),
          ...(metrics.appShell &&
          metrics.appShell.scrollHeight > metrics.appShell.clientHeight + 4 &&
          metrics.appShell.overflowY !== "auto" &&
          metrics.appShell.overflowY !== "scroll"
            ? ["app shell content clipped without scroll"]
            : []),
          ...(metrics.filterScroll &&
          metrics.filterScroll.canScroll &&
          metrics.filterScroll.overflowY !== "auto" &&
          metrics.filterScroll.overflowY !== "scroll"
            ? ["filters drawer content clipped without scroll"]
            : []),
          ...(metrics.modalScroll &&
          metrics.modalScroll.canScroll &&
          metrics.modalScroll.overflowY !== "auto" &&
          metrics.modalScroll.overflowY !== "scroll"
            ? ["modal content clipped without scroll"]
            : []),
        ],
      });
      console.log(`  overflow-x: ${metrics.horizontalOverflow}px`);
    } catch (error) {
      report.push({
        id: view.id,
        url: view.url,
        error: error instanceof Error ? error.message : String(error),
      });
      console.log(`  ERROR: ${error instanceof Error ? error.message : error}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();

  const reportPath = path.join(OUT_DIR, "report.json");
  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`\nReport: ${reportPath}`);
  console.log(`Screenshots: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
