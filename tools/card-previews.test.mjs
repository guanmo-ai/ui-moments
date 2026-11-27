import assert from 'node:assert/strict';
import {availableParallelism} from 'node:os';
import {performance} from 'node:perf_hooks';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {astryxWorks} from '../gallery/astryx/catalog.mjs';
import {fluentWorks} from '../gallery/fluent-ui/catalog.mjs';
import {monitor, revealGalleryCards, startServer} from './browser-site.mjs';

function previewUrl(item, base) {
  const url = new URL(item.demo, base);
  if (url.hash) url.searchParams.set('sample', url.hash.slice(1));
  url.hash = '';
  for (const [name, value] of Object.entries({embed: 'ui', preview: 'card', paused: '1', theme: 'dark'})) {
    url.searchParams.set(name, value);
  }
  return url.href;
}

async function throttleCpu(context, page, rate) {
  if (rate === 1) return;
  const session = await context.newCDPSession(page);
  await session.send('Emulation.setCPUThrottlingRate', {rate});
}

async function checkOriginalCards(page, width) {
  const ids = await page.evaluate(() => window.WORKS.map(({id}) => id));
  assert.equal(ids.length, 36);
  for (const id of ids) {
    // A card can fill a spare column in All. Filter at phone width to exercise the actual narrow slot.
    if (width === 390) await page.locator('#work-search').fill(id);
    const card = page.locator(`[data-ui="${id}"]`);
    await card.scrollIntoViewIfNeeded();
    const preview = card.locator('[data-original-card][data-hydrated]');
    const stage = preview.locator('.stage');
    if (id === 'chip-input' && width === 390) {
      const input = preview.getByRole('textbox');
      for (let i = 1; i <= 5; i++) {
        await input.fill(`WWWWWWW${i}`);
        await input.press('Enter');
      }
      assert.equal(await preview.locator('.chip').count(), 5);
      assert.ok(await input.evaluate(node => {
        const field = node.closest('.chips');
        return node.getBoundingClientRect().bottom <= field.getBoundingClientRect().bottom;
      }), '390px chip-input 保留输入框');
    }
    const dimensions = await stage.evaluate(node => {
      const box = node.getBoundingClientRect();
      const clipped = [...node.children].some(child => {
        const bounds = child.getBoundingClientRect();
        return bounds.left < box.left - 0.5 || bounds.right > box.right + 0.5 ||
          bounds.top < box.top - 0.5 || bounds.bottom > box.bottom + 0.5;
      });
      const viewport = node.getRootNode().host.parentElement;
      const columnWidth = Number.parseFloat(getComputedStyle(viewport.closest('#ui-grid')).gridTemplateColumns);
      return {width: node.clientWidth, height: node.clientHeight, viewportWidth: viewport.clientWidth, viewportHeight: viewport.clientHeight,
        columnWidth, scrollWidth: node.scrollWidth, scrollHeight: node.scrollHeight, clipped};
    });
    assert.ok(dimensions.width === dimensions.viewportWidth && dimensions.height === dimensions.viewportHeight &&
      (width !== 390 || dimensions.width <= Math.ceil(dimensions.columnWidth)) &&
      dimensions.scrollWidth <= dimensions.width && dimensions.scrollHeight <= dimensions.height && !dimensions.clipped,
      `${width}px ${id} ${JSON.stringify(dimensions)}`);
    if (id !== 'plan-picker') continue;
    for (const name of ['Basic', 'Pro', 'Team']) {
      await preview.locator('.plans label').filter({hasText: name}).click();
      const ring = await stage.evaluate(node => {
        const active = node.querySelector('label:has(input:checked)');
        const label = active.getBoundingClientRect();
        const overlay = node.querySelector('.plan-ring').getBoundingClientRect();
        const box = node.getBoundingClientRect();
        const fits = label.left >= box.left && label.right <= box.right && label.top >= box.top && label.bottom <= box.bottom;
        return {name: active.querySelector('b').textContent, fits,
          aligned: ['left', 'top', 'width', 'height'].every(key => Math.abs(label[key] - overlay[key]) <= 0.5)};
      });
      assert.deepEqual(ring, {name, fits: true, aligned: true}, `${width}px ${id} ${name}`);
    }
  }
}

