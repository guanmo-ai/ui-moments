import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { astryxWorks } from '../gallery/astryx/catalog.mjs';
import { fluentWorks } from '../gallery/fluent-ui/catalog.mjs';
import { remainingScenarios } from '../gallery/fluent-ui/tools/browser-scenarios.mjs';

let temp;
let server;
let browser;
let site;

before(async () => {
  temp = await mkdtemp(join(tmpdir(), 'ui-moments-'));
  const artifact = fileURLToPath(new URL('../_site', import.meta.url));
  await symlink(artifact, join(temp, 'ui-moments'), 'dir');
  server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1', '--protocol', 'HTTP/1.1', '--directory', temp], {
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  server.stdout.setEncoding('utf8');
  const address = await Promise.race([
    once(server.stdout, 'data').then(([line]) => line.match(/port (\d+)/)?.[1]),
    once(server, 'exit').then(([code]) => { throw new Error(`静态服务器启动失败：${code}`); }),
  ]);
  assert.ok(address, '静态服务器应输出监听端口');
  site = `http://127.0.0.1:${address}/ui-moments/`;
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  if (server?.kill()) await once(server, 'exit');
  if (temp) await rm(temp, { recursive: true, force: true });
});

async function clickHeading(page, card, name) {
  const heading = card.getByRole('heading', { name, exact: true });
  await heading.scrollIntoViewIfNeeded();
  const box = await heading.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

test('发布包子路径下可搜索、操作滑尺、下载 HTML 并复制提示词', { timeout: 30_000 }, async t => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  t.after(() => page.close());
  page.setDefaultTimeout(5_000);
  const errors = [];
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.url().startsWith(site) && response.status() >= 400) errors.push(response.url());
  });
  await page.goto(site);
  await page.locator('html[data-ready="true"]').waitFor({ state: 'attached' });
  const catalogCount = Number(await page.locator('#categories [data-category="all"] .category-count').innerText());
  assert.equal(await page.locator('.ui-item').count(), catalogCount);
  assert.equal(Number(await page.locator('[data-stat="total"]').innerText()), catalogCount);
  await page.frameLocator('[data-ui="ink-switch"] iframe').getByRole('switch', { name: 'Ink Switch' }).waitFor();
  assert.equal(await page.evaluate(() => window.scrollY), 0, '嵌入控件载入后首页仍停在顶部');
  assert.ok(await page.locator('.ui-stage .ui-animation').count() < 35, '首页只挂载近屏的循环动效');
  assert.ok(!requests.some(url => url.endsWith('/gallery/loading-ui/dist/THIRD_PARTY_LICENSES.txt')), '首屏不请求第三方导出许可');
  await page.getByRole('link', { name: 'Try Jelly Cube' }).click();
  await page.locator('#component-detail[open]').getByRole('heading', { name: 'Jelly Cube' }).waitFor();
  await page.locator('#component-close').click();

  const search = page.locator('#work-search');
  await search.fill('gallery/date-picker/');
  await page.locator('#empty').waitFor();
  for (const path of ['gallery/date-picker/', 'gallery/date-picker/dist/']) {
    const response = await page.request.get(new URL(path, site).href);
    assert.equal(response.status(), 404, path);
  }

  await search.fill('Elastic Slider');
  const card = page.locator('[data-ui="elastic-ruler"]');
  assert.equal(await page.locator('.ui-item:visible').count(), 1);
  const ruler = card.frameLocator('iframe').getByRole('slider', { name: 'Slider position' });
  const value = Number(await ruler.inputValue());
  await ruler.press('ArrowRight');
  assert.equal(Number(await ruler.inputValue()), value + 1);
  assert.equal(await page.locator('dialog[open]').count(), 0);
  await clickHeading(page, card, 'Elastic Slider');
  await page.frameLocator('#component-frame').getByRole('slider', { name: 'Slider position' }).waitFor();
  const save = page.locator('#component-detail [data-save-work]');
  await save.click();
  assert.equal(await save.getAttribute('aria-pressed'), 'true');
  await page.locator('#component-close').click();
  await page.waitForURL(url => !url.hash);
  await search.fill('');
  await page.reload();
  await page.locator('#gallery-favorites').click();
  assert.equal(await page.locator('.ui-item:visible').count(), 1);
  await card.getByRole('button', { name: 'Details Elastic Slider' }).press('Enter');
  await save.waitFor({ state: 'visible' });
  assert.equal(await save.getAttribute('aria-pressed'), 'true');
  await save.click();
  await page.locator('#component-close').click();
  await page.locator('#empty').waitFor();
  await page.locator('#gallery-favorites').click();

  await page.locator('#categories [data-category="feedback"]').click();
  assert.equal(await page.locator('.ui-item:visible').count(), 12);
  const jelly = page.locator('[data-ui="micron-jelly"]');
  assert.equal(await jelly.locator('iframe').count(), 0);
  const trigger = jelly.getByRole('button', { name: 'Try Jelly' });
  await trigger.click();
  assert.ok(await trigger.evaluate(button => button.getAnimations().some(animation => animation.animationName === 'action-jelly')));
  assert.equal(await page.locator('dialog[open]').count(), 0);
  assert.doesNotMatch(await page.locator('main').innerText(), /\p{Script=Han}/u);
  await page.locator('[data-shape="Swing"]').click();
  assert.equal(await page.locator('.ui-item:visible').count(), 4);
  await page.locator('#categories [data-category="loading"]').click();
  assert.equal(await page.locator('.ui-item:visible').count(), 164);
  const foldAnimations = () => {
    const shadow = document.querySelector('[data-ui="paper-fold"] .ui-animation')?.shadowRoot;
    return shadow?.getAnimations().map(animation => animation.playState) ?? [];
  };
  await page.locator('[data-ui="paper-fold"] .ui-animation').waitFor();
  await page.locator('#motion').click();
  assert.ok(await page.locator('[data-ui="paper-fold"] .ui-playback').isDisabled());
  const states = await page.evaluate(foldAnimations);
  assert.ok(states.length > 0 && states.every(state => state === 'paused'));
  await page.locator('#motion').click();
  const ring = page.locator('[data-ui="ring"]');
  const playback = ring.locator('.ui-playback');
  await playback.click();
  assert.equal(await playback.getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('dialog[open]').count(), 0);
  await playback.click();
  assert.equal(await playback.getAttribute('aria-pressed'), 'false');
  await clickHeading(page, ring, 'Ring');
  await page.locator('#detail[open]').waitFor();
  await page.locator('#prop-size').fill('96');
  assert.match(await page.locator('#code').inputValue(), /Griffin Johnston/);
  await page.locator('#tab-html').press('ArrowRight');
  assert.equal(await page.locator('#tab-react').getAttribute('aria-selected'), 'true');
  await page.locator('#detail .dialog-actions .primary').click();
  assert.match(await page.evaluate(() => navigator.clipboard.readText()), /size: 96/);
  await page.locator('#tab-react').press('ArrowLeft');
  const download = page.waitForEvent('download');
  await page.locator('#download').click();
  const exported = join(temp, 'ring.html');
  await (await download).saveAs(exported);
  await page.goto(pathToFileURL(exported).href);
  await page.locator('svg').first().waitFor({ state: 'visible' });
  assert.deepEqual(errors, []);
});

