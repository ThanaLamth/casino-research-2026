import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const proxyServer = process.env.PLAYWRIGHT_PROXY_SERVER || "";
const proxyUsername = process.env.PLAYWRIGHT_PROXY_USERNAME || "";
const proxyPassword = process.env.PLAYWRIGHT_PROXY_PASSWORD || "";

const jobs = [
  {
    brand: "draftkings",
    name: "draftkings-public-casino-page-june-2026.png",
    url: "https://games.draftkings.com/about/casino/",
    width: 1440,
    height: 2200,
    waitUntil: "networkidle",
  },
  {
    brand: "caesars-palace-online",
    name: "caesars-public-getting-started-june-2026.png",
    url: "https://caesarspalaceonline.com/support/getting-started?state=pa",
    width: 1440,
    height: 2200,
    waitUntil: "domcontentloaded",
  },
  {
    brand: "betrivers",
    name: "betrivers-public-home-june-2026.png",
    url: "https://pa.betrivers.com/?page=casino-home",
    width: 1440,
    height: 2200,
    waitUntil: "domcontentloaded",
  },
  {
    brand: "fanduel",
    name: "fanduel-public-casino-101-june-2026.png",
    url: "https://www.fanduel.com/casino-101/getting-started/",
    width: 1440,
    height: 2200,
    waitUntil: "networkidle",
  },
  {
    brand: "betmgm",
    name: "betmgm-public-state-legality-guide-june-2026.png",
    url: "https://casino.betmgm.com/en/blog/what-states-is-betmgm-casino-legal-in/",
    width: 1440,
    height: 2200,
    waitUntil: "networkidle",
  },
];

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  proxy: proxyServer
    ? {
        server: proxyServer,
        username: proxyUsername || undefined,
        password: proxyPassword || undefined,
      }
    : undefined,
});

for (const job of jobs) {
  const outDir = path.join("assets", "review", job.brand);
  await fs.mkdir(outDir, { recursive: true });
  const page = await browser.newPage({
    viewport: { width: job.width, height: 1200 },
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    locale: "en-US",
  });
  try {
    await page.goto(job.url, { waitUntil: job.waitUntil, timeout: 45000 });
    await page.screenshot({
      path: path.join(outDir, job.name),
      fullPage: true,
    });
    console.log(`OK ${job.brand} ${job.name}`);
  } catch (err) {
    console.log(`FAIL ${job.brand} ${job.url}`);
    console.log(String(err));
  } finally {
    await page.close();
  }
}

await browser.close();
