import { chromium } from "playwright";

const BASE = (process.argv[2] ?? "http://localhost:3001").replace(/\/$/, "");

async function check(url, label) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle" });

  const result = await page.evaluate(() => {
    const branded = document.querySelector("[data-brand]");
    const landing = document.querySelector("[data-landing]");
    const primaryBtn = document.querySelector(".bg-primary");

    return {
      brand: branded?.getAttribute("data-brand") ?? null,
      landing: landing?.hasAttribute("data-landing") ?? false,
      htmlPrimary: getComputedStyle(document.documentElement)
        .getPropertyValue("--primary")
        .trim(),
      bodyBgLayout: getComputedStyle(document.body)
        .getPropertyValue("--bg-layout")
        .trim(),
      bodyBg: getComputedStyle(document.body).backgroundColor,
      brandedPrimary: branded
        ? getComputedStyle(branded).getPropertyValue("--primary").trim()
        : null,
      btnBg: primaryBtn
        ? getComputedStyle(primaryBtn).backgroundColor
        : null,
    };
  });

  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
}

await check(`${BASE}/cotizador?agent=cotizadorpremium`, "Cotizador Premium");
await check(`${BASE}/`, "Landing");
await check(`${BASE}/cotizador`, "Cotizador sin agent (cookie default)");
