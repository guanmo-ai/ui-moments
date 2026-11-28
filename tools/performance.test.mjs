import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {gzipSync} from 'node:zlib';
import {initialCardCount} from '../assets/catalog.mjs';

const site = new URL('../_site/', import.meta.url);
const budgets = [
  {page: 'index.html', modules: 4, gzipKiB: 102},
];

for (const {page, modules, gzipKiB} of budgets) {
  test(`${page} 的初始脚本符合发布包预算`, async () => {
    const url = new URL(page, site);
    const html = await readFile(url, 'utf8');
    const entries = [...html.matchAll(/<script type="module" src="([^"]+)"/g)];
    assert.equal(entries.length, 1);
    assert.match(entries[0][1], /original-cards-[A-Z0-9]{8}\.mjs$/);
    const entry = html.match(/<template data-gallery-entry="([^"]+)"/)?.[1];
    assert.match(entry, /gallery-[A-Z0-9]{8}\.mjs$/);
    const preloads = [...html.matchAll(/<link rel="modulepreload" href="([^"]+)"/g)];
    const files = [...new Set([entries[0][1], entry, ...preloads.map(match => match[1])])];
    assert.ok(files.length <= modules, `${files.length} 个初始模块，预算为 ${modules}`);
    const sizes = await Promise.all(files.map(async file => {
      const asset = new URL(file, url);
      assert.ok(asset.href.startsWith(site.href), file);
      assert.match(asset.pathname, /-[A-Z0-9]{8}\.mjs$/, file);
      return gzipSync(await readFile(asset)).length;
    }));
    const total = sizes.reduce((sum, bytes) => sum + bytes, 0);
    assert.ok(total <= gzipKiB * 1024, `初始脚本 gzip 后 ${total} 字节，预算为 ${gzipKiB} KiB`);
  });
}

test('发布版首页从 HTML 显示首批卡片和完整数量', async () => {
  const html = await readFile(new URL('index.html', site), 'utf8');
  const cards = [...html.matchAll(/<article class="ui-item" data-ui="([^"]+)"/g)];
  assert.equal(cards.length, initialCardCount);
  assert.equal(cards[0][1], 'magnet-grid');
  assert.doesNotMatch(html, /<article[^>]+data-category="loading"/);
  assert.match(html, /<style data-home-critical>/);
  assert.doesNotMatch(html, /<iframe data-priority-preview/);
  assert.doesNotMatch(html, /\bblocking=["']render["']/);
  const previews = [...html.matchAll(/data-ui="([^"]+)"[^>]*><div class="ui-stage">(?:<template data-original-wide>)?<ui-original-card[^>]*><template shadowrootmode="open">/g)];
  assert.equal(previews.length, 18);
  assert.equal(previews[0][1], 'magnet-grid');
  assert.equal([...html.matchAll(/shadowrootmode="open"><style data-first-paint>/g)].length, previews.length);
  assert.match(html, /<span data-stat="total">325<\/span>/);
  const other = html.match(/id="other-feedback" data-catalog="([^"]+)"/)?.[1];
  assert.match(other, /other-catalog-[A-Z0-9]{8}\.mjs$/);
  assert.ok(!(await readFile(new URL(other, site), 'utf8')).includes('astryx-variant-'));
  // 首屏原创卡片以声明式 Shadow DOM 写入 HTML。A/B 中模拟手机首屏由
  // 297 ms 降至 125 ms。18 KiB 给当前 16.22 KiB 留出余量，同时限制以后无意增加体积。
  assert.ok(gzipSync(html).length <= 18 * 1024, '带静态卡片的首页 HTML 压缩后不超过 18 KiB');
});
