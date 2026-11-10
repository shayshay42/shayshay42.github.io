import test from 'node:test';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = (process.env.BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const app = `${base}/projects/stereogram-runner/`;
const selector = '[data-project="stereogram-runner"]';

test('Stereogram Runner project and nested app', async t => {
  const browser = await chromium.launch({
    channel: process.env.BROWSER_CHANNEL || undefined, headless: true,
    args: ['--enable-unsafe-swiftshader'],
  });
  try {
    await t.test('Stereogram Runner card renders, responds to focus, and keeps the game lazy', async () => {
      const page = await browser.newPage();
      await page.addInitScript(() => {
        window.__stereogramLogoDraws = 0;
        for (const Context of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
          for (const method of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
            const original = Context?.prototype[method];
            if (!original) continue;
            Context.prototype[method] = function (...args) {
              if (this.canvas.closest?.('[data-project="stereogram-runner"]')) window.__stereogramLogoDraws++;
              return original.apply(this, args);
            };
          }
        }
      });
      const requests=[];
      page.on('request', request => {if(request.url().startsWith(app)) requests.push(request.url());});
      await page.goto(base);
      assert.equal(await page.locator('.project-card').count(),5);
      const logo=page.locator(selector), link=page.locator('.project-link').filter({has:logo});
      await logo.scrollIntoViewIfNeeded();
      await page.waitForSelector(`${selector}.is-ready canvas`);
      await page.waitForTimeout(300);
      const before=await page.evaluate(()=>window.__stereogramLogoDraws);
      await link.focus();await page.waitForTimeout(500);
      assert.ok(await page.evaluate(()=>window.__stereogramLogoDraws)>before);
      await page.emulateMedia({reducedMotion:'reduce'});await link.blur();await page.waitForTimeout(250);
      const still=await page.evaluate(()=>window.__stereogramLogoDraws);
      await link.focus();const box=await logo.boundingBox();
      await page.mouse.move(box.x+box.width*.9,box.y+box.height*.2);await page.waitForTimeout(250);
      assert.equal(await page.evaluate(()=>window.__stereogramLogoDraws),still);
      assert.deepEqual(requests,[]);
      await page.keyboard.press('Enter');await page.waitForURL(app);
      await page.waitForSelector('.playfield canvas[data-ready="true"]');
      await page.close();
    });

    await t.test('fallback image and link work without WebGL or JavaScript', async () => {
      for(const noJs of [false,true]) {
        const context=await browser.newContext({javaScriptEnabled:!noJs,viewport:{width:390,height:844}});
        if(!noJs) await context.addInitScript(()=>{
          const original=HTMLCanvasElement.prototype.getContext;
          HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:original.call(this,type,...args);};
        });
        const page=await context.newPage();await page.goto(base);
        const logo=page.locator(selector);await logo.scrollIntoViewIfNeeded();
        await page.waitForFunction(selector=>{const img=document.querySelector(`${selector} img`);return img.complete&&img.naturalWidth===720;},selector);
        assert.equal(await logo.locator('img').isVisible(),true);
        assert.equal(await logo.locator('canvas').count(),0);
        const link=page.locator('.project-link').filter({has:logo});
        assert.equal(await link.getAttribute('href'),'projects/stereogram-runner/');
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        if(noJs){await link.click();await page.waitForURL(app);assert.match(await page.locator('noscript').innerText(),/needs JavaScript/);}
        await context.close();
      }
    });

    await t.test('worker, controls, guide, mobile layout, and notebook return work at the nested URL', async () => {
      const page=await browser.newPage({viewport:{width:1280,height:900}});
      const requests=[], failures=[], errors=[],workers=[];
      page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
      page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)failures.push(r.url());});
      page.on('worker',worker=>workers.push(worker.url()));
      await page.goto(app);await page.waitForSelector('.playfield canvas[data-ready="true"]');
      assert.equal(await page.getByTestId('runner').getAttribute('data-status'),'ready');
      assert.ok(workers.some(url=>url.startsWith(app+'assets/stereogram.worker-')));
      await page.locator('.playfield').focus();await page.keyboard.press('Space');
      await page.waitForFunction(()=>document.querySelector('[data-testid="runner"]').dataset.status==='running');
      await page.keyboard.press('Space');
      await page.waitForFunction(()=>Number(document.querySelector('[data-testid="runner"]').dataset.playerY)>.1);
      await page.getByTestId('game-action').click();
      await page.getByRole('button',{name:'How to see',exact:true}).click();
      await page.waitForSelector('[data-testid="help-scene"][data-ready="true"]');
      const dialog=page.getByRole('dialog',{name:'How to see',exact:true});
      await dialog.getByText('Adjust the illusion',{exact:true}).click();
      assert.equal(await page.getByRole('slider',{name:'Depth strength'}).count(),1);
      await dialog.getByRole('button',{name:'Close viewing instructions',exact:true}).click();
      assert.equal(await page.getByTestId('runner').getAttribute('data-status'),'paused');
      await page.setViewportSize({width:390,height:844});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      assert.ok(requests.filter(url=>/^https?:/.test(url)).every(url=>url.startsWith(app)||url===`${base}/analytics.js`));
      assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
      await page.getByRole('link',{name:'Back to the notebook'}).click();await page.waitForURL(`${base}/#projects`);
      await page.close();
    });
  } finally {await browser.close();}
});
