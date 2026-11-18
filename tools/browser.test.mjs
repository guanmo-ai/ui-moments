import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

let temp;
let server;
let browser;
let site;

before(async () => {
  temp = await mkdtemp(join(tmpdir(), 'ui-moments-'));
  const artifact = fileURLToPath(new URL('../_site', import.meta.url));
  await symlink(artifact, join(temp, 'ui-moments'), 'dir');
  server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1', '--directory', temp], {
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

test('发布包子路径下可搜索、操作滑尺、下载 HTML 并复制提示词', { timeout: 30_000 }, async t => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  t.after(() => page.close());
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.url().startsWith(site) && response.status() >= 400) errors.push(response.url());
  });
  await page.goto(site);
  await page.locator('html[data-ready="true"]').waitFor({ state: 'attached' });
  assert.equal(await page.locator('.ui-item').count(), 164);
  await page.frameLocator('[data-ui="bookmark-press"] iframe').getByRole('button', { name: '收藏' }).waitFor();
  assert.equal(await page.evaluate(() => window.scrollY), 0, '嵌入控件载入后首页仍停在顶部');
  await page.getByRole('link', { name: '试试昼夜开关' }).click();
  await page.locator('#component-detail[open]').getByRole('heading', { name: '昼夜开关' }).waitFor();
  await page.locator('#component-close').click();

  const search = page.locator('#work-search');
  await search.fill('日期选择器');
  await page.locator('#empty').waitFor();
  for (const path of ['gallery/date-picker/', 'gallery/date-picker/dist/']) {
    const response = await page.request.get(new URL(path, site).href);
    assert.equal(response.status(), 404, path);
  }

  await search.fill('弹性滑尺');
  const card = page.locator('[data-ui="elastic-ruler"]');
  assert.equal(await page.locator('.ui-item:visible').count(), 1);
  const ruler = card.frameLocator('iframe').getByRole('slider', { name: '滑尺位置' });
  const value = Number(await ruler.inputValue());
  await ruler.press('ArrowRight');
  assert.equal(Number(await ruler.inputValue()), value + 1);
  await card.getByRole('button', { name: '放大 弹性滑尺' }).click();
  await page.frameLocator('#component-frame').getByRole('slider', { name: '滑尺位置' }).waitFor();
  await page.locator('#component-close').click();
  await search.fill('');

  await page.locator('[data-ui="ring"] [data-detail]').click();
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

test('手机风格库切换外观时保留控件状态，深链接可直接打开', { timeout: 30_000 }, async t => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', isMobile: true, hasTouch: true });
  t.after(() => page.close());
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(new URL('styles.html?style=bauhaus#bookmark-press', site).href);
  const preview = page.frameLocator('#preview-stage iframe:visible');
  await preview.locator('html[data-ui-style="bauhaus"]').waitFor({ state: 'attached' });
  const bookmark = preview.getByRole('button', { name: '收藏' });
  await bookmark.tap();
  assert.equal(await bookmark.getAttribute('aria-pressed'), 'true');
  await page.locator('#style-options label[data-ui-style="pixel"]').tap();
  await preview.locator('html[data-ui-style="pixel"]').waitFor({ state: 'attached' });
  assert.equal(await bookmark.getAttribute('aria-pressed'), 'true');
  assert.equal(new URL(page.url()).searchParams.get('style'), 'pixel');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);

  assert.equal(await page.locator('#component-options label').filter({ hasText: '日期选择器' }).count(), 0);
  await page.locator('#catalog-link').click();
  await page.locator('#component-detail[open]').getByRole('heading', { name: '夹页键' }).waitFor();
  assert.deepEqual(errors, []);
});

test('运行资源缺失时显示载入错误', { timeout: 15_000 }, async t => {
  const page = await browser.newPage();
  t.after(() => page.close());
  await page.route('**/gallery/loading-ui/dist/runtime.js', route => route.fulfill({ status: 404 }));
  await page.goto(site);
  await page.locator('#load-error').waitFor({ state: 'visible' });
});
