import assert from 'node:assert/strict';
import {mkdir, mkdtemp, readFile, rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {test} from 'node:test';
import {runInNewContext} from 'node:vm';
import {chromium, webkit} from 'playwright';
import {fluentWorks} from '../gallery/fluent-ui/catalog.mjs';
import {otherFluentWorks} from '../gallery/fluent-ui/other.mjs';
import {astryxWorks} from '../gallery/astryx/catalog.mjs';
import {originalLoaders} from '../gallery/loaders/originals.mjs';
import {buildCatalog, categories, galleryHighlights, initialCardCount, usesTextEntry} from '../assets/catalog.mjs';
import {remainingScenarios} from '../gallery/fluent-ui/tools/browser-scenarios.mjs';
import {monitor, revealGalleryCards, startServer} from './browser-site.mjs';

test('图鉴首页默认黑色、收录 325 个示例，支持筛选、试玩和导出', {timeout: 40_000}, async t => {
  const site = await startServer(t);
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({viewport: {width: 1280, height: 900}, colorScheme: 'light', locale: 'en-US', reducedMotion: 'reduce'});
  const errors = [];
  monitor(page, errors, site);
  await page.goto(site);
  await page.locator('html[data-ready="true"]').waitFor();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  assert.equal(await page.locator('[data-stat="total"]').textContent(), '325');
  const card = id => page.locator(`[data-ui="${id}"]`);
  assert.ok(await card('magnet-grid').isVisible());
  const ink = card('ink-switch').locator('[data-original-card]').getByRole('switch', {name: 'Ink Switch'});
  await ink.press('Space');
  assert.equal(await ink.getAttribute('aria-checked'), 'true');

  assert.equal(await page.locator('#source-filter, #source-details').count(), 0);
  const search = page.getByRole('searchbox', {name: 'Search UI'});
  await search.fill('date picker');
  await card('astryx-date-range').waitFor({state: 'visible'});
  await search.fill('日历');
  await card('astryx-date-range').waitFor({state: 'visible'});

  await page.locator('#work-search').fill('Paper Fold');
  await card('paper-fold').locator('[data-detail]').click();
  await page.locator('#detail[open]').waitFor();
  assert.match(await page.locator('#code').inputValue(), /Original by UI Moments/);
  await page.locator('#close').click();

  await search.fill('fluent drawer');
  const drawer = card('fluent-drawer').frameLocator('iframe');
  await drawer.getByRole('button', {name: 'Open settings'}).click();
  await drawer.getByRole('dialog').waitFor();
  await drawer.getByRole('button', {name: 'Close'}).click();

  await page.goto(site + 'gallery/fluent-ui/dist/index.html?sample=teaching-popover');
  await page.getByRole('button', {name: 'Show tip'}).click();
  await page.getByText('Quick search', {exact: true}).waitFor();
  await page.goto(site + 'gallery/fluent-ui/dist/index.html?sample=toast');
  await page.getByRole('button', {name: 'Save project'}).click();
  await page.locator('.fui-ToastTitle').filter({hasText: /^Saved · 1$/}).waitFor();

  await page.goto(site);
  await page.locator('html[data-ready="true"]').waitFor();

  await page.locator('#work-search').fill('Command Palette');
  await card('astryx-command-palette').locator('[data-detail]').click();
  await page.locator('#component-detail[open]').waitFor();
  assert.equal(await page.locator('#component-credit').count(), 0);
  const notices = await page.request.get(site + 'gallery/astryx/vendor/astryx/LICENSE');
  assert.match(await notices.text(), /Copyright.*Meta Platforms/);
  await page.locator('#component-detail summary').filter({hasText: 'View prompt'}).click();
  await page.waitForFunction(() => document.querySelector('#component-detail textarea').value.includes('npm run setup'));
  const prompt = await page.locator('#component-detail textarea').inputValue();
  assert.match(prompt, /npm run setup/);
  assert.match(prompt, /npm run package:site/);
  assert.doesNotMatch(prompt, /npm run dev/);
  assert.ok(prompt.includes('astryx-command-palette') || prompt.includes('sample=command-palette'));
  await page.locator('#component-close').click();

  await page.goto(site + 'gallery/originals/index.html');
  assert.equal(await page.locator('section.sample').count(), 6);
  for (const href of await page.locator('nav.sets a').evaluateAll(links => links.map(link => link.href))) {
    assert.ok((await page.request.get(href)).ok(), href);
  }
  assert.deepEqual(errors, []);
});

test('Inline Drawer 卡片快速收回时不会闪到全开或撑宽预览', {timeout: 20_000}, async t => {
  const site = await startServer(t);
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({viewport: {width: 390, height: 844}, reducedMotion: 'no-preference'});
  await page.goto(site + '?q=Inline%20Drawer');
  const card = page.locator('[data-ui="fluent-inline-drawer"]');
  const preview = card.frameLocator('iframe[data-loaded]');
  await preview.locator('html[data-gallery-active="true"]').waitFor({state: 'attached'});
  const show = preview.getByRole('button', {name: 'Show', exact: true});
  const frames = await show.evaluate(async button => {
    const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
    const readFrame = () => {
      const drawer = document.querySelector('.inline-drawer');
      const root = document.documentElement;
      return {
        opacity: drawer ? Number(getComputedStyle(drawer).opacity) : 0,
        overflow: root.scrollWidth - root.clientWidth,
      };
    };
    button.click();
    let frame;
    const opening = [];
    do {
      await nextFrame();
      frame = readFrame();
      opening.push(frame);
    } while (frame.opacity === 0 && opening.length < 30);
    button.click();
    const closing = [];
    for (let index = 0; index < 20; index++) {
      await nextFrame();
      closing.push(readFrame());
    }
    return {opening, closing};
  });
  const turningPoint = frames.opening.at(-1).opacity;
  assert.ok(turningPoint > 0 && turningPoint < 0.6, `反转时的透明度 ${turningPoint}`);
  assert.ok(frames.closing.every(frame => frame.opacity <= turningPoint + 0.22),
    `收回时透明度跳变 ${frames.closing.map(frame => frame.opacity)}`);
  assert.ok([...frames.opening, ...frames.closing].every(frame => frame.overflow === 0),
    '动画期间抽屉不撑宽 iframe');
  await show.waitFor();
  await show.click();
  await preview.getByText('Drafts', {exact: true}).waitFor();
  await preview.getByRole('button', {name: 'Hide', exact: true}).click();
  await preview.getByText('Drafts', {exact: true}).waitFor({state: 'hidden'});
});

test('Astryx 发布包记录实际打包的正式版和 canary 依赖', async () => {
  for (const directory of ['astryx', 'astryx/experimental']) {
    const notices = await readFile(new URL(`../_site/gallery/${directory}/dist/THIRD_PARTY_LICENSES.txt`, import.meta.url), 'utf8');
    const packages = directory === 'astryx'
      ? ['@astryxdesign/cli@0.7.17']
      : ['charts', 'lab', 'vega'].map(name => `@astryxdesign/${name}@0.7.17-canary.g72f2d7c`);
    packages.push('@astryxdesign/core@0.7.17', '@astryxdesign/theme-neutral@0.7.17', 'lucide-react@1.78.0');
    const lines = new Set(notices.split('\n'));
    for (const id of packages) assert.ok(lines.has(id), id);
  }
});

test('原创控件和加载动效随图鉴切换语言，上游示例保留英文', {timeout: 35_000}, async t => {
  const window = {};
  runInNewContext(await readFile(new URL('../gallery/works.js', import.meta.url), 'utf8'), {window});
  assert.equal(window.WORKS.length, 36);
  for (const work of window.WORKS) {
    assert.match(work.summaryZh, /\p{Script=Han}/u, work.id);
    assert.equal(work.notesZh?.length, work.notes?.length, work.id);
    for (const note of work.notesZh ?? []) assert.match(note, /\p{Script=Han}/u, work.id);
  }
  assert.equal(originalLoaders.length, 18);
  for (const loader of originalLoaders) {
    assert.match(loader.nameZh, /\p{Script=Han}/u, loader.key);
    assert.match(loader.descriptionZh, /\p{Script=Han}/u, loader.key);
  }

  const base = await startServer(t);
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({locale: 'zh-CN', reducedMotion: 'reduce'});
  await page.goto(base);
  const search = page.locator('#work-search');
  const card = id => page.locator(`[data-ui="${id}"]`);
  const open = async (id, dialog = 'component-detail') => {
    await card(id).locator('[data-detail]').click();
    await page.locator(`#${dialog}[open]`).waitFor();
  };
  const description = page.locator('#component-description');
  const prompt = page.locator('#component-detail textarea');

  await search.fill('墨色从滑块');
  await open('ink-switch');
  assert.match(await description.textContent(), /墨色从滑块/);
  assert.equal(await description.getAttribute('lang'), 'zh-CN');
  await page.locator('#component-detail summary').click();
  await page.waitForFunction(() => document.querySelector('#component-detail textarea').value.includes('支持用空格键'));
  assert.match(await prompt.inputValue(), /圆形裁剪区域/);
  await page.locator('#component-close').click();

  await search.fill('纸张折叠');
  assert.equal(await card('paper-fold').locator('h2').textContent(), '纸张折叠');
  assert.equal(await card('paper-fold').locator('.ui-caption p').textContent(), '几何');
  assert.match(await card('paper-fold').locator('.ui-playback').getAttribute('aria-label'), /纸张折叠/);
  await open('paper-fold', 'detail');
  assert.equal(await page.locator('#detail-title').textContent(), '纸张折叠');
  assert.match(await page.locator('#detail-group').textContent(), /几何/);
  assert.match(await page.locator('#detail-description').textContent(), /对角折痕/);
  assert.equal(await page.locator('#detail-description').getAttribute('lang'), 'zh-CN');
  assert.equal(await page.getByRole('link', {name: '查看许可证'}).getAttribute('href'), 'https://github.com/guanmo-ai/ui-moments/blob/main/LICENSE');
  await page.locator('#close').click();

  for (const item of [fluentWorks[0], astryxWorks.find(work => work.id === 'astryx-date-range')]) {
    await search.fill(item.en);
    await open(item.id);
    assert.equal(await description.textContent(), item.summary);
    assert.equal(await description.getAttribute('lang'), 'en');
    await page.locator('#component-close').click();
  }

  await page.locator('#language').click();
  await search.fill('Paper Fold');
  await open('paper-fold', 'detail');
  assert.match(await page.locator('#detail-description').textContent(), /diagonal fold/);
  assert.equal(await page.locator('#detail-description').getAttribute('lang'), 'en');
});

test('小屏能看到首批卡片，键盘能退出详情，空态能恢复浏览', {timeout: 25_000}, async t => {
  const site = await startServer(t);
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({viewport: {width: 320, height: 568}, colorScheme: 'dark', locale: 'en-US'});
  await page.goto(site);
  const first = page.locator('#ui-grid article').first();
  await first.waitFor();
  assert.ok((await first.boundingBox()).y < 543, '320 × 568 初始屏应能看到示例');
  const search = page.getByRole('searchbox', {name: 'Search UI'});
  assert.ok((await search.boundingBox()).width >= 140);
  await page.locator('#categories [data-category="loading"]').click();
  await search.fill('Ink Switch');
  const reset = page.locator('#reset-filters');
  await reset.waitFor();
  await reset.click();
  await page.waitForFunction(() => document.querySelector('#ui-count').textContent.includes('73'));
  assert.equal(await search.inputValue(), '');
  assert.equal(await search.evaluate(node => node === document.activeElement), true);

  await search.fill('Ink Switch');
  const detail = page.getByRole('button', {name: 'Details Ink Switch'});
  await detail.press('Enter');
  const dialog = page.locator('#component-detail');
  await dialog.waitFor();
  const ink = page.frameLocator('#component-frame').getByRole('switch', {name: 'Ink Switch'});
  await ink.press('Escape');
  await dialog.waitFor({state: 'hidden'});
  assert.equal(await detail.evaluate(node => node === document.activeElement), true);
});

test('卡片和详情的临时预览故障可以重试', {timeout: 25_000}, async t => {
  const site = await startServer(t);
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({viewport: {width: 1180, height: 860}, locale: 'en-US'});
  let broken = true;
  await page.route(url => url.pathname.includes('/gallery/fluent-ui/dist/') && url.searchParams.get('sample') === 'drawer', route =>
    broken ? route.fulfill({status: 404, body: 'preview unavailable'}) : route.continue());
  await page.goto(site + '?q=Fluent%20Drawer');
  const card = page.locator('[data-ui="fluent-drawer"]');
  const retryCard = card.locator('.ui-preview-retry');
  await retryCard.waitFor();
  assert.equal(await card.locator('iframe[data-loaded]').count(), 0);
  broken = false;
  await retryCard.click();
  await card.frameLocator('iframe').getByRole('button', {name: 'Open settings'}).waitFor();

  broken = true;
  await page.route(url => url.pathname.endsWith('/gallery/originals/index.html') && url.searchParams.get('sample') === 'ink-switch', route =>
    broken ? route.fulfill({status: 404, body: 'preview unavailable'}) : route.continue());
  await page.getByRole('searchbox').fill('Ink Switch');
  await page.locator('[data-ui="ink-switch"]').getByRole('button', {name: 'Details Ink Switch'}).click();
  const retryDetail = page.locator('#component-retry');
  await retryDetail.waitFor();
  broken = false;
  await retryDetail.click();
  await page.frameLocator('#component-frame').getByRole('switch', {name: 'Ink Switch'}).waitFor();
  assert.equal(await retryDetail.isHidden(), true);
});

test('迟到的 HTML 导出不会写入另一个组件的详情', {timeout: 25_000}, async t => {
  const site = await startServer(t);
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const context = await browser.newContext({
    permissions: ['clipboard-read', 'clipboard-write'], locale: 'en-US',
  });
  const page = await context.newPage();
  let started, resume;
  const fetchStarted = new Promise(resolve => { started = resolve; });
  const gate = new Promise(resolve => { resume = resolve; });
  t.after(resume);
  await page.route('**/gallery/originals/gestures.html*', async route => {
    if (route.request().resourceType() === 'fetch') {
      started();
      await gate;
    }
    await route.continue();
  });
  await page.goto(site + '?q=Swipe%20to%20Confirm');
  await page.evaluate(() => navigator.clipboard.writeText('unchanged'));
  const dialog = page.locator('#component-detail');
  const copy = dialog.getByRole('button', {name: 'Copy HTML'});
  await page.getByRole('button', {name: 'Details Swipe to Confirm'}).click();
  await copy.click();
  await fetchStarted;
  await dialog.getByRole('button', {name: 'Close component details'}).click();
  await page.getByRole('searchbox', {name: 'Search UI'}).fill('Bloom Toggle');
  await page.getByRole('button', {name: 'Details Bloom Toggle'}).click();
  assert.equal(await copy.isEnabled(), true);
  const oldFetch = page.waitForResponse(response =>
    response.url().endsWith('/gallery/originals/gestures.html') && response.request().resourceType() === 'fetch');
  resume();
  await (await oldFetch).finished();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'unchanged');
  await copy.click();
  await page.waitForFunction(async () => (await navigator.clipboard.readText()).includes('#bloom-toggle'));
});