test('站点可双向切换语言，已操作的组件和独立演示保持英文', { timeout: 30_000 }, async t => {
  const page = await browser.newPage({ viewport: { width: 320, height: 800 }, hasTouch: true, reducedMotion: 'reduce' });
  t.after(() => page.close());
  page.setDefaultTimeout(5_000);
  await page.goto(`${site}?q=ink-switch`);
  await page.getByRole('heading', { name: 'Interactive UI Gallery' }).waitFor();
  const card = page.locator('[data-ui="ink-switch"]');
  const preview = card.frameLocator('iframe');
  const ink = preview.getByRole('switch', { name: 'Ink Switch' });
  await ink.tap();
  assert.equal(await ink.getAttribute('aria-checked'), 'true');
  const frameUrl = await card.locator('iframe').getAttribute('src');

  await page.getByRole('button', { name: 'Switch to Simplified Chinese' }).tap();
  await page.getByRole('heading', { name: '界面交互图鉴' }).waitFor();
  assert.equal(await page.locator('html').getAttribute('lang'), 'zh-CN');
  assert.equal(await page.locator('#work-search').inputValue(), 'ink-switch');
  assert.equal(await page.locator('.ui-item:visible').count(), 1);
  assert.equal(await card.locator('iframe').getAttribute('src'), frameUrl);
  assert.equal(await ink.getAttribute('aria-checked'), 'true');
  assert.equal(await preview.locator('html').getAttribute('lang'), 'en');
  assert.doesNotMatch(await preview.locator('body').innerText(), /\p{Script=Han}/u);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 320);

  await card.getByRole('button', { name: '详情 Ink Switch' }).tap();
  const details = page.locator('#component-detail[open]');
  await details.getByRole('button', { name: '复制提示词' }).waitFor();
  await details.frameLocator('iframe').getByRole('switch', { name: 'Ink Switch' }).waitFor();
  await details.getByRole('button', { name: '关闭组件详情' }).tap();

  await page.getByRole('navigation', { name: '站点导航' }).getByRole('link', { name: '风格库' }).tap();
  await page.getByRole('heading', { name: '风格库' }).waitFor();
  await page.getByRole('radio', { name: '孟菲斯' }).waitFor();
  await page.frameLocator('#preview-stage iframe:visible').getByRole('slider', { name: 'Slider position' }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 320);

  await page.goto(new URL('gallery/loaders/#ring', site).href);
  const loader = page.locator('#detail[open]');
  await loader.getByRole('heading', { name: '动效设置' }).waitFor();
  await loader.getByRole('button', { name: '下载 HTML' }).waitFor();
  assert.match(await loader.locator('#code').inputValue(), /<html lang="en">/);
  await loader.getByRole('button', { name: '关闭动效详情' }).tap();
  await page.getByRole('button', { name: '切换为英文' }).tap();
  await page.getByRole('heading', { name: 'Loading Animations' }).waitFor();
  await page.reload();
  await page.getByRole('button', { name: 'Switch to Simplified Chinese' }).waitFor();
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 320);
});

