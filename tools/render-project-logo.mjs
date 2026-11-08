// Render a PNG fallback with the same geometry, lighting, and camera as its card.
// Run from the website root with a local server and PLAYWRIGHT_MODULE configured.
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');

const kind = process.argv[2] || 'voice-laser-lab';
if (!['readtheroom', 'rizome', 'mol-cgl', 'voice-laser-lab', 'stereogram-runner'].includes(kind)) {
  throw new Error(`Unknown project logo: ${kind}`);
}
const base = (process.env.BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true,
  args: ['--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({viewport: {width: 720, height: 440}, deviceScaleFactor: 1, reducedMotion: 'reduce'});
  await page.route(`${base}/__project-logo-preview`, route => route.fulfill({contentType: 'text/html', body: `<!doctype html>
    <html><head><meta charset="utf-8"><style>
    html,body{margin:0;padding:0} .project-logo{position:relative;width:720px;height:440px;background:${kind === 'rizome' ? '#faf7f0' : '#fafaf6'}}
    .project-logo img,.project-logo canvas{display:block;width:100%;height:100%}.project-logo canvas{position:absolute;inset:0}
    .project-logo.is-ready img{visibility:hidden}
    </style></head><body><a class="project-link" href="#"><div class="project-logo" data-project="${kind}">
    <img alt="" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"></div></a>
    <script type="module" src="${base}/project-viewer.js"></script></body></html>`}));
  await page.goto(`${base}/__project-logo-preview`);
  await page.waitForSelector('.project-logo.is-ready canvas');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await mkdir('assets/projects', {recursive: true});
  await page.locator('.project-logo').screenshot({path: `assets/projects/${kind}.png`});
  console.log(`Rendered assets/projects/${kind}.png (720×440).`);
} finally {
  await browser.close();
}