test('同页切换分享链接时，详情和源码都跟随当前作品', {timeout: 25_000}, async t => {
  const site = await startServer(t);
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({locale: 'en-US'});
  await page.goto(site + '#ink-switch');
  const dialog = page.locator('#component-detail');
  await dialog.getByRole('heading', {name: 'Ink Switch'}).waitFor();
  await page.goto(site + '#bloom-toggle');
  await dialog.getByRole('heading', {name: 'Bloom Toggle'}).waitFor();
  assert.match(await dialog.locator('#component-source').getAttribute('href'), /gallery\/originals\/visual\.html$/);
});

test('WebKit 快速输入后仍更新结果及可分享的搜索链接', {timeout: 25_000}, async t => {
  const site = await startServer(t);
  const browser = await webkit.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({viewport: {width: 390, height: 844}, locale: 'en-US'});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(site);
  await page.locator('html[data-ready="true"]').waitFor();
  const search = page.getByRole('searchbox', {name: 'Search UI'});
  await search.evaluate(input => {
    for(let index = 0; index < 120; index++) {
      input.value = 'unmatched' + index;
      input.dispatchEvent(new InputEvent('input', {bubbles: true}));
    }
  });
  await search.fill('Ink Switch');
  await page.locator('[data-ui="ink-switch"]').waitFor();
  await page.waitForFunction(() => new URL(location.href).searchParams.get('q') === 'Ink Switch');
  assert.deepEqual(errors, []);
});