test('主图鉴混排作品，可通过搜索找到并操作 Fluent UI 组件', { timeout: 30_000 }, async t => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
  t.after(() => page.close());
  page.setDefaultTimeout(5_000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(site);
  assert.ok(await page.locator('[data-ui="magnet-grid"]').isVisible());
  assert.ok(await page.locator('[data-ui="fluent-drawer"]').isVisible());
  const search = page.locator('#work-search');
  await search.fill('Fluent UI');
  assert.equal(await page.locator('.ui-item:visible').count(), fluentWorks.length);

  await page.locator('#categories [data-category="loading"]').tap();
  await page.locator('#empty').waitFor();
  await page.locator('#categories [data-category="input"]').tap();
  await search.fill('fluent-drawer');
  assert.equal(await page.locator('.ui-item:visible').count(), 1);
  await search.fill('Fluent UI');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);

  const drawerCard = page.locator('[data-ui="fluent-drawer"]');
  const drawer = drawerCard.frameLocator('iframe');
  const drawerTrigger = drawer.getByRole('button', { name: 'Open settings' });
  await drawerTrigger.press('Enter');
  const settings = drawer.getByRole('dialog', { name: 'Settings' });
  const reminders = settings.getByRole('switch', { name: 'Receive reminders' });
  await reminders.check();
  await reminders.press('Escape');
  await settings.waitFor({ state: 'hidden' });
  await drawer.locator('button:focus').filter({ hasText: 'Open settings' }).waitFor();
  await drawerTrigger.tap();
  assert.ok(await reminders.isChecked());
  await settings.getByRole('button', { name: 'Close' }).tap();
  await settings.waitFor({ state: 'hidden' });

  const popover = page.frameLocator('[data-ui="fluent-teaching-popover"] iframe');
  await popover.getByRole('button', { name: 'Show tip' }).tap();
  await popover.getByText('Quick search', { exact: true }).waitFor();
  assert.ok(await popover.locator('.fui-TeachingPopoverSurface').evaluate(el => el.getBoundingClientRect().bottom <= innerHeight));

  const toastCard = page.locator('[data-ui="fluent-toast"]');
  await toastCard.scrollIntoViewIfNeeded();
  const toast = toastCard.frameLocator('iframe');
  const save = toast.getByRole('button', { name: 'Save project' });
  await save.tap();
  await save.tap();
  await toast.locator('.fui-Toast').getByText('Saved · 1', { exact: true }).waitFor();
  await toast.locator('.fui-Toast').getByText('Saved · 2', { exact: true }).waitFor();
  assert.ok(await toast.locator('.fui-Toast').evaluateAll(elements => elements.every(el => {
    const {left, right, bottom} = el.getBoundingClientRect();
    return left >= 0 && right <= innerWidth && bottom <= innerHeight;
  })));
  await toast.locator('.fui-Toast').first().waitFor({ state: 'hidden' });
  assert.equal(await toast.locator('.fui-Toast').count(), 0);

  await drawerCard.locator('[data-detail]').tap();
  await page.locator('#component-detail[open]').getByRole('link', { name: /Fluent UI · Microsoft/ }).waitFor();
  const licenseUrl = await page.locator('#component-credit').getByRole('link', { name: 'MIT license' }).getAttribute('href');
  const license = await page.request.get(new URL(licenseUrl, site).href);
  assert.match(await license.text(), /Copyright \(c\) Microsoft Corporation/);
  await page.locator('#component-close').tap();
  await page.reload();
  assert.ok(await page.locator('[data-ui="magnet-grid"]').isVisible());
  assert.ok(await page.locator('[data-ui="fluent-drawer"]').isVisible());
  assert.deepEqual(errors, []);
});

