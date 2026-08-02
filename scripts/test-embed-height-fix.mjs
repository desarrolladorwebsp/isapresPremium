import { chromium, devices } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "storage", "debug-screenshots");
const BASE_URL = process.env.EMBED_BASE_URL ?? "http://localhost:3001";

async function runScenario(browser, label, viewport) {
  const context = await browser.newContext(
    viewport
      ? { viewport }
      : { ...devices["iPhone 13"] },
  );
  const page = await context.newPage();

  await page.setContent(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body { margin: 0; font-family: system-ui, sans-serif; background: #f8fafc; }
          header { padding: 16px; background: #0f172a; color: white; }
          [data-cotizador-widget].cv-widget { overflow: visible !important; max-height: none !important; }
        </style>
      </head>
      <body>
        <header>Test embed — ${label}</header>
        <section
          id="cotizador-test"
          data-cotizador-widget
          data-agent-key="isaprespremium"
          data-base-url="${BASE_URL}"
          data-full-width="true"
          data-mobile-scroll="auto"
          data-min-height="720"
        ></section>
        <script src="${BASE_URL}/cotizador-widget.js" defer></script>
        <script>
          window.__cvMsgs = [];
          window.addEventListener('message', (e) => {
            if (e.data?.source === 'cotizador-premium' && e.data?.type?.includes('resize')) {
              window.__cvMsgs.push({
                height: e.data.height,
                finite: Number.isFinite(e.data.height),
              });
            }
          });
        </script>
      </body>
    </html>
  `);

  await page.waitForTimeout(12000);

  const metrics = await page.evaluate(() => {
    const widget = document.querySelector("[data-cotizador-widget]");
    const iframe = widget?.querySelector("iframe");
    return {
      iframeHeight: iframe?.style.height ?? null,
      resizeMsgs: window.__cvMsgs ?? [],
      lastFinite: [...(window.__cvMsgs ?? [])].reverse().find((m) => m.finite)?.height ?? null,
    };
  });

  await mkdir(OUT_DIR, { recursive: true });
  const screenshotPath = path.join(OUT_DIR, `${label}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  const widgetShot = path.join(OUT_DIR, `${label}-widget.png`);
  await page.locator("[data-cotizador-widget]").screenshot({ path: widgetShot });

  await context.close();

  return { label, metrics, screenshotPath, widgetShot, baseUrl: BASE_URL };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const results = [
    await runScenario(browser, "local-desktop-1440", { width: 1440, height: 900 }),
    await runScenario(browser, "local-mobile-iphone13", null),
  ];
  await browser.close();

  const reportPath = path.join(OUT_DIR, "local-fix-report.json");
  await writeFile(reportPath, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