test('其余 48 个 Fluent UI 示例在手机卡片尺寸下可交互', { timeout: 120_000 }, async t => {
  const site = await startServer(t);
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 168, height: 108 }, hasTouch: true, reducedMotion: 'reduce' });
  t.after(() => page.close());
  page.setDefaultTimeout(2_500);
  const errors = [];
  monitor(page, errors, site);

  const scenarios = {
    accordion: async () => {
      const layout = page.getByRole('button', { name: 'Layout' });
      await layout.tap();
      await page.getByText('12-column grid').waitFor();
      await page.getByRole('button', { name: 'Spacing' }).tap();
      await page.getByText('8 px base unit').waitFor();
      assert.equal(await layout.getAttribute('aria-expanded'), 'false');
    },
    checkbox: async () => {
      const all = page.getByRole('checkbox', { name: 'Select all' });
      assert.ok(await all.evaluate(input => input.indeterminate));
      await all.press('Space');
      assert.ok(await page.getByRole('checkbox', { name: 'Typography' }).isChecked());
    },
    combobox: async () => {
      const picker = page.getByRole('combobox', { name: 'Search colors' });
      await picker.fill('Lil');
      await page.getByRole('option', { name: 'Lilac' }).tap();
      assert.equal(await picker.inputValue(), 'Lilac');
    },
    dropdown: async () => {
      await page.getByRole('combobox', { name: 'Choose formats' }).tap();
      for (const format of ['PNG', 'SVG']) {
        const option = page.getByRole('menuitemcheckbox', { name: format });
        await option.tap();
        assert.equal(await option.getAttribute('aria-checked'), 'true');
      }
    },
    menu: async () => {
      await page.getByRole('button', { name: 'View: Grid' }).tap();
      await page.getByRole('menuitemradio', { name: 'List' }).tap();
      await page.getByRole('button', { name: 'View: List' }).waitFor();
    },
    dialog: async () => {
      await page.getByRole('button', { name: 'Archive', exact: true }).tap();
      await page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).tap();
      await page.getByRole('button', { name: 'Restore', exact: true }).waitFor();
    },
    switch: async () => {
      const preview = page.getByRole('switch', { name: 'Preview mode' });
      await preview.press('Space');
      assert.ok(await preview.isChecked());
    },
    slider: async () => {
      await page.getByRole('slider', { name: 'Zoom' }).press('ArrowRight');
      assert.equal(await page.locator('output').innerText(), '55%');
    },
    spinbutton: async () => {
      const copies = page.getByRole('spinbutton', { name: 'Copies' });
      await page.getByRole('button', {name: 'Increment value'}).tap();
      assert.equal(await copies.inputValue(), '3');
      await page.getByRole('button', {name: 'Decrement value'}).tap();
      assert.equal(await copies.inputValue(), '2');
      await copies.press('ArrowUp');
      assert.equal(await copies.inputValue(), '3');
    },
    tabs: async () => {
      await page.getByRole('tab', { name: 'Review' }).tap();
      assert.equal(await page.getByRole('tabpanel').innerText(), '2 comments');
    },
    rating: async () => {
      const stars = page.getByRole('radio', { name: '5 of 5 stars' });
      await stars.press('Space');
      assert.ok(await stars.isChecked());
    },
    tree: async () => {
      await page.getByRole('treeitem', { name: 'Assets' }).press('ArrowRight');
      await page.getByText('Icons', { exact: true }).waitFor();
    },
    carousel: async () => {
      await page.getByRole('button', { name: 'Next swatch' }).tap();
      await page.getByRole('tab', { name: 'Show Lilac', selected: true }).waitFor();
    },
    progress: async () => {
      await page.getByRole('button', { name: 'Advance · 0%' }).tap();
      assert.equal(await page.getByRole('progressbar', { name: 'Export progress' }).getAttribute('aria-valuenow'), '0.25');
    },
  };

  const exercises = {...scenarios, ...remainingScenarios};
  const coveredInGallery = new Set(['drawer', 'teaching-popover', 'toast']);
  const expected = [...fluentWorks, ...otherFluentWorks].map(work => new URL(work.demo, site).searchParams.get('sample'))
    .filter(sample => !coveredInGallery.has(sample));
  assert.deepEqual(new Set(Object.keys(exercises)), new Set(expected));
  for (const [sample, exercise] of Object.entries(exercises)) {
    await t.test(sample, async () => {
      await page.goto(new URL(`gallery/fluent-ui/dist/index.html?sample=${sample}`, site).href);
      await exercise(page);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 168);
    });
  }
  assert.deepEqual(errors, []);
});

async function fullCatalog() {
  const window = {};
  runInNewContext(await readFile(new URL('../gallery/works.js', import.meta.url), 'utf8'), {window});
  return buildCatalog(window.WORKS);
}

