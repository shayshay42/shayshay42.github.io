import test from 'node:test';
import assert from 'node:assert/strict';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = (process.env.BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const app = `${base}/projects/voice-laser-lab/`;
const selector = '[data-project="voice-laser-lab"]';

test('homepage project cards and Voice Laser Lab', async t => {
  const browser = await chromium.launch({
    channel: process.env.BROWSER_CHANNEL || undefined, headless: true,
    args: ['--enable-unsafe-swiftshader'],
  });
  try {
    await t.test('Voice Laser Lab card renders, tilts on focus, and respects reduced motion', async () => {
      const page = await browser.newPage();
      await page.addInitScript(() => {
        window.__voiceLogoDraws = 0;
        for (const Context of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
          for (const method of ['drawElements', 'drawArrays']) {
            const original = Context?.prototype[method];
            if (!original) continue;
            Context.prototype[method] = function (...args) {
              if (this.canvas.closest?.('[data-project="voice-laser-lab"]')) window.__voiceLogoDraws++;
              return original.apply(this, args);
            };
          }
        }
      });
      const appRequests = [];
      page.on('request', request => { if (request.url().startsWith(app)) appRequests.push(request.url()); });
      await page.goto(base);
      const logo = page.locator(selector), link = page.locator('.project-link').filter({has: logo});
      await logo.scrollIntoViewIfNeeded();
      await page.waitForSelector(`${selector}.is-ready canvas`);
      await page.waitForTimeout(400);
      const before = await page.evaluate(() => window.__voiceLogoDraws);
      await link.focus();
      await page.waitForTimeout(500);
      assert.ok(await page.evaluate(() => window.__voiceLogoDraws) > before, 'Keyboard focus must render the tilted view.');
      await page.emulateMedia({reducedMotion: 'reduce'});
      await link.blur();
      await page.waitForTimeout(200);
      const still = await page.evaluate(() => window.__voiceLogoDraws);
      await link.focus();
      const box = await logo.boundingBox();
      await page.mouse.move(box.x + box.width * .9, box.y + box.height * .2);
      await page.waitForTimeout(250);
      assert.equal(await page.evaluate(() => window.__voiceLogoDraws), still, 'Reduced motion must not redraw the 3D view on focus or hover.');
      assert.deepEqual(appRequests, [], 'The homepage must not preload the simulation or its model.');
      await page.keyboard.press('Enter');
      await page.waitForURL(app);
      assert.equal(await page.getByRole('heading', {name: 'On listening', level: 1}).count(), 1);
      await page.close();
    });

    await t.test('Cliqity follows Rizome and opens from its 3D project card', async () => {
      const page = await browser.newPage();
      await page.goto(base);
      const order = await page.locator('.project-card [data-project]').evaluateAll(logos => logos.map(logo => logo.dataset.project));
      assert.deepEqual(order, ['voice-laser-lab', 'stereogram-runner', 'mol-cgl', 'readtheroom', 'rizome', 'cliqity']);
      const link = page.getByRole('link', {name: 'Finch by Cliqity', exact: true});
      await link.scrollIntoViewIfNeeded();
      await link.locator('[data-project="cliqity"].is-ready canvas').waitFor();
      // Exercise the external link without contacting the project website.
      const destination = 'https://cliqity.org/';
      await page.context().route(destination, route => route.fulfill({contentType: 'text/html', body: '<title>Finch by Cliqity</title>'}));
      await link.focus();
      await Promise.all([
        page.context().waitForEvent('response', response => response.url() === destination && response.request().isNavigationRequest()),
        page.keyboard.press('Enter'),
      ]);
      await page.close();
    });

    await t.test('PNG fallback and project link survive disabled WebGL or JavaScript', async () => {
      for (const noJs of [false, true]) {
        const context = await browser.newContext({javaScriptEnabled: !noJs, viewport: {width:390,height:844}});
        if (!noJs) await context.addInitScript(() => {
          const original = HTMLCanvasElement.prototype.getContext;
          HTMLCanvasElement.prototype.getContext = function (type, ...args) {
            return type.startsWith('webgl') ? null : original.call(this, type, ...args);
          };
        });
        const page = await context.newPage();
        await page.goto(base);
        const logo = page.locator(selector);
        await logo.scrollIntoViewIfNeeded();
        await page.waitForFunction(selector => {
          const image = document.querySelector(`${selector} img`);
          return image.complete && image.naturalWidth === 720;
        }, selector);
        assert.equal(await logo.locator('img').isVisible(), true);
        assert.equal(await logo.locator('canvas').count(), 0);
        assert.equal(await page.locator('.project-link').filter({has: logo}).getAttribute('href'), 'projects/voice-laser-lab/');
        const cliqity = page.getByRole('link', {name: 'Finch by Cliqity', exact: true});
        await cliqity.scrollIntoViewIfNeeded();
        const finch = cliqity.locator('img');
        assert.equal(await cliqity.getAttribute('href'), 'https://cliqity.org/');
        assert.equal(await finch.getAttribute('src'), 'assets/projects/cliqity.png');
        await finch.evaluate(image => image.decode());
        assert.equal(await finch.isVisible(), true);
        assert.deepEqual(await finch.evaluate(image => [image.naturalWidth, image.naturalHeight]), [720,440]);
        assert.equal(await cliqity.locator('canvas').count(), 0);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        if (noJs) {
          await page.locator('.project-link').filter({has: logo}).click();
          await page.waitForURL(app);
          assert.match(await page.locator('noscript').innerText(), /needs JavaScript/);
        }
        await context.close();
      }
    });

    await t.test('nested app loads its assets, runs demo audio, and links back to the notebook', async () => {
      const page = await browser.newPage({viewport:{width:390,height:844}});
      const failures=[], requests=[], errors=[];
      page.on('request', request => requests.push(request.url()));
      page.on('response', response => { if (response.url().startsWith(base) && response.status() >= 400) failures.push(response.url()); });
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(app);
      await page.waitForFunction(() => document.querySelector('[data-testid="play-toggle"]')?.disabled === false);
      await page.getByTestId('play-toggle').click();
      await page.waitForFunction(() => /running/i.test(document.querySelector('[data-testid="app-status"]').textContent));
      await page.waitForFunction(() => document.querySelector('[aria-label*="Orbitable model"]')?.getAttribute('aria-busy') === 'false');
      await page.getByTestId('stop-audio').click();
      for(const asset of ['generated/physics-poster.png','models/human/speaker.glb']) {
        assert.ok(requests.includes(app + asset), `Missing nested asset request: ${asset}`);
      }
      // Chromium does not emit page-level request events for AudioWorklet fetches.
      // Successful playback above exercises addModule; also check its served URL.
      assert.equal((await page.request.get(app + 'generated/audio-processor.js')).status(), 200);
      assert.ok(requests.filter(url => /^https?:/.test(url)).every(url => url.startsWith(app) || url === `${base}/analytics.js`), 'The local app must only fetch its static assets and the shared analytics loader.');
      assert.deepEqual(failures, []); assert.deepEqual(errors, []);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.getByRole('link', {name:'Back to the notebook'}).click();
      await page.waitForURL(`${base}/#projects`);
      await page.close();
    });
  } finally { await browser.close(); }
});
