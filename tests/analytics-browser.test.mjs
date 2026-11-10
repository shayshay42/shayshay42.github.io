import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = (process.env.BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const production = 'https://shayshay42.github.io';
const trackerUrl = 'https://cloud.umami.is/script.js';
const websiteId = '42412014-5b93-4857-9db8-9bb357a3c29b';
const pages = [
  'index.html',
  'notes/weighted-weak-lorenz.html',
  'notes/oil-and-learned-optimization.html',
  'notes/steering-a-forecasting-model.html',
  'projects/molecular-game-of-life/index.html',
  'projects/voice-laser-lab/index.html',
  'projects/stereogram-runner/index.html',
];

async function makeContext(browser, { blocked = false, privacy } = {}) {
  const context = await browser.newContext({ reducedMotion: 'reduce', acceptDownloads: true });
  const trackerRequests = [];
  const errors = [];
  // Serve real local pages under the production origin. Never send test analytics.
  await context.route(`${production}/**`, async route => {
    const url = new URL(route.request().url());
    const response = await context.request.get(`${base}${url.pathname}${url.search}`);
    await route.fulfill({ response });
  });
  await context.route('https://cloud.umami.is/**', async route => {
    trackerRequests.push(route.request().url());
    assert.equal(route.request().url(), trackerUrl, 'Tests must not write to the analytics API.');
    if (blocked) return route.abort('blockedbyclient');
    await route.fulfill({ contentType: 'text/javascript', body: `
      window.__umamiCalls = [];
      window.umami = { track(...args) {
        window.__umamiCalls.push(args);
        return Promise.resolve();
      }};
    ` });
  });
  if (privacy) await context.addInitScript(privacy => {
    Object.defineProperty(navigator, privacy, { configurable: true, get: () => privacy === 'doNotTrack' ? '1' : true });
  }, privacy);
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  return { context, page, trackerRequests, errors };
}

async function calls(page) {
  return page.evaluate(() => window.__umamiCalls || []);
}

async function expectStart(page, name) {
  await page.waitForFunction(name => window.__umamiCalls?.some(args => args[0] === name), name);
  assert.deepEqual(await calls(page), [[name]], 'Record only the fixed start event, once.');
}

test('site analytics integration', { timeout: 120_000 }, async t => {
  const browser = await chromium.launch({
    channel: process.env.BROWSER_CHANNEL || undefined,
    headless: true,
    args: ['--enable-unsafe-swiftshader'],
  });
  try {
    await t.test('all public pages include one local loader; redirect and tools do not', async () => {
      for (const path of pages) {
        const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
        const scripts = [...html.matchAll(/<script\b[^>]*src="([^"]*analytics\.js)"[^>]*><\/script>/g)];
        assert.equal(scripts.length, 1, path);
        assert.equal(new URL(scripts[0][1], `${production}/${path}`).href, `${production}/analytics.js`);
        assert.ok(scripts[0].index < html.indexOf('</head>'), path);
      }
      for (const path of ['publications.html', 'tools/export-sharpener.html']) {
        const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
        assert.ok(!html.includes('analytics.js'), path);
      }
    });

    await t.test('local previews never load the external tracker', async () => {
      const { context, page, trackerRequests } = await makeContext(browser);
      try {
        await page.goto(`${base}/notes/weighted-weak-lorenz.html`);
        assert.equal(await page.locator('script[src$="analytics.js"]').count(), 1);
        assert.equal(await page.locator(`script[src="${trackerUrl}"]`).count(), 0);
        assert.deepEqual(trackerRequests, []);
      } finally { await context.close(); }
    });

    await t.test('production loader config and fixed click events preserve default actions', async () => {
      const { context, page, trackerRequests, errors } = await makeContext(browser);
      try {
        await page.goto(`${production}/index.html?private-input=ignored#notebook`);
        await page.waitForFunction(() => !!window.umami);
        const tracker = page.locator(`script[src="${trackerUrl}"]`);
        assert.equal(await tracker.count(), 1);
        assert.equal(await tracker.getAttribute('data-website-id'), websiteId);
        assert.equal(await tracker.getAttribute('data-domains'), 'shayshay42.github.io');
        for (const flag of ['exclude-search', 'exclude-hash', 'do-not-track']) {
          assert.equal(await tracker.getAttribute(`data-${flag}`), 'true');
        }
        assert.deepEqual(trackerRequests, [trackerUrl]);
        // This last listener inspects the analytics listener, then prevents navigation for the test only.
        await page.evaluate(() => {
          window.__defaultPrevented = [];
          document.addEventListener('click', event => {
            if (!event.target.closest('a')) return;
            window.__defaultPrevented.push(event.defaultPrevented);
            event.preventDefault();
          });
        });
        for (const language of ['en', 'fr']) await page.locator(`.site-nav a[hreflang="${language}"]`).click();
        const projectNames = [
          ['voice-laser-lab', 'Open Voice Laser Lab'],
          ['stereogram-runner', 'Open Stereogram Runner'],
          ['mol-cgl', 'Open Molecular Game of Life'],
          ['readtheroom', 'Open Read the Room'],
          ['rizome', 'Open Rizome Biotech'],
        ];
        for (const [kind] of projectNames) {
          await page.locator('.project-link').filter({ has: page.locator(`[data-project="${kind}"]`) }).evaluate(link => link.click());
        }
        assert.deepEqual(await calls(page), ['CV English', 'CV French', ...projectNames.map(([, name]) => name)].map(name => [name]));
        assert.deepEqual(await page.evaluate(() => window.__defaultPrevented), Array(7).fill(false));
        assert.deepEqual(errors, []);
      } finally { await context.close(); }
    });

    await t.test('molecular Play records a successful start only once', async () => {
      const { context, page, errors } = await makeContext(browser);
      try {
        await page.goto(`${production}/projects/molecular-game-of-life/`);
        await page.waitForFunction(() => document.getElementById('play-pause')?.disabled === false);
        assert.deepEqual(await calls(page), []);
        await page.click('#play-pause');
        await expectStart(page, 'Start Molecular Game of Life');
        await page.click('#play-pause');
        await page.click('#reset');
        await page.click('#play-pause');
        await page.waitForFunction(() => Number(document.getElementById('generation').textContent) > 0);
        await expectStart(page, 'Start Molecular Game of Life');
        assert.deepEqual(errors, []);
      } finally { await context.close(); }
    });

    await t.test('Stereogram keyboard starts count once across pause and resume', async () => {
      const { context, page, errors } = await makeContext(browser);
      try {
        await page.goto(`${production}/projects/stereogram-runner/`);
        await page.waitForSelector('.playfield canvas[data-ready="true"]');
        await page.locator('.playfield').focus();
        await page.keyboard.press('Space');
        await expectStart(page, 'Start Stereogram Runner');
        await page.getByTestId('game-action').click();
        await page.getByTestId('game-action').click();
        await expectStart(page, 'Start Stereogram Runner');
        assert.deepEqual(errors, []);
      } finally { await context.close(); }
    });

    await t.test('Voice demo playback counts once across stop and restart', async () => {
      const { context, page, errors } = await makeContext(browser);
      try {
        await page.goto(`${production}/projects/voice-laser-lab/`);
        await page.waitForFunction(() => document.querySelector('[data-testid="play-toggle"]')?.disabled === false);
        await page.getByTestId('play-toggle').click();
        await expectStart(page, 'Start Voice Laser Lab');
        await page.getByTestId('stop-audio').click();
        await page.getByTestId('play-toggle').click();
        await expectStart(page, 'Start Voice Laser Lab');
        assert.deepEqual(errors, []);
      } finally { await context.close(); }
    });

    await t.test('blocked analytics leaves CV downloads and project controls working', async () => {
      const { context, page, errors } = await makeContext(browser, { blocked: true });
      try {
        await page.goto(`${production}/index.html`);
        const downloadPromise = page.waitForEvent('download');
        await page.locator('.site-nav a[hreflang="en"]').click();
        const download = await downloadPromise;
        assert.equal(download.suggestedFilename(), 'shayan-hajhashemi-cv-en.pdf');
        assert.equal(await download.failure(), null);
        await page.locator('.project-link').filter({ has: page.locator('[data-project="mol-cgl"]') }).click();
        await page.waitForURL(`${production}/projects/molecular-game-of-life/`);
        await page.waitForFunction(() => document.getElementById('play-pause')?.disabled === false);
        await page.click('#play-pause');
        await page.waitForFunction(() => Number(document.getElementById('generation').textContent) > 0);
        await page.click('#play-pause');
        assert.equal(await page.locator('#play-pause').textContent(), 'Play');
        assert.deepEqual(errors, []);
      } finally { await context.close(); }
    });

    await t.test('DNT and GPC prevent tracker loading on the production origin', async () => {
      for (const privacy of ['doNotTrack', 'globalPrivacyControl']) {
        const { context, page, trackerRequests } = await makeContext(browser, { privacy });
        try {
          await page.goto(`${production}/notes/weighted-weak-lorenz.html`);
          assert.equal(await page.locator(`script[src="${trackerUrl}"]`).count(), 0);
          assert.deepEqual(trackerRequests, []);
        } finally { await context.close(); }
      }
    });
  } finally { await browser.close(); }
});