test('全部 Fluent UI 示例的交互可在手机卡片尺寸下运行', { timeout: 120_000 }, async t => {
  const page = await browser.newPage({ viewport: { width: 168, height: 108 }, hasTouch: true, reducedMotion: 'reduce' });
  t.after(() => page.close());
  page.setDefaultTimeout(2_500);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

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
  const expected = fluentWorks.map(work => new URL(work.demo, site).searchParams.get('sample'))
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

test('发布包中的 Astryx 主示例、变体、图表和实验组件逐项渲染', { timeout: 420_000 }, async () => {
  const samples = astryxWorks.entries();
  const failures = [];
  const context = await browser.newContext({viewport: {width: 220, height: 155}, reducedMotion: 'reduce'});
  try {
    await Promise.all(Array.from({length: 4}, async () => {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => {
        if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
      });
      page.on('request', request => {
        if (!request.url().startsWith(site)) errors.push(`外部资源：${request.url()}`);
      });
      try {
        for (const [index, item] of samples) {
          errors.length = 0;
          const url = new URL(item.demo, site);
          url.search = new URLSearchParams({embed: 'ui', sample: url.hash.slice(1), preview: 'card', theme: index % 2 ? 'dark' : 'light'});
          url.hash = '';
          try {
            const width = item.previewSize ? 390 : 220;
            const height = item.previewSize === 'large' ? 432 : item.previewSize === 'wide' ? 265 : 155;
            await page.setViewportSize({width, height});
            await page.goto(url.href, {waitUntil: 'domcontentloaded'});
            const content = item.fitPreview ? '.showcase > *' : '.stage > *';
            await page.locator(content).first().waitFor({timeout: 12_000});
            await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
            if (item.type === 'Data visualization') {
              await page.locator('.showcase :is(svg, canvas)').first().waitFor({timeout: 6_000});
            }
          } catch (error) {
            errors.push(error.message);
          }
          if (errors.length) failures.push({id: item.id, errors: [...errors]});
        }
      } finally {
        await page.close();
      }
    }));
  } finally {
    await context.close();
  }
  assert.deepEqual(failures, []);
});

test('Astryx 新示例可全选表单、拖选图表和进入实验导航的下一层', { timeout: 30_000 }, async t => {
  const page = await browser.newPage({viewport: {width: 680, height: 540}, reducedMotion: 'reduce'});
  t.after(() => page.close());
  page.setDefaultTimeout(5_000);
  const open = key => {
    const sample = astryxWorks.find(item => item.id === `astryx-${key}`);
    assert.ok(sample, key);
    return page.goto(new URL(sample.demo, site).href);
  };

  await open('variant-checkbox-list-checkbox-list-select-all-pattern');
  const all = page.getByRole('checkbox', {name: 'Select all'});
  await all.press('Space');
  assert.ok(await page.getByRole('checkbox', {name: 'Invoices'}).isChecked());

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

test('图鉴中的 Astryx 组件可选择日期、操作弹层和键盘选择命令', { timeout: 30_000 }, async t => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
  t.after(() => page.close());
  page.setDefaultTimeout(5_000);
  const errors = [];
  const externalRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (!request.url().startsWith(site)) externalRequests.push(request.url());
  });
  await page.goto(`${site}?q=Astryx`);
  await page.locator('html[data-ready="true"]').waitFor({ state: 'attached' });
  assert.equal(await page.locator('.ui-item:visible').count(), astryxWorks.length);
  const adapted = page.locator('[data-ui="astryx-date-range"]:visible, [data-ui="astryx-bottom-sheet"]:visible, [data-ui="astryx-command-palette"]:visible');
  assert.equal(await adapted.count(), 3);
  await page.locator('#categories [data-category="input"]').tap();
  assert.equal(await adapted.count(), 3);

  const fitsInPreview = locator => locator.evaluate(async element => {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const {left, top, right, bottom} = element.getBoundingClientRect();
    return left >= 0 && top >= 0 && right <= innerWidth && bottom <= innerHeight &&
      element.contains(document.elementFromPoint((left + right) / 2, (top + bottom) / 2));
  });
  const dateCard = page.locator('[data-ui="astryx-date-range"]');
  const date = dateCard.frameLocator('iframe');
  const dateTrigger = date.getByRole('button', { name: /^Date range/ });
  await dateTrigger.tap();
  const calendar = date.getByRole('grid');
  assert.ok(await fitsInPreview(calendar));
  await calendar.locator('button[data-date$="-10"]:not([aria-disabled="true"])').tap();
  await calendar.locator('button[data-date$="-12"]:not([aria-disabled="true"])').tap();
  await calendar.waitFor({ state: 'hidden' });
  await date.getByRole('button', { name: /clear.*date range/i }).tap();
  await dateTrigger.getByText('Select a date range').waitFor();
  assert.equal(await page.locator('dialog[open]').count(), 0);

  await dateCard.locator('[data-detail]').tap();
  const detail = page.locator('#component-detail[open]');
  await detail.getByRole('link', { name: /Astryx · Meta Platforms/ }).waitFor();
  await detail.locator('#component-close').tap();
  await dateCard.locator('[data-detail]:focus').waitFor();

  const sheetCard = page.locator('[data-ui="astryx-bottom-sheet"]');
  await sheetCard.scrollIntoViewIfNeeded();
  const sheet = sheetCard.frameLocator('iframe');
  const sheetTrigger = sheet.getByRole('button', { name: 'Open bottom sheet' });
  await sheetTrigger.tap();
  const preferences = sheet.getByRole('dialog', { name: 'Demo preferences' });
  const apply = preferences.getByRole('button', { name: 'Apply' });
  assert.ok(await fitsInPreview(apply));
  await apply.press('Escape');
  await preferences.waitFor({ state: 'hidden' });
  await sheetTrigger.tap();
  await apply.tap();
  await sheet.getByText('Preferences applied', { exact: true }).waitFor();
  await page.locator('#theme').tap();
  const theme = await page.locator('html').getAttribute('data-theme');
  await sheet.locator(`html[data-theme="${theme}"]`).waitFor({ state: 'attached' });

  const paletteCard = page.locator('[data-ui="astryx-command-palette"]');
  await paletteCard.scrollIntoViewIfNeeded();
  const palette = paletteCard.frameLocator('iframe');
  await palette.getByRole('button', { name: 'Open command palette' }).tap();
  const search = palette.getByRole('combobox', { name: 'Search commands' });
  const options = palette.getByRole('option');
  await options.last().waitFor();
  assert.equal(await options.count(), 3);
  for (const option of await options.all()) {
    await option.click({ trial: true });
    assert.ok(await fitsInPreview(option));
  }
  await search.fill('settings');
  await palette.getByRole('option', { name: 'Open settings' }).waitFor();
  await search.press('ArrowDown');
  await search.press('Enter');
  await palette.getByText('Selected: Open settings', { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  assert.deepEqual(externalRequests, []);
});

test('手机风格库切换外观时保留控件状态，深链接可直接打开', { timeout: 30_000 }, async t => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', isMobile: true, hasTouch: true });
  t.after(() => page.close());
  page.setDefaultTimeout(5_000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(new URL('styles.html?style=bauhaus#bookmark-press', site).href);
  const preview = page.frameLocator('#preview-stage iframe:visible');
  await preview.locator('html[data-ui-style="bauhaus"]').waitFor({ state: 'attached' });
  const bookmark = preview.getByRole('button', { name: 'Bookmark' });
  await bookmark.tap();
  assert.equal(await bookmark.getAttribute('aria-pressed'), 'true');
  await page.locator('#style-options label[data-ui-style="pixel"]').tap();
  await preview.locator('html[data-ui-style="pixel"]').waitFor({ state: 'attached' });
  assert.equal(await bookmark.getAttribute('aria-pressed'), 'true');
  assert.equal(new URL(page.url()).searchParams.get('style'), 'pixel');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);

  assert.equal(await page.locator('#component-options label').filter({ hasText: 'Date Picker' }).count(), 0);
  await page.locator('#catalog-link').click();
  await page.locator('#component-detail[open]').getByRole('heading', { name: 'Bookmark Button' }).waitFor();
  await page.locator('#component-close').tap();
  await page.locator('#categories [data-category="input"]').tap();
  const card = page.locator('[data-ui="bookmark-press"]');
  // 交互控件按需挂载：卡片接近视口后才创建 iframe。
  await card.scrollIntoViewIfNeeded();
  const inlineBookmark = card.frameLocator('iframe').getByRole('button', { name: 'Bookmark' });
  await inlineBookmark.tap();
  assert.equal(await inlineBookmark.getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('dialog[open]').count(), 0);
  await card.getByRole('button', { name: 'Details Bookmark Button' }).tap();
  await page.locator('#component-detail[open]').getByRole('heading', { name: 'Bookmark Button' }).waitFor();
  assert.deepEqual(errors, []);
});

test('动效资源失败时其余画廊可浏览，失败卡片可重试', { timeout: 15_000 }, async t => {
  const page = await browser.newPage();
  t.after(() => page.close());
  await page.route('**/gallery/loading-ui/dist/runtime.js', route => route.fulfill({ status: 404 }), { times: 1 });
  await page.goto(`${site}?q=loading-ui-ring`);
  const card = page.locator('[data-ui="loading-ui-ring"]');
  const retry = card.getByRole('button', { name: 'Retry Ring preview' });
  await retry.waitFor({ state: 'visible' });
  await retry.click();
  await card.locator('.ui-animation').waitFor();
  await page.locator('#work-search').fill('Paper Fold');
  await page.locator('[data-ui="paper-fold"] .ui-animation').waitFor();
});

test('原创控件支持键盘操作，嵌入时只显示所选控件', { timeout: 20_000 }, async t => {
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  t.after(() => page.close());
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(new URL('gallery/originals/index.html', site).href);

  const ink = page.getByRole('switch', { name: 'Ink Switch' });
  await ink.press('Space');
  assert.equal(await ink.getAttribute('aria-checked'), 'true');

  const dial = page.getByRole('slider', { name: 'Detent Dial' });
  await dial.press('ArrowUp');
  await dial.press('PageUp');
  assert.equal(await dial.getAttribute('aria-valuenow'), '7');
  await dial.press('End');
  assert.equal(await dial.getAttribute('aria-valuenow'), '10');

  const stepper = page.getByRole('spinbutton', { name: 'Odometer Stepper' });
  await stepper.press('ArrowUp');
  await stepper.press('ArrowUp');
  assert.equal(await stepper.getAttribute('aria-valuenow'), '10');
  await stepper.press('Home');
  assert.equal(await stepper.getAttribute('aria-valuenow'), '0');

  const tabs = page.getByRole('tab');
  await tabs.nth(1).press('ArrowRight');
  assert.equal(await tabs.nth(2).getAttribute('aria-selected'), 'true');
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'M');

  const hold = page.locator('.hold');
  await hold.focus();
  await page.keyboard.down('Space');
  await page.waitForTimeout(1350);
  await page.keyboard.up('Space');
  assert.equal(await page.locator('#hold-status').textContent(), 'Deleted');

  await page.goto(new URL('gallery/originals/index.html?embed=ui&theme=light&sample=tide-progress', site).href);
  assert.equal(await page.locator('.sample:visible').count(), 1);
  assert.equal(await page.locator('#tide-progress').isVisible(), true);
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light');
  assert.deepEqual(errors, []);
});

