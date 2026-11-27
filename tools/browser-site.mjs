import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {extname} from 'node:path';

const site = new URL('../_site/', import.meta.url);
const prefix = '/ui-moments/';
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.woff2': 'font/woff2',
};

export async function startServer(t, {cacheAssets = false, firstCardsGate} = {}) {
  const server = createServer(async (req, res) => {
    const path = new URL(req.url, 'http://127.0.0.1').pathname;
    const relative = path.slice(prefix.length);
    if (!path.startsWith(prefix) || relative.includes('..')) {
      res.writeHead(404).end();
      return;
    }
    if (relative === 'card-preview-test') {
      res.writeHead(200, {'Content-Type': types['.html']}).end('<iframe style="display:block;border:0"></iframe>');
      return;
    }
    const file = path.endsWith('/') ? relative + 'index.html' : relative;
    try {
      const data = await readFile(new URL(file, site));
      const headers = {'Content-Type': types[extname(file)] ?? 'text/plain'};
      if (cacheAssets && /\/(?:dist|media)\//.test(file) && !file.endsWith('.html')) {
        headers['Cache-Control'] = 'public, max-age=3600';
      }
      res.writeHead(200, headers);
      if (firstCardsGate && file === 'index.html') {
        const start = data.indexOf('<article class="ui-item"');
        res.write(data.subarray(0, start));
        await firstCardsGate;
        res.end(data.subarray(start));
      } else {
        res.end(data);
      }
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  return `http://127.0.0.1:${server.address().port}${prefix}`;
}

// Exercise the same scroll path as a visitor, including results outside the first batch.
export async function revealGalleryCards(page, id) {
  const sentinel = page.locator('#gallery-end');
  for (;;) {
    const count = await sentinel.evaluate((node, targetId) => {
      const cards = document.querySelectorAll('#ui-grid > article:not([hidden])');
      if (node.hidden || (targetId && document.querySelector(`[data-ui="${CSS.escape(targetId)}"]:not([hidden])`))) return null;
      return cards.length;
    }, id);
    if (count === null) return;
    await page.waitForFunction(previous => {
      const end = document.getElementById('gallery-end');
      if (end.hidden || document.querySelectorAll('#ui-grid > article:not([hidden])').length > previous) return true;
      // Layout can move the sentinel after a scroll. Bring it back into view before waiting for the observer.
      const {top, bottom} = end.getBoundingClientRect();
      if (top >= innerHeight || bottom < 0) end.scrollIntoView({block: 'center', behavior: 'instant'});
      return false;
    }, count);
  }
}

export function monitor(page, issues, base) {
  page.on('pageerror', error => issues.push(error.message));
  page.on('requestfailed', request => {
    if (request.failure()?.errorText !== 'net::ERR_ABORTED') issues.push(request.url());
  });
  page.on('request', request => {
    if (/^https?:/.test(request.url()) && !request.url().startsWith(base)) issues.push(request.url());
  });
  page.on('response', response => {
    if (response.status() >= 400) issues.push(`${response.status()} ${response.url()}`);
  });
}
