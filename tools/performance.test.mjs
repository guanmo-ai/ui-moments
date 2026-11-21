import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {gzipSync} from 'node:zlib';

const site = new URL('../_site/', import.meta.url);
const budgets = [
  {page: 'index.html', modules: 4, gzipKiB: 108},
  {page: 'styles.html', modules: 3, gzipKiB: 28},
  {page: 'gallery/loaders/index.html', modules: 3, gzipKiB: 32},
];

for (const {page, modules, gzipKiB} of budgets) {
  test(`${page} 的初始脚本符合发布包预算`, async () => {
    const url = new URL(page, site);
    const html = await readFile(url, 'utf8');
    const entries = [...html.matchAll(/<script type="module" src="([^"]+)"/g)];
    assert.equal(entries.length, 1);
    const preloads = [...html.matchAll(/<link rel="modulepreload" href="([^"]+)"/g)];
    const files = [...new Set([entries[0][1], ...preloads.map(match => match[1])])];
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

test('Roomlight 的紧凑背景图符合体积预算', async () => {
  const compact = await readFile(new URL('gallery/roomlight/coast-card.webp', site));
  assert.ok(compact.length <= 64 * 1024, `紧凑背景图 ${compact.length} 字节，预算为 64 KiB`);
});