test('解析首页即可操作首卡，不等待图鉴脚本或整页预览', {timeout: 20_000}, async t => {
  const site = await startServer(t);
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({viewport: {width: 390, height: 844}});
  const requests = [];
  page.on('request', request => requests.push(new URL(request.url()).pathname));
  let resume;
  const gate = new Promise(resolve => { resume = resolve; });
  t.after(resume);
  await page.route('**/assets/gallery-*.mjs', async route => {
    await gate;
    await route.continue();
  });
  await page.goto(site, {waitUntil: 'commit'});
  const card = page.locator('[data-ui="magnet-grid"] [data-original-card]');
  await card.locator('.magnet').press('ArrowRight');
  assert.equal(await page.locator('html').getAttribute('data-preview-pending'), null);
  assert.equal(await card.locator('.magnet i').count(), 40);
  assert.ok(await card.locator('.magnet i').evaluateAll(dots =>
    dots.some(dot => Number(dot.style.getPropertyValue('--p')) > 0)));
  assert.equal(await page.locator('html').getAttribute('data-ready'), null);
  assert.ok(requests.some(path => /\/original-cards-[A-Z0-9]{8}\.mjs$/.test(path)));
  assert.ok(!requests.some(path => path.endsWith('/magnet-grid-preview.html')));
  assert.ok(!requests.some(path => path.endsWith('/gallery/originals/visual.html')));
  resume();
  await page.locator('html[data-ready="true"]').waitFor();
});

test('声明式首屏先按保存的浅色与中文绘制，接管保持节点和像素', {timeout: 25_000}, async t => {
  let sendCards;
  const firstCardsGate = new Promise(resolve => { sendCards = resolve; });
  t.after(sendCards);
  const site = await startServer(t, {firstCardsGate});
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({viewport: {width: 1440, height: 900}, colorScheme: 'dark', locale: 'en-US', reducedMotion: 'reduce'});
  await page.addInitScript(() => {
    localStorage.setItem('ui-moments-theme', 'light');
    localStorage.setItem('ui-moments-language', 'zh-CN');
  });
  let resume;
  const gate = new Promise(resolve => { resume = resolve; });
  t.after(resume);
  await page.route('**/assets/original-cards-*.mjs', async route => {
    await gate;
    await route.continue();
  });
  await page.goto(site, {waitUntil: 'commit'});
  await page.locator('#ui-grid').waitFor({state: 'attached'});
  assert.equal(await page.locator('body').evaluate(body => getComputedStyle(body).visibility), 'hidden');
  assert.equal(await page.evaluate(() => performance.getEntriesByName('first-contentful-paint').length), 0);
  sendCards();
  const magnet = page.locator('[data-ui="magnet-grid"]');
  const original = magnet.locator('[data-original-card]');
  const pad = original.locator('.magnet');
  await pad.waitFor();
  const ink = page.locator('[data-ui="ink-switch"] .ui-stage');
  const stage = original.locator('.stage');
  await page.waitForFunction(() => {
    const view = document.querySelector('[data-ui="magnet-grid"] ui-original-card')?.shadowRoot?.querySelector('.stage');
    return view && getComputedStyle(view).backgroundColor === 'rgb(242, 242, 243)';
  });
  await page.waitForFunction(() => performance.getEntriesByName('first-contentful-paint').length > 0);
  assert.equal(await page.locator('html').getAttribute('data-ready'), null);
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
  assert.equal(await page.locator('html').getAttribute('lang'), 'zh-CN');
  assert.equal(await magnet.locator('.ui-caption h2').textContent(), '磁吸点阵');
  assert.equal(await page.locator('#work-search').getAttribute('placeholder'), '搜索');
  assert.equal(await pad.locator('i').count(), 40);
  await page.evaluate(() => document.fonts.ready);
  const before = await ink.screenshot();
  const node = await pad.elementHandle();
  const background = await stage.evaluate(element => getComputedStyle(element).backgroundColor);
  resume();
  await page.locator('html[data-ready="true"]').waitFor();
  assert.equal(await pad.evaluate((element, initial) => element === initial, node), true);
  assert.equal(await stage.evaluate(element => getComputedStyle(element).backgroundColor), background);
  assert.deepEqual(await ink.screenshot(), before);
  await pad.press('ArrowRight');
  assert.ok(await pad.locator('i').evaluateAll(dots => dots.some(dot => Number(dot.style.getPropertyValue('--p')) > 0)));
  await page.locator('#language').click();
  assert.equal(await magnet.locator('.ui-caption h2').textContent(), 'Magnet Grid');
  assert.equal(await page.locator('#gallery-title').textContent(), 'Interactive UI Gallery');
  assert.equal(await page.locator('#work-search').getAttribute('placeholder'), 'Search');
});

test('声明式模板未被解析时，脚本采用同一份静态控件', {timeout: 20_000}, async t => {
  const site = await startServer(t);
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({viewport: {width: 390, height: 844}, reducedMotion: 'reduce'});
  let resume;
  const gate = new Promise(resolve => { resume = resolve; });
  t.after(resume);
  await page.route('**/assets/original-cards-*.mjs', async route => {
    await gate;
    await route.continue();
  });
  await page.goto(site, {waitUntil: 'commit'});
  const host = page.locator('[data-ui="magnet-grid"] ui-original-card');
  await host.locator('.magnet').waitFor();
  await host.evaluate(element => {
    const fallback = element.cloneNode(false);
    fallback.innerHTML = '<template shadowrootmode="open">' + element.shadowRoot.innerHTML + '</template>';
    if (fallback.shadowRoot) throw new Error('模板应在脚本接管前保持未解析');
    element.replaceWith(fallback);
  });
  resume();
  await host.locator('.magnet').press('ArrowRight');
  assert.equal(await host.locator('i').count(), 40);
  assert.ok(await host.locator('i').evaluateAll(dots => dots.some(dot => Number(dot.style.getPropertyValue('--p')) > 0)));
});

