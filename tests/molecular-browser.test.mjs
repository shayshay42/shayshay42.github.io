import test from 'node:test';
import assert from 'node:assert/strict';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = (process.env.BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const url = `${base}/projects/molecular-game-of-life/`;

test('molecular playground browser acceptance', async t => {
  const browser = await chromium.launch({
    channel: process.env.BROWSER_CHANNEL || undefined,
    headless: true,
    args: ['--enable-unsafe-swiftshader'],
  });
  const ready = async page => {
    await page.goto(url);
    await page.waitForFunction(() => document.getElementById('molecule-description').textContent === 'Pemoline · 21 atoms');
  };
  try {
    await t.test('initial molecule, controls, reset, speed, and hidden-tab pause', async () => {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await ready(page);
      assert.equal(await page.locator('#generation').textContent(), '0');
      assert.equal(await page.locator('#population').textContent(), '44');
      const initialCanvas = await page.locator('canvas').evaluate(canvas => canvas.toDataURL());
      await page.click('#step');
      assert.equal(await page.locator('#generation').textContent(), '1');
      await page.click('#play-pause');
      await page.waitForFunction(() => Number(document.getElementById('generation').textContent) >= 3);
      await page.click('#play-pause');
      const paused = await page.locator('#generation').textContent();
      await page.waitForTimeout(220);
      assert.equal(await page.locator('#generation').textContent(), paused);
      await page.locator('#speed').fill('30');
      assert.equal(await page.locator('#speed-value').textContent(), '30');
      await page.click('#reset');
      assert.equal(await page.locator('#generation').textContent(), '0');
      assert.equal(await page.locator('canvas').evaluate(canvas => canvas.toDataURL()), initialCanvas);
      await page.click('#play-pause');
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      assert.match(await page.locator('#simulation-status').textContent(), /hidden/);
      assert.equal(await page.locator('#play-pause').textContent(), 'Play');
      assert.deepEqual(errors, []);
      await page.close();
    });

    await t.test('examples and SMILES work without PubChem; invalid input preserves pattern', async () => {
      const page = await browser.newPage();
      await page.route('https://pubchem.ncbi.nlm.nih.gov/**', route => route.abort());
      await ready(page);
      for (const [id, count] of [['ethanol', 9], ['benzene', 12], ['caffeine', 24], ['glucose', 24], ['pemoline', 21]]) {
        await page.click(`[data-example="${id}"]`);
        await page.waitForFunction(count => document.getElementById('molecule-description').textContent.endsWith(`· ${count} atoms`), count);
      }
      await page.selectOption('#input-mode', 'smiles');
      await page.fill('#molecule-query', 'CCO');
      await page.press('#molecule-query', 'Enter');
      await page.waitForFunction(() => document.getElementById('molecule-description').textContent === 'Your molecule · 9 atoms');
      const original = await page.locator('canvas').evaluate(canvas => canvas.toDataURL());
      for (const [smiles, message] of [['not_a_molecule', /could not be read/], ['C'.repeat(40), /at most 100/]]) {
        await page.fill('#molecule-query', smiles);
        await page.click('.load-molecule');
        await page.waitForFunction(() => document.getElementById('load-status').dataset.error === 'true');
        assert.match(await page.locator('#load-status').textContent(), message);
        assert.equal(await page.locator('canvas').evaluate(canvas => canvas.toDataURL()), original);
      }
      await page.selectOption('#input-mode', 'name');
      await page.fill('#molecule-query', 'unreachable molecule');
      await page.click('.load-molecule');
      await page.waitForFunction(() => document.getElementById('load-status').dataset.error === 'true');
      assert.match(await page.locator('#load-status').textContent(), /unavailable/);
      assert.equal(await page.locator('canvas').evaluate(canvas => canvas.toDataURL()), original);
      await page.close();
    });

    await t.test('name submission, unknown names, and stale responses', async () => {
      const page = await browser.newPage();
      let requests = 0;
      let release;
      await page.route('https://pubchem.ncbi.nlm.nih.gov/**', async route => {
        requests += 1;
        const name = decodeURIComponent(new URL(route.request().url()).pathname.split('/name/')[1].split('/property/')[0]);
        if (name === 'slow') await new Promise(resolve => { release = resolve; });
        if (name === 'unknown') return route.fulfill({ status: 404, body: '{}' });
        try { await route.fulfill({ json: { PropertyTable: { Properties: [{ CID: 702, SMILES: 'CCO' }] } } }); } catch { /* cancelled lookup */ }
      });
      await ready(page);
      await page.fill('#molecule-query', 'ethanol');
      assert.equal(requests, 0);
      await page.press('#molecule-query', 'Enter');
      await page.waitForFunction(() => document.getElementById('molecule-description').textContent === 'ethanol · 9 atoms');
      assert.equal(requests, 1);
      await page.fill('#molecule-query', 'unknown');
      await page.click('.load-molecule');
      await page.waitForFunction(() => document.getElementById('load-status').dataset.error === 'true');
      assert.match(await page.locator('#load-status').textContent(), /could not find/);
      assert.equal(await page.locator('#molecule-description').textContent(), 'ethanol · 9 atoms');
      await page.fill('#molecule-query', 'slow');
      await page.click('.load-molecule');
      await page.waitForFunction(() => document.getElementById('load-status').textContent.startsWith('Looking up'));
      while (!release) await page.waitForTimeout(10);
      await page.click('[data-example="benzene"]');
      release();
      await page.waitForFunction(() => document.getElementById('molecule-description').textContent === 'Benzene · 12 atoms');
      await page.waitForTimeout(150);
      assert.equal(await page.locator('#molecule-description').textContent(), 'Benzene · 12 atoms');
      await page.close();
    });

    await t.test('failed WASM load shows a working retry', async () => {
      const page = await browser.newPage();
      await page.route('**/RDKit_minimal.wasm', route => route.abort());
      await page.goto(url);
      await page.locator('#retry-engine').waitFor({ state: 'visible' });
      assert.equal(await page.locator('#play-pause').isDisabled(), true);
      await page.unroute('**/RDKit_minimal.wasm');
      await page.click('#retry-engine');
      await page.waitForFunction(() => document.getElementById('molecule-description').textContent === 'Pemoline · 21 atoms');
      assert.equal(await page.locator('#retry-engine').isVisible(), false);
      await page.close();
    });

    await t.test('mobile layout and keyboard controls', async () => {
      const page = await browser.newPage({ viewport: { width: 320, height: 740 }, reducedMotion: 'reduce' });
      await ready(page);
      for (const width of [320, 390, 768, 1280]) {
        await page.setViewportSize({ width, height: 850 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `overflow at ${width}`);
      }
      await page.focus('#step');
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#generation').textContent(), '1');
      await page.focus('#reset');
      await page.keyboard.press('Space');
      assert.equal(await page.locator('#generation').textContent(), '0');
      await page.close();
    });

    await t.test('home loads no chemistry runtime; logo links and fallback work', async () => {
      const context = await browser.newContext({ reducedMotion: 'reduce' });
      const page = await context.newPage();
      const chemistryRequests = [];
      page.on('request', request => { if (request.url().includes('/rdkit-')) chemistryRequests.push(request.url()); });
      await page.goto(`${base}/`);
      assert.equal(await page.locator('.project-card').count(), 5);
      await page.locator('[data-project="mol-cgl"]').scrollIntoViewIfNeeded();
      await page.locator('[data-project="mol-cgl"] canvas').waitFor();
      assert.deepEqual(chemistryRequests, []);
      await page.locator('.project-link:has([data-project="mol-cgl"])').focus();
      await page.keyboard.press('Enter');
      await page.waitForURL(url);
      await context.close();

      const fallback = await browser.newContext();
      await fallback.addInitScript(() => {
        const getContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(type, ...args) {
          if (type.startsWith('webgl')) return null;
          return getContext.call(this, type, ...args);
        };
      });
      const fallbackPage = await fallback.newPage();
      await fallbackPage.goto(`${base}/`);
      await fallbackPage.locator('[data-project="mol-cgl"]').scrollIntoViewIfNeeded();
      const image = fallbackPage.locator('[data-project="mol-cgl"] img');
      assert.equal(await image.isVisible(), true);
      assert.equal(await image.evaluate(img => img.complete && img.naturalWidth === 720), true);
      await ready(fallbackPage);
      await fallbackPage.click('#step');
      assert.equal(await fallbackPage.locator('#generation').textContent(), '1');
      await fallback.close();

      const noJs = await browser.newContext({ javaScriptEnabled: false });
      const noJsPage = await noJs.newPage();
      await noJsPage.goto(url);
      assert.equal(await noJsPage.locator('noscript').isVisible(), true);
      await noJsPage.locator('summary').click();
      assert.match(await noJsPage.locator('.how-it-works').innerText(), /100 × 100/);
      await noJs.close();
    });
  } finally {
    await browser.close();
  }
});