test('第二、三批原创控件可用键盘完成主要操作', { timeout: 25_000 }, async t => {
  const page = await browser.newPage({ viewport: { width: 1024, height: 900 } });
  t.after(() => page.close());
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto(new URL('gallery/originals/visual.html', site).href);
  const bloom = page.getByRole('switch', { name: 'Bloom Toggle' });
  await bloom.press('Space');
  assert.equal(await bloom.getAttribute('aria-checked'), 'true');
  await page.goto(new URL('gallery/originals/color.html', site).href);
  const cord = page.getByRole('switch', { name: 'Pull Cord Lamp' });
  await cord.press('Enter');
  assert.equal(await cord.getAttribute('aria-checked'), 'true');
  const hue = page.getByRole('slider', { name: 'Hue Orbit' });
  await hue.press('ArrowRight');
  assert.equal(await hue.getAttribute('aria-valuenow'), '300');

  await page.goto(new URL('gallery/originals/motion.html', site).href);
  const fan = page.getByRole('button', { name: 'Card Fan' });
  await fan.press('Enter');
  assert.equal(await fan.getAttribute('aria-expanded'), 'true');
  const flow = page.getByRole('group', { name: 'Cover Flow' });
  await flow.press('ArrowRight');
  assert.equal(await page.locator('#flow-status').textContent(), 'Card 4 of 5');
  const menu = page.getByRole('button', { name: 'Menu' });
  await menu.press('Enter');
  assert.equal(await page.locator('.menu').getAttribute('aria-expanded'), 'true');

  await page.goto(new URL('gallery/originals/gestures.html', site).href);
  const swipe = page.getByRole('button', { name: 'Swipe to Confirm' });
  await swipe.press('Enter');
  assert.equal(await page.locator('#swipe-status').textContent(), 'Confirmed');
  const rocker = page.getByRole('switch', { name: 'Rocker Switch' });
  await rocker.press('Space');
  assert.equal(await rocker.getAttribute('aria-checked'), 'true');
  const wave = page.getByRole('slider', { name: 'Scrub Wave' });
  await wave.press('End');
  assert.equal(await wave.getAttribute('aria-valuenow'), '100');
  await page.getByRole('button', { name: 'Radial Menu' }).press('Enter');
  await page.getByRole('button', { name: 'Save' }).waitFor();
  const steps = page.getByRole('progressbar', { name: 'Step Track' });
  await page.getByRole('button', { name: 'Next step' }).click();
  assert.equal(await steps.getAttribute('aria-valuenow'), '3');
  await page.getByRole('application', { name: 'Snap Grid' }).press('ArrowRight');
  assert.equal(await page.locator('#snap-status').textContent(), 'Row 2, column 3');

  await page.goto(new URL('gallery/originals/elastic.html', site).href);
  const stretch = page.getByRole('switch', { name: 'Stretch Toggle' });
  await stretch.press('Space');
  assert.equal(await stretch.getAttribute('aria-checked'), 'true');
  await page.getByRole('tab', { name: 'Home' }).press('ArrowRight');
  assert.equal(await page.getByRole('tab', { name: 'Search' }).getAttribute('aria-selected'), 'true');
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await page.getByRole('button', { name: /Cart, 1 item/ }).waitFor();
  const volume = page.getByRole('slider', { name: 'Bulge Volume' });
  await volume.press('End');
  assert.equal(await volume.getAttribute('aria-valuenow'), '100');
  await page.getByRole('button', { name: 'Elastic Accordion' }).press('Enter');
  assert.equal(await page.locator('.acc-head').getAttribute('aria-expanded'), 'true');

  await page.goto(new URL('gallery/originals/inputs.html', site).href);
  const notch = page.getByRole('slider', { name: 'Notch Slider' });
  await notch.press('ArrowRight');
  assert.equal(await notch.getAttribute('aria-valuetext'), 'L');
  const chips = page.getByRole('textbox', { name: 'New tag' });
  await chips.fill('original');
  await chips.press('Enter');
  assert.equal(await page.locator('.chip').count(), 3);
  await chips.press('Backspace');
  await page.waitForFunction(() => document.querySelectorAll('.chip').length === 2);

  await page.goto(new URL('gallery/originals/actions.html', site).href);
  const like = page.getByRole('button', { name: 'Like' });
  await like.press('Enter');
  assert.equal(await like.getAttribute('aria-pressed'), 'true');
  await page.getByRole('textbox', { name: 'Digit 1' }).focus();
  await page.keyboard.type('2468');
  assert.equal(await page.locator('.code-hint').textContent(), 'Verified');
  assert.deepEqual(errors, []);
});