test('全部按点按、拖动、输入、彩色和加载动效分组，初始只挂载近屏卡片', {timeout: 45_000}, async t => {
  const site = await startServer(t);
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({viewport: {width: 390, height: 844}, reducedMotion: 'reduce'});
  await page.goto(site);
  await page.locator('html[data-ready="true"]').waitFor();
  const cards = page.locator('#ui-grid > article:not([hidden])');
  const headings = page.locator('[data-group-heading]:not([hidden])');
  assert.equal(await cards.count(), initialCardCount);
  assert.equal(await page.locator('#ui-count[aria-live="polite"]').textContent(), '73 components');
  await revealGalleryCards(page);
  const all = await fullCatalog();
  const groups = categories.slice(1, -1).map(({id}) => id);
  const overviewIds = await cards.evaluateAll(rows => rows.map(row => row.dataset.ui));
  assert.deepEqual(overviewIds, galleryHighlights(all).map(item => item.id));
  assert.ok(!overviewIds.includes('astryx-command-palette'));
  assert.ok(overviewIds.includes('astryx-date-time-input'));
  assert.deepEqual(await headings.evaluateAll(nodes => nodes.map(node => [node.dataset.groupHeading, node.nextElementSibling.dataset.category])),
    groups.map(id => [id, id]));
  assert.deepEqual(await page.locator('#categories .category-count').allTextContents(), ['144', '91', '12', '15', '5', '21', '181']);
  assert.deepEqual(await page.locator('[data-view-all]').allTextContents(),
    ['View all 91', 'View all 15']);
  const items = new Map(all.map(item => [item.id, item]));
  const fixtures = {
    tap: ['plan-picker', 'magnet-grid', 'fluent-dropdown', 'astryx-calendar'],
    type: ['code-shake', 'chip-input', 'strength-meter', 'fluent-searchbox', 'fluent-combobox', 'astryx-date-range'],
    drag: ['swipe-confirm', 'hold-confirm', 'elastic-string', 'fluent-slider', 'astryx-resizable'],
    color: ['hue-orbit', 'flip-coin', 'pull-cord'],
    loading: ['paper-fold', 'fluent-spinner'],
  };
  for (const [group, ids] of Object.entries(fixtures)) {
    for (const id of ids) assert.equal(items.get(id)?.category, group, id);
  }
  assert.ok(all.filter(item => item.category === 'type').every(usesTextEntry));
  await page.getByRole('searchbox').fill('Swipe to Confirm');
  assert.deepEqual(await headings.allTextContents(), ['Drag']);
  await page.locator('#language').click();
  assert.deepEqual(await headings.allTextContents(), ['拖动']);
  await page.locator('#categories [data-category="drag"]').click();
  assert.equal(await headings.count(), 0);
  assert.ok(await cards.first().isVisible());

  await page.getByRole('searchbox').clear();
  await page.locator('#categories [data-category="loading"]').click();
  await revealGalleryCards(page);
  const loadingOrder = await cards.evaluateAll(rows => rows.map(row => row.dataset.ui));
  assert.equal(loadingOrder.length, 21);
  assert.deepEqual(loadingOrder.slice(0, 5), ['paper-fold', 'tide-ring', 'pixel-snake', 'orbit-pair', 'signal-return']);
  assert.ok(loadingOrder.indexOf('fluent-spinner') < loadingOrder.indexOf('fluent-skeleton'));
  assert.ok(loadingOrder.indexOf('fluent-skeleton') < loadingOrder.indexOf('draft-card'));
  assert.ok(loadingOrder.indexOf('draft-card') > loadingOrder.indexOf('flip-tile'));
  assert.equal(loadingOrder.at(-1), 'astryx-lab-reasoning');
  await page.locator('#shapes [data-shape="States"]').click();
  assert.deepEqual(await cards.evaluateAll(rows => rows.map(row => row.dataset.ui)), ['draft-card']);
});

test('滚动目标暂时留在视口之外时，卡片检查仍能推进到下一个批次', {timeout: 15_000}, async t => {
  const site = await startServer(t);
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({viewport: {width: 390, height: 844}, reducedMotion: 'reduce'});
  await page.addInitScript(() => {
    const scrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (options) {
      if (this.id === 'gallery-end' && !window.missedGalleryScroll) {
        window.missedGalleryScroll = true;
        return;
      }
      return scrollIntoView.call(this, options);
    };
  });
  await page.goto(site);
  await page.locator('html[data-ready="true"]').waitFor();
  const next = galleryHighlights(await fullCatalog())[initialCardCount];
  await revealGalleryCards(page, next.id);
  assert.equal(await page.evaluate(() => window.missedGalleryScroll), true);
  assert.equal(await page.locator(`[data-ui="${next.id}"]:not([hidden])`).count(), 1);
});

const otherCatalogRequest = /\/other-catalog-[A-Z0-9]{8}\.mjs(?:\?|$)/;

test('查看全部、其他与跨分区搜索支持点击、键盘和触屏', {timeout: 45_000}, async t => {
  const site = await startServer(t);
  const browser = await chromium.launch();
  t.after(() => browser.close());
  for (const mode of ['click', 'keyboard', 'touch']) {
    const touch = mode === 'touch';
    const page = await browser.newPage({
      locale: 'en-US', hasTouch: touch, isMobile: touch, reducedMotion: 'reduce',
      viewport: touch ? {width: 390, height: 844} : {width: 1280, height: 900},
    });
    const requests = [];
    page.on('request', request => {
      if (otherCatalogRequest.test(request.url())) requests.push(request.url());
    });
    const activate = button => mode === 'keyboard' ? button.press('Enter') :
      touch ? button.tap() : button.click();
    try {
      await page.goto(site);
      await page.locator('html[data-ready="true"]').waitFor();
      assert.equal(await page.locator('#categories [data-category="other"] .category-count').textContent(), '181');
      if (touch) assert.ok(await page.locator('#categories').evaluate(node => node.scrollWidth <= node.clientWidth));
      await revealGalleryCards(page);
      assert.equal(requests.length, 0, mode);
      assert.equal(await page.locator('#ui-grid [data-category="other"]').count(), 0, mode);

      await activate(page.locator('[data-view-all="tap"]'));
      assert.equal(await page.locator('#categories [data-category="tap"]').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('[data-ui="magnet-grid"]').evaluate(node => node === document.activeElement), true);
      const toolbar = await page.locator('.gallery-toolbar').boundingBox();
      assert.ok(toolbar.y >= 0 && toolbar.y < 100, JSON.stringify(toolbar));
      await revealGalleryCards(page);
      assert.equal(await page.locator('#ui-grid article:not([hidden])').count(), 91);
      assert.equal(await page.locator('[data-view-all]:visible').count(), 0);

      const all = page.locator('#categories [data-category="all"]');
      const other = page.locator('#categories [data-category="other"]');
      const search = page.getByRole('searchbox');
      const enterSearch = async () => {
        if (touch) await search.tap();
        else if (mode === 'keyboard') await page.keyboard.press('/');
        else await search.click();
        await page.keyboard.type('calendar');
        await page.locator('[data-ui="astryx-date-input"]').waitFor();
        const groups = await page.locator('#ui-grid > article:not([hidden])').evaluateAll(nodes => nodes.map(node => node.dataset.category));
        assert.notEqual(groups[0], 'other');
        assert.equal(groups.at(-1), 'other');
        assert.equal(await page.locator('[data-view-all]:visible').count(), 0);
      };
      const openOther = async () => {
        await activate(other);
        await page.locator('[data-ui="fluent-input"]').waitFor();
        assert.equal(await page.locator('#ui-grid article:not([hidden]):not([data-category="other"])').count(), 0);
        await activate(all);
        assert.equal(await page.locator('#ui-grid article[data-category="other"]:visible').count(), 0);
      };
      await activate(all);
      if (mode === 'click') {
        await enterSearch();
        await search.clear();
        await openOther();
      } else {
        await openOther();
        await enterSearch();
      }
      assert.equal(requests.length, 1, mode);
    } finally {
      await page.close();
    }
  }
});