async function measureCardStages(context, base, width, columns, cpuRate) {
  const page = await context.newPage();
  try {
    await throttleCpu(context, page, cpuRate);
    await page.setViewportSize({width, height: 900});
    await page.goto(base);
    await page.locator('html[data-ready="true"]').waitFor();
    assert.equal(await page.locator('#ui-grid').evaluate(grid =>
      Number(getComputedStyle(grid).getPropertyValue('--columns'))), columns);
    await revealGalleryCards(page);
    assert.equal(await page.locator('#ui-grid > article:not([hidden])').count(), 884);
    const sizes = await page.locator('.ui-item').evaluateAll(cards => Object.fromEntries(cards.map(card => {
      const stage = card.querySelector('.ui-stage');
      return [card.dataset.ui, {width: stage.clientWidth, height: stage.clientHeight}];
    })));
    await checkOriginalCards(page, width);
    return sizes;
  } finally {
    await page.close();
  }
}

test('1440 五列和 390 两列的 866 张卡片全部渲染且没有溢出', {timeout: 900_000}, async t => {
  const start = performance.now();
  const cpuRate = Number(process.env.UI_MOMENTS_CARD_CPU_RATE ?? '1');
  assert.ok(Number.isFinite(cpuRate) && cpuRate >= 1, 'UI_MOMENTS_CARD_CPU_RATE 必须是大于等于 1 的有限数值');
  const cores = availableParallelism();
  const concurrency = cpuRate > 1 ? Math.min(cores, 2) : cores;
  t.after(() => t.diagnostic(`卡片检查用时 ${((performance.now() - start) / 1000).toFixed(1)} 秒，并发页数 ${concurrency}，CPU 降速倍率 ${cpuRate}`));
  assert.equal(astryxWorks.length, 779);
  assert.equal(fluentWorks.length, 51);
  const base = await startServer(t, {cacheAssets: true});
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const context = await browser.newContext({reducedMotion: 'reduce'});
  const samples = [...astryxWorks, ...fluentWorks];
  const jobs = [];
  for (const [width, columns] of [[1440, 5], [390, 2]]) {
    const sizes = await measureCardStages(context, base, width, columns, cpuRate);
    for (const item of samples) {
      assert.ok(sizes[item.id]?.width && sizes[item.id]?.height, item.id);
      jobs.push({item, width, size: sizes[item.id]});
    }
  }

  const queue = jobs.values();
  const failures = [];
  let checked = 0;
  try {
    await Promise.all(Array.from({length: concurrency}, async () => {
      const page = await context.newPage();
      const errors = [];
      await page.goto(base + 'card-preview-test');
      await throttleCpu(context, page, cpuRate);
      monitor(page, errors, base);
      const iframe = await page.locator('iframe').elementHandle();
      const frame = await iframe.contentFrame();
      try {
        for (const {item, width, size} of queue) {
          errors.length = 0;
          try {
            await iframe.evaluate((node, bounds) => {
              node.style.width = bounds.width + 'px';
              node.style.height = bounds.height + 'px';
            }, size);
            await frame.goto(previewUrl(item, base), {waitUntil: 'commit', timeout: 15_000 * cpuRate});
            const content = frame.locator(item.library.id === 'astryx'
              ? '#sample .stage > :not(.showcase, output), #sample .showcase > *'
              : '#demo .demo-stage > *');
            await content.first().waitFor({timeout: 12_000 * cpuRate});
            if (item.type === 'Data visualization') {
              await frame.locator('.showcase[data-preview-fit="ready"] :is(svg, canvas)').first().waitFor({timeout: 6_000 * cpuRate});
            }

            const dimensions = await frame.evaluate(async () => {
              await Promise.all([...document.images].map(image => image.decode()));
              const root = document.documentElement;
              const viewport = root.clientWidth;
              const panel = document.querySelector('.showcase');
              const clipped = panel && [...panel.children].some(child => {
                if (!child.getClientRects().length) return false;
                const rect = child.getBoundingClientRect();
                return rect.left < -0.5 || rect.right > viewport + 0.5;
              });
              return {viewport, document: root.scrollWidth, body: document.body.scrollWidth, clipped: Boolean(clipped)};
            });
            assert.equal(dimensions.viewport, size.width);
            assert.ok(dimensions.document <= dimensions.viewport && dimensions.body <= dimensions.viewport && !dimensions.clipped,
              JSON.stringify(dimensions));
          } catch (error) {
            errors.push(error.message);
          }
          if (errors.length) failures.push({id: item.id, width, size, errors: [...errors]});
          checked++;
        }
      } finally {
        await page.close();
      }
    }));
  } finally {
    await context.close();
  }
  assert.equal(checked, 1660);
  assert.deepEqual(failures, []);
  t.diagnostic('1440 五列与 390 两列各检查 830 个 iframe 和 36 个原创卡片');
});
