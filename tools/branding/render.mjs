// Renders the README logo, lockup and banner from brand.html to PNGs in docs/media/.
// Usage (from the repo root, needs `npm install` in web/ and Google Chrome): node tools/branding/render.mjs
import { chromium } from '../../web/node_modules/playwright-core/index.mjs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../../docs/media');

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1400 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(resolve(here, 'brand.html')).href);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(500);

await page.locator('#logo').screenshot({ path: `${out}/logo.png`, omitBackground: true });
await page.locator('#lockup').screenshot({ path: `${out}/lockup.png`, omitBackground: true });
await page.locator('#banner').screenshot({ path: `${out}/banner.png` });
await browser.close();
console.log('wrote logo.png, lockup.png, banner.png to', out);