test('其他目录失败可重试，保留收藏和可用的直达链接', {timeout: 30_000}, async t => {
  const site = await startServer(t);
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({locale: 'en-US', reducedMotion: 'reduce'});
  const removed = 'astryx-variant-checkbox-list-checkbox-list-select-all-pattern';
  const requests = [];
  let unblock;
  const hold = new Promise(resolve => { unblock = resolve; });
  t.after(unblock);
  await page.addInitScript(ids => localStorage.setItem('ui-moments-favorites', JSON.stringify(ids)),
    [removed, 'fluent-input', 'magnet-grid']);
  await page.route(otherCatalogRequest, async route => {
    requests.push(route.request().url());
    if (requests.length === 1) {
      await hold;
      await route.abort();
    } else await route.continue();
  });
  await page.goto(site + '#' + removed);
  await page.waitForURL(site);
  assert.equal(await page.locator('dialog[open]').count(), 0);
  assert.equal(requests.length, 0);

  await page.locator('#gallery-favorites').click();
  await page.getByText('Loading other components…').waitFor();
  assert.equal(await page.locator('#ui-count').textContent(), '1 components');
  unblock();
  const retry = page.getByRole('button', {name: 'Retry loading'});
  await retry.waitFor();
  await retry.press('Enter');
  await page.locator('[data-ui="fluent-input"]:visible').waitFor();
  assert.equal(await page.locator('#ui-count').textContent(), '2 components');
  assert.equal(await page.locator('[data-view-all]:visible').count(), 0);
  assert.equal(requests.length, 2);
  assert.notEqual(requests[0], requests[1]);
  assert.equal(await page.locator('#other-feedback').isVisible(), false);

  const direct = await browser.newPage({locale: 'en-US', reducedMotion: 'reduce'});
  await direct.goto(site + '#fluent-input');
  await direct.locator('#component-detail[open]').waitFor();
  assert.equal(await direct.locator('#component-title').textContent(), 'Text Input');
  assert.equal(await direct.locator('#ui-grid [data-category="other"]').count(), 0);
});

test('尚未挂载的加载动效可分享直达、搜索和收藏', {timeout: 30_000}, async t => {
  const site = await startServer(t);
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({locale: 'en-US'});
  const last = (await fullCatalog()).findLast(item => item.loader);
  await page.goto(site + '#' + last.id);
  await page.locator('#detail[open]').waitFor();
  assert.equal(await page.locator('#detail-title').textContent(), last.en);
  assert.equal(await page.locator(`[data-ui="${last.id}"]`).count(), 0);
  await page.locator('#detail [data-save-work]').click();
  await page.locator('#close').click();
  await page.getByRole('searchbox').fill(last.id);
  const result = page.locator(`[data-ui="${last.id}"]:not([hidden])`);
  await result.waitFor();
  await page.locator('#work-search').fill('');
  await page.locator('#gallery-favorites').click();
  await result.waitFor();
  assert.match(await page.locator('#ui-count[aria-live="polite"]').textContent(), /^1 components?$/);
});

test('Tab 和 Shift+Tab 按目录顺序穿过首次渲染的边界', {timeout: 20_000}, async t => {
  const site = await startServer(t);
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({viewport: {width: 390, height: 844}});
  const items = await fullCatalog();
  await page.goto(site);
  await page.locator('html[data-ready="true"]').waitFor();
  const oldLast = page.locator(`[data-ui="${items[initialCardCount - 1].id}"] [data-detail]`);
  assert.equal(await page.locator(`[data-ui="${items[initialCardCount].id}"]`).count(), 0);
  await oldLast.focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.closest('[data-ui]')?.dataset.ui),
    items[initialCardCount].id);
  await page.keyboard.press('Shift+Tab');
  assert.equal(await oldLast.evaluate(node => node === document.activeElement), true);
});

test('宽卡片预览展开状态，详情仍能触发原交互', {timeout: 90_000}, async t => {
  const base = await startServer(t);
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({viewport: {width: 1440, height: 900}, locale: 'en-US', reducedMotion: 'reduce'});
  await page.goto(base);
  await page.locator('html[data-ready="true"]').waitFor();
  assert.equal(await page.locator('#ui-grid').evaluate(grid =>
    Number(getComputedStyle(grid).getPropertyValue('--columns'))), 5);
  const screenshots = process.env.UI_MOMENTS_CARD_SCREENSHOTS;
  if (screenshots) await mkdir(screenshots, {recursive: true});
  const examples = [
    ['fluent-dialog', 'Archive', frame => frame.getByRole('dialog').getByText('Archive project?')],
    ['fluent-teaching-popover', 'Show tip', frame => frame.getByText('Quick search', {exact: true})],
    ['fluent-toast', 'Save project', frame => frame.locator('.fui-ToastTitle').filter({hasText: /^Saved · 1$/})],
    ['astryx-command-palette', 'Open command palette', frame => frame.getByPlaceholder('Search commands')],
    ['astryx-bottom-sheet', 'Open bottom sheet', frame => frame.getByRole('button', {name: 'Apply'})],
    ['astryx-bottom-sheet-switcher', 'Set up notifications', frame => frame.getByText('Important activity')],
    ['astryx-drawer', 'Open drawer', frame => frame.getByText('Close with Escape, the scrim, or the close button.')],
  ];
  const search = page.getByRole('searchbox');
  for (const [id, trigger, result] of examples) {
    // Filter by library to retain mixed card widths and reach the actual preview.
    const library = id.startsWith('fluent-') ? 'Fluent UI' : 'Astryx';
    if (await search.inputValue() !== library) await search.fill(library);
    await revealGalleryCards(page, id);
    const card = page.locator(`[data-ui="${id}"]`);
    await card.evaluate(node => node.scrollIntoView({block: 'center'}));
    const snapshot = card.frameLocator('iframe[data-loaded]').locator('[data-preview-snapshot]');
    await snapshot.waitFor();
    assert.ok(await snapshot.evaluate(node => {
      const rect = node.getBoundingClientRect();
      return rect.width >= innerWidth * .55 && rect.height >= innerHeight * .30;
    }), id);
    if (screenshots) await card.screenshot({path: join(screenshots, `${id}.png`), animations: 'disabled'});

    await card.locator('[data-detail]').click();
    const detail = page.frameLocator('#component-frame');
    await detail.getByRole('button', {name: trigger, exact: true}).click();
    await result(detail).waitFor();
    await page.locator('#component-close').click();
  }
});

