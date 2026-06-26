import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1200, height: 675 },
  deviceScaleFactor: 1,
});

await page.goto("http://127.0.0.1:3005", { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: "ログイン" }).click();
await page.getByRole("heading", { name: "リリース準備ボード" }).waitFor();
await page.screenshot({
  path: "D:/Users/narafu/dev/portfolio/public/projects/kanban.png",
  fullPage: false,
});

await browser.close();
