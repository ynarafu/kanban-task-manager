import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1200, height: 675 },
  deviceScaleFactor: 1,
});

await page.goto("http://127.0.0.1:3003", { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: "Sign in" }).click();
await page.getByRole("heading", { name: "Launch board" }).waitFor();
await page.screenshot({
  path: "D:/Users/narafu/dev/portfolio/public/projects/kanban.png",
  fullPage: false,
});

await browser.close();