test('Teaching Popover 和 Toast 的宽卡片支持直接试玩', {timeout: 30_000}, async t => {
  const site = await startServer(t);
  for (const [engine, width, hasTouch] of [[chromium, 1440, false], [webkit, 390, true]]) {
    const browser = await engine.launch();
    t.after(() => browser.close());
    const page = await browser.newPage({viewport: {width, height: 900}, hasTouch, reducedMotion: 'reduce'});
    page.setDefaultTimeout(5_000);
    await page.goto(site);
    const search = page.getByRole('searchbox');
    async function openCard(query, id) {
      await search.fill(query);
      const card = page.locator(`[data-ui="fluent-${id}"]`);
      await card.scrollIntoViewIfNeeded();
      return card.frameLocator('iframe[data-loaded]');
    }
    const activate = button => hasTouch ? button.tap() : button.click();

    const popover = await openCard('Teaching Popover', 'teaching-popover');
    const tip = popover.getByRole('group', {name: 'Quick search'});
    const dismiss = tip.getByRole('button', {name: 'Got it'});
    const show = popover.getByRole('button', {name: 'Show tip'});
    await tip.waitFor();
    assert.ok(await search.evaluate(node => document.activeElement === node));
    await activate(dismiss);
    await tip.waitFor({state: 'hidden'});
    assert.ok(await show.evaluate(node => document.activeElement === node));
    if (hasTouch) await show.tap();
    else await show.press('Space');
    await tip.waitFor();
    assert.ok(await tip.evaluate(node => node.getBoundingClientRect().bottom <= innerHeight));
    await dismiss.press('Enter');
    await tip.waitFor({state: 'hidden'});

    const toast = await openCard('Toast', 'toast');
    const save = toast.getByRole('button', {name: 'Save project'});
    const notifications = toast.locator('.fui-Toast');
    if (hasTouch) await save.tap();
    else await save.press('Enter');
    await activate(save);
    await notifications.getByText('Saved · 1', {exact: true}).waitFor();
    await notifications.getByText('Saved · 2', {exact: true}).waitFor();
    await notifications.first().waitFor({state: 'hidden'});
    assert.equal(await notifications.count(), 0);
    await activate(save);
    await notifications.getByText('Saved · 3', {exact: true}).waitFor();
    assert.equal(await page.locator('#component-detail[open]').count(), 0);
  }
});

test('Astryx 示例支持拖选图表和进入实验导航的下一层', { timeout: 30_000 }, async t => {
  const site = await startServer(t);
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({viewport: {width: 680, height: 540}, reducedMotion: 'reduce'});
  t.after(() => page.close());
  page.setDefaultTimeout(5_000);
  const open = key => {
    const sample = astryxWorks.find(item => item.id === `astryx-${key}`);
    assert.ok(sample, key);
    return page.goto(new URL(sample.demo, site).href);
  };

  await open('chart-brush-line');
  const brush = page.locator('svg rect[style*="crosshair"]');
  await brush.waitFor();
  const {x, y, width, height} = await brush.boundingBox();
  await page.mouse.move(x + width * .2, y + height * .42);
  await page.mouse.down();
  await page.mouse.move(x + width * .63, y + height * .42, {steps: 10});
  await page.mouse.up();
  await page.getByText(/\d+ months selected/).waitFor();

  await open('lab-navigation-stack');
  await page.getByText('General', {exact: true}).click();
  await page.getByText('Software Update', {exact: true}).waitFor();
});

test('36 个原创卡片都可在各自的 Shadow DOM 内操作', {timeout: 60_000}, async t => {
  const site = await startServer(t);
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({viewport: {width: 1440, height: 900}, locale: 'en-US'});
  const issues = [];
  monitor(page, issues, site);
  await page.goto(site);
  await page.locator('html[data-ready="true"]').waitFor();
  const search = page.getByRole('searchbox');
  const cards = new Map((await fullCatalog()).filter(item => item.original).map(item => [item.id, item]));
  const tested = new Set();
  async function control(id) {
    assert.ok(cards.has(id), id);
    tested.add(id);
    await search.fill(id);
    const card = page.locator(`[data-ui="${id}"]`);
    const preview = card.locator('[data-original-card]');
    await card.locator('[data-original-card][data-hydrated] .stage').waitFor();
    assert.equal(await card.locator('iframe').count(), 0, id);
    assert.equal(await preview.evaluate(host => host.shadowRoot.querySelectorAll('.sample').length), 1, id);
    return preview;
  }

  const changes = [
    ['ink-switch', '.ink', 'Space', '.ink[aria-checked="true"]'],
    ['detent-dial', '.dial-knob', 'ArrowRight', '.dial-knob[aria-valuenow="5"]'],
    ['odometer-stepper', '.reels', 'ArrowUp', '.reels[aria-valuenow="9"]'],
    ['leaf-tabs', '[role="tab"][aria-selected="true"]', 'ArrowRight', '[role="tab"]:nth-child(4)[aria-selected="true"]'],
    ['tide-progress', '.tide', 'Space', '.tide[aria-label="Tide Progress 75%"]'],
    ['magnet-grid', '.magnet', 'ArrowRight', '.magnet i[style*="--p: 0."]'],
    ['jelly-pad', '.jelly', 'ArrowRight', '.jelly-cube[style*="transform"]'],
    ['hue-orbit', '.hue', 'ArrowRight', '.hue:not([aria-valuenow="270"])'],
    ['merge-drops', '.drops', 'ArrowLeft', '.drops .small[cx="138.0"]'],
    ['pull-cord', '.lamp-bead', 'Space', '.lamp-bead[aria-checked="true"]'],
    ['flip-coin', '.coin', 'Space', '.coin[style*="rotateY"]'],
    ['ripple-pad', '.ripples', 'Space', '.ripples b'],
    ['bloom-toggle', '.bloom', 'Space', '.bloom[aria-checked="true"]'],
    ['swipe-confirm', '.swipe-knob', 'Space', '.swipe[data-done]'],
    ['pull-refresh', '.pull', 'Space', '.pull-list [data-new]'],
    ['elastic-string', '.string', 'Space', '.string path:not([d="M14 60 Q110 60 206 60"])'],
    ['domino-row', '.domino', 'Space', '.domino[aria-pressed="true"]'],
    ['rocker-switch', '.rocker', 'Space', '.rocker[aria-checked="true"]'],
    ['scrub-wave', '.wave-bars', 'ArrowRight', '.wave-bars[aria-valuenow="40"]'],
    ['snap-grid', '.snap', 'ArrowRight', '.snap-tile[style*="--tx: 92px"]'],
    ['radial-menu', '.radial-main', 'Space', '.radial-main[aria-expanded="true"]'],
    ['step-track', '.steps-nav [data-step="1"]', 'Space', '.steps-track[aria-valuenow="3"]'],
    ['breath-orb', '.orb', 'Space', '.orb[aria-pressed="true"]'],
    ['stroke-checklist', 'input[type="checkbox"]', 'Space', 'input[type="checkbox"]:first-child:checked'],
    ['pebble-rating', 'input[value="4"]', 'ArrowRight', 'input[type="radio"]:checked:not([value="4"])'],
    ['notch-slider', 'input[type="range"]', 'ArrowRight', 'input[aria-valuetext="L"]'],
    ['strength-meter', '.secret-eye', 'Space', 'input[type="text"]'],
    ['plan-picker', 'input[value="pro"]', 'ArrowRight', 'input[value="team"]:checked'],
    ['copy-morph', '.copy', 'Space', '.copy[data-done]'],
    ['like-burst', '.like', 'Space', '.like[aria-pressed="true"]'],
    ['paper-plane', '.send', 'Space', '.send[data-done]'],
    ['download-ring', '.dl', 'Space', '.dl[data-state="loading"], .dl[data-state="done"]'],
    ['bell-toggle', '.bell', 'Space', '.bell[aria-pressed="false"]'],
  ];
  for (const [id, selector, key, outcome] of changes) {
    const preview = await control(id);
    const target = preview.locator(selector).first();
    if (['ripple-pad', 'elastic-string', 'flip-coin'].includes(id)) {
      await preview.locator('.original-root[data-gallery-active="true"]').waitFor();
    }
    if (id === 'stroke-checklist') assert.equal(await target.isChecked(), false);
    await target.press(key);
    if (id === 'stroke-checklist') assert.equal(await target.isChecked(), true);
    await preview.locator(outcome).first().waitFor({state: 'attached', timeout: 4000}).catch(error => {
      throw new Error(`${id} 操作后未出现 ${outcome}`, {cause: error});
    });
  }

  const hold = (await control('hold-confirm')).locator('.hold');
  await hold.focus();
  await page.keyboard.down('Space');
  await hold.locator('xpath=self::*[@data-holding]').waitFor({state: 'attached'});
  await page.keyboard.up('Space');

  const chip = await control('chip-input');
  await chip.locator('input').fill('demo');
  await chip.locator('input').press('Enter');
  await chip.locator('.chip').filter({hasText: 'demo'}).waitFor();

  const code = await control('code-shake');
  const digits = code.locator('.code input');
  for (const [index, digit] of [...'2468'].entries()) await digits.nth(index).fill(digit);
  await code.locator('.code[data-state="ok"]').waitFor();

  assert.deepEqual([...tested].sort(), [...cards.keys()].sort());
  assert.deepEqual(issues, []);
});

