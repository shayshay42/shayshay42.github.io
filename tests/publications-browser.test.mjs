import test from 'node:test';
import assert from 'node:assert/strict';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = (process.env.BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const home = `${base}/index.html`;

// Keep status distinctions and archive links explicit without duplicating article prose.
const articles = {
  'qsp-biomarkers': {status: 'Accepted for publication in npj Precision Oncology'},
  'diffdose': {status: 'Under review at npj Systems Biology and Applications', href: 'https://doi.org/10.64898/2026.09.07.749974'},
  'latent-space': {status: 'Under review at Nature Computational Science', href: 'https://doi.org/10.64898/2026.03.04.709512'},
  'aistats-submission': {status: 'Under review at AISTATS 2027', date: '2026-10-07'},
  'iclr-submission': {status: 'Withdrawn from ICLR 2027', href: 'https://openreview.net/forum?id=fqiN6Vyw5F', date: '2026-09-18'},
  'multimodal-world-models': {status: 'Under review at AISTATS 2027', date: '2026-10-07'},
  'weld-draft': {status: 'Research draft', authors: 'Cedrique Shum-Tim, Shayan Hajhashemi, Amin Emad, Satya Prakash.'},
  'neutrophil-traps': {status: 'Preprint v1', href: 'https://doi.org/10.64898/2026.10.23.761387', date: '2026-10-28'},
  'ror-myelo': {status: 'Under review at Cancer Discovery', href: 'https://doi.org/10.64898/2026.10.01.755741'},
  'immune-phenotype': {status: 'Preprint v1', href: 'https://doi.org/10.64898/2026.09.17.752366'},
  'nanobody': {status: 'Withdrawn for intellectual property reasons', authors: 'Philip Roche, Shayan Hajhashemi, Uri David Akavia.'},
  'weak-form-distillation-talk': {status: 'Accepted oral presentation · Upcoming', href: 'https://wmw-aspen.github.io/', date: '2027-02-28'},
  'cross-modal-virtual-brain': {status: 'Poster presentation · Poster 4D', href: 'https://www.main2026.org/abstracts', date: '2026-10-30'},
  'real-mvp-talk': {status: 'Invited oral presentation', href: 'https://meetings.siam.org/sess/dsp_talk.cfm?p=157552', date: '2026-07-06'},
  'hematopoietic-stress': {status: 'Filed on WIPO · Applicant/agent file reference: P8341PC00'},
};
const codeLinks = [
  {
    "text": "Weighted weak SINDy",
    "href": "https://github.com/shayshay42/weighted-weak-SINDy"
  },
  {
    "text": "Combination therapy",
    "href": "https://github.com/shayshay42/glioma_ddri"
  },
  {
    "text": "Neural ODEs",
    "href": "https://github.com/shayshay42/neural_ode_benchmark"
  },
  {
    "text": "Spatial transcriptomics",
    "href": "https://github.com/shayshay42/spatial_transcriptomics_playground"
  }
];
const mainPaperIds = ['qsp-biomarkers', 'diffdose', 'latent-space', 'aistats-submission',
  'iclr-submission', 'multimodal-world-models', 'weld-draft'];
const auxiliaryIds = ['neutrophil-traps', 'ror-myelo', 'immune-phenotype', 'nanobody'];
const talkIds = ['weak-form-distillation-talk', 'cross-modal-virtual-brain', 'real-mvp-talk'];

async function checkRecord(page) {
  const actual = await page.evaluate(ids => {
    const normalize = value => value.replace(/\s+/g, ' ').trim();
    const record = document.getElementById('publications');
    if (!record) return null;
    const snapshots = Object.fromEntries(ids.map(id => {
      const headings = document.querySelectorAll(`[id="${id}"]`);
      const heading = headings[0];
      const article = heading?.closest('article');
      return [id, {
        copies: headings.length,
        insideRecord: !!article && record.contains(article),
        section: article?.closest('section')?.id,
        heading: heading?.tagName,
        content: article ? {
          text: normalize(article.textContent),
          authors: normalize(article.querySelector('.publication-authors')?.textContent || ''),
          links: [...article.querySelectorAll('a[href]')].map(a => ({text: normalize(a.textContent), href: a.getAttribute('href')})),
          dates: [...article.querySelectorAll('time')].map(time => ({text: normalize(time.textContent), datetime: time.getAttribute('datetime')})),
        } : null,
      }];
    }));
    const projects = document.getElementById('projects');
    return {
      snapshots,
      recordCopies: document.querySelectorAll('#publications').length,
      afterProjects: !!projects && Boolean(projects.compareDocumentPosition(record) & Node.DOCUMENT_POSITION_FOLLOWING),
      title: record.querySelector(':scope > h2, :scope > .section-heading > h2')?.textContent.trim(),
      sectionOrder: [...record.querySelectorAll(':scope > section')].map(section => section.id),
      sectionCopies: Object.fromEntries(['talks', 'patents', 'research', 'auxiliary-publications'].map(id => [id, document.querySelectorAll(`[id="${id}"]`).length])),
      mainPapers: [...record.querySelectorAll('article')].filter(article => article.closest('section') === record).map(article => article.getAttribute('aria-labelledby')),
      auxiliary: [...record.querySelectorAll('#auxiliary-publications article')].map(article => article.getAttribute('aria-labelledby')),
      talks: [...record.querySelectorAll('#talks article')].map(article => article.getAttribute('aria-labelledby')),
      patents: record.querySelectorAll('#patents article').length,
      code: [...record.querySelectorAll('#research a[href]')].map(a => ({text: normalize(a.textContent), href: a.getAttribute('href')})),
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
    };
  }, Object.keys(articles));
  assert.ok(actual, 'All publications must be present on the homepage.');
  assert.equal(actual.recordCopies, 1);
  assert.equal(actual.afterProjects, true);
  assert.equal(actual.title, 'Publications');
  assert.deepEqual(actual.sectionOrder, ['talks', 'patents', 'research', 'auxiliary-publications']);
  assert.ok(Object.values(actual.sectionCopies).every(count => count === 1), 'Old standalone sections must not remain as duplicates.');
  assert.deepEqual(actual.mainPapers, mainPaperIds);
  assert.deepEqual(actual.auxiliary, auxiliaryIds);
  assert.deepEqual(actual.talks, talkIds);
  assert.equal(actual.patents, 1);
  assert.deepEqual(actual.code, codeLinks);
  assert.equal(actual.overflow, false, 'Publication content must fit the viewport.');
  for (const [id, expected] of Object.entries(articles)) {
    const actualArticle = actual.snapshots[id];
    assert.equal(actualArticle.copies, 1, `${id} must appear once.`);
    assert.equal(actualArticle.insideRecord, true, `${id} must be inside the homepage publication record.`);
    assert.ok(actualArticle.content.text.includes(expected.status), `${id} must preserve its publication status.`);
    if (expected.href) assert.ok(actualArticle.content.links.some(link => link.href === expected.href), `${id} must preserve its archive or event link.`);
    if (expected.date) assert.ok(actualArticle.content.dates.some(date => date.datetime === expected.date), `${id} must preserve its date.`);
    if (expected.authors) assert.equal(actualArticle.content.authors, expected.authors, `${id} must preserve its author order.`);
    const section = mainPaperIds.includes(id) ? 'publications' : auxiliaryIds.includes(id) ? 'auxiliary-publications'
      : talkIds.includes(id) ? 'talks' : 'patents';
    assert.equal(actualArticle.section, section, `${id} must remain in its intended group.`);
    if (mainPaperIds.includes(id)) assert.equal(actualArticle.heading, 'H3');
  }
  const downloads = page.locator('#publications');
  for (const language of ['en', 'fr']) {
    assert.ok(await downloads.locator(`a[href*="shayan-hajhashemi-cv-${language}.pdf"]`).count(), `The ${language} CV download must remain available.`);
  }
  assert.ok(await downloads.locator('a[href$="assets/publications.bib"]').count(), 'The BibTeX download must remain available.');
}

async function expectAnchorInView(page, id) {
  // Poll from the test process: page-level animation callbacks are disabled in
  // no-JavaScript contexts, even though native CSS smooth scrolling still works.
  for (let attempt = 0; attempt < 60; attempt++) {
    const visible = await page.evaluate(id => {
      const bounds = document.getElementById(id)?.getBoundingClientRect();
      return bounds && bounds.top < innerHeight && bounds.bottom > 0;
    }, id);
    if (visible) return;
    await page.waitForTimeout(50);
  }
  assert.fail(`The ${id} anchor did not scroll into view.`);
}

async function navigateWithinDocument(page, keyboard = false) {
  const link = page.locator('.site-nav').getByRole('link', {name: 'Publications', exact: true});
  assert.equal(await link.getAttribute('href'), '#publications');
  const before = new URL(page.url());
  await page.evaluate(() => { window.__publicationNavigationProbe = 'same-document'; });
  const requests = [];
  const onRequest = request => {
    if (request.isNavigationRequest() && request.resourceType() === 'document') requests.push(request.url());
  };
  page.on('request', onRequest);
  try {
    if (keyboard) { await link.focus(); await page.keyboard.press('Enter'); }
    else await link.click();
    await page.waitForURL(url => url.pathname === before.pathname && url.hash === '#publications');
    await expectAnchorInView(page, 'publications');
    assert.deepEqual(requests, [], 'Publications navigation must scroll without loading another document.');
    assert.equal(await page.evaluate(() => window.__publicationNavigationProbe), 'same-document');
  } finally { page.off('request', onRequest); }
}

test('homepage publications and legacy links', async t => {
  const browser = await chromium.launch({
    channel: process.env.BROWSER_CHANNEL || undefined, headless: true,
    args: ['--enable-unsafe-swiftshader'],
  });
  try {
    for (const [label, viewport] of [['desktop', {width: 1440, height: 1000}], ['mobile', {width: 390, height: 844}]]) {
      await t.test(`${label}: complete publication record follows projects and navigation only scrolls`, async () => {
        const page = await browser.newPage({viewport, reducedMotion: 'reduce'});
        try {
          await page.goto(`${base}/`);
          await checkRecord(page);
          await navigateWithinDocument(page);
        } finally { await page.close(); }
      });
    }

    await t.test('keyboard navigation respects reduced motion and keeps the current document', async () => {
      const page = await browser.newPage({reducedMotion: 'reduce'});
      try {
        await page.goto(`${base}/`);
        assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
        assert.notEqual(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'smooth');
        await navigateWithinDocument(page, true);
      } finally { await page.close(); }
    });

    await t.test('article and molecular-page navigation links point to the homepage record', async () => {
      const page = await browser.newPage();
      try {
        await page.goto(`${base}/`);
        for (const path of ['notes/oil-and-learned-optimization.html', 'notes/steering-a-forecasting-model.html',
          'notes/weighted-weak-lorenz.html', 'projects/molecular-game-of-life/index.html']) {
          const url = `${base}/${path}`;
          const response = await page.request.get(url);
          assert.equal(response.status(), 200);
          const hrefs = await page.evaluate(html => {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            return [...doc.querySelectorAll('.site-nav a')].filter(a => a.textContent.trim() === 'Publications').map(a => a.getAttribute('href'));
          }, await response.text());
          assert.equal(hrefs.length, 1, `${path} needs one Publications navigation link.`);
          assert.equal(new URL(hrefs[0], url).href, `${home}#publications`);
        }
      } finally { await page.close(); }
    });

    await t.test('legacy publication URLs preserve paper and section anchors', async () => {
      const page = await browser.newPage({reducedMotion: 'reduce'});
      try {
        for (const [hash, target] of [['', 'publications'], ['#main', 'publications'],
          ['#iclr-submission', 'iclr-submission'], ['#nanobody', 'nanobody'], ['#talks', 'talks']]) {
          await page.goto(`${base}/publications.html${hash}`);
          await page.waitForURL(`${home}#${target}`);
          assert.equal(await page.locator(`#${target}`).count(), 1);
          await expectAnchorInView(page, target);
        }
      } finally { await page.close(); }
    });

    await t.test('without JavaScript the native anchor and legacy fallback reach the full record', async () => {
      const context = await browser.newContext({javaScriptEnabled: false, viewport: {width: 390, height: 844}});
      const page = await context.newPage();
      try {
        await page.goto(`${base}/`);
        await checkRecord(page);
        await navigateWithinDocument(page);
        await page.goto(`${base}/publications.html#nanobody`);
        await page.waitForURL(`${home}#publications`);
        await checkRecord(page);
        await expectAnchorInView(page, 'publications');
      } finally { await context.close(); }
    });
  } finally { await browser.close(); }
});
