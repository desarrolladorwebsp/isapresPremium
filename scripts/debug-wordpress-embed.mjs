import { chromium, devices } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const URL = "https://isaprespremium.cl";
const OUT_DIR = path.join(process.cwd(), "storage", "debug-screenshots");

async function installResizeListener(page) {
  await page.addInitScript(() => {
    window.__cvMsgs = [];
    window.addEventListener("message", (event) => {
      const data = event.data;
      if (
        data?.source === "cotizador-premium" &&
        data?.type === "cotizador-premium:resize" &&
        Number.isFinite(data.height)
      ) {
        window.__cvMsgs.push(data.height);
      }
    });
  });
}

async function measurePage(page, label) {
  await page.waitForTimeout(12000);

  const metrics = await page.evaluate(() => {
    const widget = document.querySelector("[data-cotizador-widget]");
    const iframe = widget?.querySelector("iframe");
    const rect = widget?.getBoundingClientRect();
    const iframeRect = iframe?.getBoundingClientRect();

    return {
      widgetFound: Boolean(widget),
      widgetHeight: widget?.offsetHeight ?? null,
      widgetStyleHeight: widget?.style.height ?? null,
      widgetDataset: widget
        ? {
            mobileScroll: widget.dataset.mobileScroll,
            cvMounted: widget.dataset.cvMounted,
            fullWidth: widget.dataset.fullWidth,
          }
        : null,
      iframeHeight: iframe?.offsetHeight ?? null,
      iframeStyleHeight: iframe?.style.height ?? null,
      iframeScrolling: iframe?.getAttribute("scrolling") ?? null,
      iframeSrc: iframe?.src ?? null,
      iframeReady: iframe?.dataset.ready ?? null,
      iframeRectHeight: iframeRect?.height ?? null,
      widgetRectHeight: rect?.height ?? null,
      resizeMessages: window.__cvMsgs ?? [],
      viewport: { w: window.innerWidth, h: window.innerHeight },
      scrollY: window.scrollY,
      bodyScrollHeight: document.body.scrollHeight,
    };
  });

  const screenshotPath = path.join(OUT_DIR, `${label}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });

  const widgetShot = path.join(OUT_DIR, `${label}-widget.png`);
  const widget = page.locator("[data-cotizador-widget]");
  if ((await widget.count()) > 0) {
    await widget.first().screenshot({ path: widgetShot });
  }

  return { label, metrics, screenshotPath, widgetShot };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const results = [];

  // Desktop
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await installResizeListener(page);
    await page.goto(URL, { waitUntil: "networkidle", timeout: 90000 });
    await page.locator("#cotizador-isapre-premium").scrollIntoViewIfNeeded();
    results.push(await measurePage(page, "desktop-1440"));
    await context.close();
  }

  // Mobile
  {
    const context = await browser.newContext({
      ...devices["iPhone 13"],
    });
    const page = await context.newPage();
    await installResizeListener(page);
    await page.goto(URL, { waitUntil: "networkidle", timeout: 90000 });
    await page.locator("#cotizador-isapre-premium").scrollIntoViewIfNeeded();
    results.push(await measurePage(page, "mobile-iphone13"));
    await context.close();
  }

  await browser.close();

  const reportPath = path.join(OUT_DIR, "report.json");
  await writeFile(reportPath, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  console.log(`\nScreenshots saved to ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