test('原创卡片批量内联，跟随主题、语言、全局与离屏暂停', {timeout: 30_000}, async t => {
  const site = await startServer(t);
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({viewport: {width: 1440, height: 900}, locale: 'en-US'});
  await page.goto(site);
  await page.locator('html[data-ready="true"]').waitFor();
  const originals = [...(await fullCatalog()).slice(0, initialCardCount).filter(item => item.original).map(item => item.id)];
  const visible = await page.locator('#ui-grid > article').evaluateAll((cards, ids) =>
    cards.filter(card => ids.includes(card.dataset.ui) && card.getBoundingClientRect().top < innerHeight)
      .map(card => ({shadow: card.querySelector('[data-original-card]')?.shadowRoot?.mode, iframe: Boolean(card.querySelector('iframe'))})), originals);
  assert.ok(visible.length >= 10);
  assert.ok(visible.every(({shadow, iframe}) => shadow === 'open' && !iframe));

  const ink = page.locator('[data-ui="ink-switch"]');
  const paper = page.locator('[data-ui="magnet-grid"] [data-original-card]');
  const background = () => paper.locator('.stage').evaluate(node => getComputedStyle(node).backgroundColor);
  const dark = await background();
  await page.locator('#theme').click();
  await paper.locator('.original-root[data-theme="light"]').waitFor();
  assert.notEqual(await background(), dark);
  await page.locator('#language').click();
  assert.equal(await ink.locator('.ui-caption h2').textContent(), '墨滴开关');
  assert.match(await paper.getAttribute('aria-label'), /磁吸/);
  await page.locator('#language').click();
  assert.equal(await ink.locator('.ui-caption h2').textContent(), 'Ink Switch');

  const orb = page.locator('[data-ui="breath-orb"] [data-original-card]');
  await page.getByRole('searchbox').fill('Breath Orb');
  await orb.locator('.original-root[data-gallery-active="true"]').waitFor();
  const animation = () => orb.locator('.orb .core').evaluate(node => getComputedStyle(node).animationPlayState);
  assert.equal(await animation(), 'running');
  await page.locator('#motion').click();
  assert.equal(await animation(), 'paused');
  await page.locator('#motion').click();
  assert.equal(await animation(), 'running');
  await page.emulateMedia({reducedMotion: 'reduce'});
  assert.equal(await orb.locator('.orb .core').evaluate(node => getComputedStyle(node).animationName), 'none');
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await page.getByRole('searchbox').fill('');
  await page.evaluate(() => window.scrollTo(0, 0));
  await orb.locator('.original-root[data-gallery-active="false"]').waitFor({state: 'attached'});
  assert.equal(await animation(), 'paused');
});

test('从内联原创卡片的详情下载单文件，断网后仍能操作', {timeout: 25_000}, async t => {
  const site = await startServer(t);
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const context = await browser.newContext({locale: 'en-US'});
  const page = await context.newPage();
  await page.goto(site);
  const card = page.locator('[data-ui="ink-switch"]');
  await card.locator('[data-original-card]').getByRole('switch', {name: 'Ink Switch'}).waitFor();
  await card.locator('[data-detail]').click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#component-download').click(),
  ]);
  assert.equal(download.suggestedFilename(), 'ui-moments-ink-switch.html');
  const local = await readFile(await download.path(), 'utf8');
  assert.equal(local, await readFile(new URL('../_site/gallery/originals/dist/ink-switch.html', import.meta.url), 'utf8'));
  await context.setOffline(true);
  const offline = await context.newPage();
  const temp = await mkdtemp(join(tmpdir(), 'original-download-'));
  t.after(() => rm(temp, {recursive: true, force: true}));
  const file = join(temp, download.suggestedFilename());
  await download.saveAs(file);
  await offline.goto(pathToFileURL(file).href);
  const ink = offline.getByRole('switch', {name: 'Ink Switch'});
  await ink.press('Space');
  assert.equal(await ink.getAttribute('aria-checked'), 'true');
});

test('详情只响应遮罩点按，关闭后清理深链并还原焦点', {timeout: 35_000}, async t => {
  const site = await startServer(t);
  for (const engine of [chromium, webkit]) {
    const browser = await engine.launch();
    t.after(() => browser.close());
    const page = await browser.newPage({viewport: {width: 1440, height: 900}, hasTouch: true, reducedMotion: 'reduce'});
    await page.goto(site);
    await page.locator('html[data-ready="true"]').waitFor();
    for (const [id, query, selector] of [
      ['fluent-teaching-popover', 'Teaching Popover', '#component-detail'],
      ['paper-fold', 'Paper Fold', '#detail'],
    ]) {
      const label = `${engine.name()} ${id}`;
      await page.getByRole('searchbox').fill(query);
      const trigger = page.locator(`[data-ui="${id}"] [data-detail]`);
      const dialog = page.locator(selector);
      const open = async () => {
        await trigger.click();
        await dialog.waitFor();
        assert.equal(new URL(page.url()).hash, `#${id}`, label);
      };
      const assertClosed = async () => {
        await dialog.waitFor({state: 'hidden'});
        await page.waitForFunction(() => document.body.style.overflow === '');
        await page.locator(`[data-ui="${id}"] [data-detail]:focus`).waitFor();
        assert.equal(new URL(page.url()).hash, '', label);
      };
      await open();
      const {x, y} = await dialog.boundingBox();
      const innerX = Math.round(x + 20);
      const testY = Math.round(y + 24);
      await page.mouse.click(innerX, testY);
      await page.mouse.click(12, testY, {button: 'right'});
      assert.ok(await dialog.isVisible(), label);
      for (const [from, to] of [[innerX, 12], [12, innerX]]) {
        await page.mouse.move(from, testY);
        await page.mouse.down();
        await page.mouse.move(to, testY, {steps: 5});
        await page.mouse.up();
        assert.ok(await dialog.isVisible(), label);
      }
      await page.mouse.click(12, testY);
      await assertClosed();

      await open();
      await page.touchscreen.tap(12, testY);
      await assertClosed();

      await open();
      await page.keyboard.press('Escape');
      await assertClosed();
    }
    await page.close();
  }
});
