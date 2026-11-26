import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {astryxWorks} from '../gallery/astryx/catalog.mjs';
import {fluentWorks} from '../gallery/fluent-ui/catalog.mjs';
import {monitor, startServer} from './browser-site.mjs';

function previewUrl(item, base) {
  const url = new URL(item.demo, base);
  if (url.hash) url.searchParams.set('sample', url.hash.slice(1));
  url.hash = '';
  for (const [name, value] of Object.entries({embed: 'ui', preview: 'card', paused: '1', theme: 'dark'})) {
    url.searchParams.set(name, value);
  }
  return url.href;
}

async function measureCardStages(context, base, width, columns) {
  const page = await context.newPage();
  try {
    await page.setViewportSize({width, height: 900});
    await page.goto(base);
    await page.locator('html[data-ready="true"]').waitFor();
    assert.equal(await page.locator('#ui-grid').evaluate(grid =>
      Number(getComputedStyle(grid).getPropertyValue('--columns'))), columns);
    return await page.locator('.ui-item').evaluateAll(cards => Object.fromEntries(cards.map(card => {
      const stage = card.querySelector('.ui-stage');
      return [card.dataset.ui, {width: stage.clientWidth, height: stage.clientHeight}];
    })));
  } finally {
    await page.close();
  }
}

test('1440 五列和 390 两列的 830 张上游卡片全部渲染且没有横向溢出', {timeout: 900_000}, async t => {
  assert.equal(astryxWorks.length, 779);
  assert.equal(fluentWorks.length, 51);
  const base = await startServer(t);
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const context = await browser.newContext({reducedMotion: 'reduce'});
  const samples = [...astryxWorks, ...fluentWorks];
  const jobs = [];
  for (const [width, columns] of [[1440, 5], [390, 2]]) {
    const sizes = await measureCardStages(context, base, width, columns);
    for (const item of samples) {
      assert.ok(sizes[item.id]?.width && sizes[item.id]?.height, item.id);
      jobs.push({item, width, size: sizes[item.id]});
    }
  }

  const queue = jobs.values();
  const failures = [];
  let checked = 0;
  try {
    await Promise.all(Array.from({length: 8}, async () => {
      const page = await context.newPage();
      const errors = [];
      await page.goto(base + 'card-preview-test');
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
            await frame.goto(previewUrl(item, base), {waitUntil: 'domcontentloaded', timeout: 15_000});
            const content = frame.locator(item.library.id === 'astryx'
              ? '#sample .stage > :not(.showcase, output), #sample .showcase > *'
              : '#demo .demo-stage > *');
            await content.first().waitFor({timeout: 12_000});
            await frame.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
            if (item.type === 'Data visualization') {
              await frame.locator('.showcase :is(svg, canvas)').first().waitFor({timeout: 6_000});
            }

            const dimensions = await frame.evaluate(() => {
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
  t.diagnostic('1440 × 830 + 390 × 830，共 1660 个 iframe 检查通过');
});
