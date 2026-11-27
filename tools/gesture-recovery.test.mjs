import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {runInNewContext} from 'node:vm';
import {chromium} from 'playwright';
import {monitor, startServer} from './browser-site.mjs';

const samples = {
  'ink-switch': ['.ink', 'Space'],
  'detent-dial': ['.dial-knob', 'ArrowRight'],
  'hold-confirm': ['.hold', 'Space'],
  'odometer-stepper': ['.step[data-step="1"]', 'Space'],
  'leaf-tabs': ['[role=tab][aria-selected=true]', 'ArrowRight'],
  'tide-progress': ['.tide', 'Space'],
  'magnet-grid': ['.magnet', 'ArrowRight'],
  'jelly-pad': ['.jelly', 'ArrowRight'],
  'hue-orbit': ['.hue', 'ArrowRight'],
  'merge-drops': ['.drops', 'ArrowLeft'],
  'pull-cord': ['.lamp-bead', 'Space'],
  'flip-coin': ['.coin', 'Space'],
  'ripple-pad': ['.ripples', 'Space'],
  'bloom-toggle': ['.bloom', 'Space'],
  'swipe-confirm': ['.swipe-knob', 'Space'],
  'pull-refresh': ['.pull', 'Space'],
  'elastic-string': ['.string', 'Space'],
  'domino-row': ['.domino', 'Space'],
  'rocker-switch': ['.rocker', 'Space'],
  'scrub-wave': ['.wave-bars', 'ArrowRight'],
  'snap-grid': ['.snap-tile', 'ArrowRight'],
  'radial-menu': ['.radial-main', 'Space'],
  'step-track': ['.steps-nav button:not(:disabled)', 'Space'],
  'breath-orb': ['.orb', 'Space'],
  'stroke-checklist': ['.todo label', 'Space'],
  'pebble-rating': ['.pebble-row label', 'ArrowRight'],
  'notch-slider': ['input[type=range]', 'ArrowRight'],
  'strength-meter': ['.secret input', 'x'],
  'chip-input': ['.chips input', 'x'],
  'plan-picker': ['.plans label', 'ArrowRight'],
  'copy-morph': ['.copy', 'Space'],
  'like-burst': ['.like', 'Space'],
  'paper-plane': ['.send', 'Space'],
  'download-ring': ['.dl', 'Space'],
  'code-shake': ['.code input', '2'],
  'bell-toggle': ['.bell', 'Space'],
};

const dragIds = new Set([
  'detent-dial', 'hold-confirm', 'odometer-stepper', 'jelly-pad', 'hue-orbit', 'merge-drops', 'pull-cord',
  'ripple-pad', 'swipe-confirm', 'pull-refresh', 'elastic-string', 'scrub-wave', 'snap-grid', 'notch-slider',
]);
const vertical = new Set(['pull-cord', 'pull-refresh', 'elastic-string']);
const takesOverTouch = new Set([...vertical, 'snap-grid']);
const active = '[data-pointer-active],[data-drag],[data-dragging],[data-holding],[data-pressing],.ripples .seed';
const actions = ['blank', 'outside-card', 'outside-window', 'rapid', 'double', 'right', 'control-click',
  'blur', 'visibility', 'contextmenu', 'capture-loss', 'touch-drag', 'touch-cancel', 'touch-scroll'];
const trialCount = actions.length * 4;

function* shuffledTrials(seed) {
  function random(max) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed % max;
  }
  for (let count = 0; count < trialCount;) {
    const round = [...actions];
    while (round.length && count++ < trialCount) yield [round.splice(random(round.length), 1)[0], random(22) + 21];
  }
}

async function touch(session, type, x, y) {
  await session.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{x, y, id: 1}],
  });
}

async function trial(action, dx, {page, session, target, stage, boundary, id}) {
  const box = await target.boundingBox();
  assert.ok(box, `${id}: target`);
  const view = page.viewportSize();
  const area = await stage.boundingBox();
  const text = await boundary.boundingBox();
  const x = Math.max(3, Math.min(box.x + box.width / 2, view.width - 3));
  const y = Math.max(3, Math.min(box.y + box.height / 2, view.height - 3));
  const left = area.x + 3, top = area.y + 4;
  const mouse = page.mouse;

  if (action === 'blank') {
    await mouse.move(left, top);
    await mouse.down();
    await mouse.move(text.x + Math.min(text.width / 2, 48), text.y + text.height / 2, {steps: 3});
    await mouse.up();
  } else if (action === 'double' || action === 'rapid') {
    await mouse.click(x, y, {clickCount: 2});
    if (action === 'rapid') await mouse.click(x, y);
  } else if (action === 'right' || action === 'control-click') {
    const ctrl = action === 'control-click';
    if (ctrl) await page.keyboard.down('Control');
    await mouse.click(x, y, {button: ctrl ? 'left' : 'right'});
    if (ctrl) await page.keyboard.up('Control');
  } else if (action.startsWith('touch-')) {
    const scrolling = action === 'touch-scroll';
    const fromX = scrolling && takesOverTouch.has(id) ? left : x;
    const fromY = scrolling && takesOverTouch.has(id) ? top + 45 : y;
    await touch(session, 'touchStart', fromX, fromY);
    for (const step of [1, 2, 3, 4]) {
      const alongY = scrolling || vertical.has(id);
      await touch(session, 'touchMove',
        alongY ? fromX : Math.min(view.width - 4, fromX + step * dx / 2),
        scrolling ? Math.max(5, fromY - step * 19) : Math.min(view.height - 3, fromY + (alongY ? step * 13 : 2)));
    }
    await touch(session, action === 'touch-cancel' ? 'touchCancel' : 'touchEnd');
    if (scrolling) await stage.scrollIntoViewIfNeeded();
  } else {
    await mouse.move(x, y);
    await mouse.down();
    if (action === 'outside-card') await mouse.move(view.width - 3, area.y + 5, {steps: 3});
    else if (action === 'outside-window') await mouse.move(-25, -15, {steps: 3});
    else {
      await mouse.move(vertical.has(id) ? x : Math.min(x + dx / 2, view.width - 5),
        Math.min(y + (vertical.has(id) ? dx / 2 : 1), view.height - 5));
      await target.evaluate((node, cause) => {
        if (cause === 'blur') window.dispatchEvent(new Event('blur'));
        else if (cause === 'visibility') document.dispatchEvent(new Event('visibilitychange'));
        else if (cause === 'contextmenu') node.dispatchEvent(new MouseEvent('contextmenu', {bubbles: true, composed: true}));
        else {
          const captured = node.closest('[data-pointer-active]') || node;
          // Chromium's CDP pointer for the physical mouse has pointerId 1.
          if (captured.hasPointerCapture(1)) captured.releasePointerCapture(1);
          else return;
        }
      }, action);
      if (action === 'capture-loss') await mouse.move(x, y);
    }
    await mouse.up();
  }
}

async function exerciseSurface(t, surface) {
  const site = await startServer(t);
  const window = {};
  runInNewContext(await readFile(new URL('../gallery/works.js', import.meta.url), 'utf8'), {window});
  assert.deepEqual(Object.keys(samples).sort(), Array.from(window.WORKS, item => item.id).sort());
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const context = await browser.newContext({
    viewport: {width: 390, height: 844}, hasTouch: true, reducedMotion: 'reduce', locale: 'en-US',
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();
  const errors = [];
  monitor(page, errors, site);
  const session = await context.newCDPSession(page);
  await page.addInitScript(() => {
    window.addEventListener('contextmenu', event => event.preventDefault());
  });
  for (const [index, {id, demo}] of window.WORKS.entries()) {
    const inline = surface === 'inline';
    await page.goto(inline ? `${site}?q=${id}` : new URL(demo, site).href);
    const scope = inline ? page.locator(`[data-ui="${id}"] [data-hydrated]`) : page.locator(`.sample[id="${id}"]`);
    const [selector] = samples[id];
    const target = scope.locator(selector).first();
    const stage = scope.locator('.stage');
    const boundary = inline ? page.locator(`[data-ui="${id}"] .ui-caption h2`) : scope.locator('.caption h2');
    await stage.waitFor();
    await page.evaluate(() => { document.body.style.paddingBottom = '100vh'; });
    for (const [action, dx] of shuffledTrials(index + 1)) {
      await trial(action, dx, {page, session, target, stage, boundary, id});
      const selected = await page.evaluate(() => {
        let focused = document.activeElement;
        while (focused?.shadowRoot?.activeElement) focused = focused.shadowRoot.activeElement;
        const editing = focused?.matches(':is(input,textarea,[contenteditable]):not([contenteditable=false])');
        const fieldRange = editing && Number.isInteger(focused.selectionEnd) && focused.selectionStart !== focused.selectionEnd;
        const selection = getSelection();
        const fromEditor = fieldRange || (focused?.isContentEditable && focused.contains(selection.anchorNode));
        const text = fromEditor ? '' : selection.toString().trim();
        // Isolate this gesture from selection retained by a previous input gesture.
        // Password fields can expose their old masked selection even after blur.
        if (fieldRange) focused.setSelectionRange(focused.selectionEnd, focused.selectionEnd);
        selection.removeAllRanges();
        return text;
      });
      assert.equal(selected, '', `${id} ${action}: 页面有文字被选中`);
      assert.equal(await scope.locator(active).count(), 0, `${id} ${action}: 拖动或按住后仍然活跃`);
    }
    if (dragIds.has(id)) {
      // Re-grab the same live control after the interrupted runs.
      await scope.locator('.swipe[data-done],.pull[data-state],.hold[data-done]').waitFor({state: 'hidden'});
      await target.scrollIntoViewIfNeeded();
      const box = await target.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      assert.equal(await scope.locator('[data-pointer-active]').count(), 1, `${id}: 无法重新抓住`);
      await page.evaluate(() => window.dispatchEvent(new Event('blur')));
      await page.mouse.up();
      assert.equal(await scope.locator(active).count(), 0, `${id}: 重新抓住后无法释放`);
    } else {
      const key = samples[id][1];
      const interactive = selector.includes('label') ? scope.locator('input').first() : target;
      await stage.evaluate(node => node.addEventListener('keydown', () => {
        node.dataset.receivedKey = '';
      }, {once: true}));
      await interactive.press(key);
      assert.notEqual(await stage.getAttribute('data-received-key'), null, `${id}: 重新操作时无法收到按键`);
    }
  }
  assert.deepEqual(errors, []);
}

test('真人乱点同时覆盖首页和演示页', {concurrency: 2}, async parent => {
  await Promise.all(['inline', 'demo'].map(surface =>
    parent.test(`36 个原创控件各 ${trialCount} 次（${surface}）`, {timeout: 420_000},
      t => exerciseSurface(t, surface))));
});

test('横向触屏拖动可确认，旋即竖滑时页面滚动且滑块保持静止', {timeout: 15_000}, async t => {
  const site = await startServer(t);
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({viewport: {width: 390, height: 844}, hasTouch: true, reducedMotion: 'reduce'});
  const session = await page.context().newCDPSession(page);
  await page.goto(site + '?q=swipe-confirm');
  const card = page.locator('[data-ui="swipe-confirm"]');
  const knob = card.locator('.swipe-knob');
  await knob.waitFor();
  await page.evaluate(() => { document.body.style.paddingBottom = '100vh'; window.scrollTo(0,0); });
  const box = await knob.boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await touch(session, 'touchStart', x, y);
  for (const delta of [14, 28, 48, 72, 96]) await touch(session, 'touchMove', x + 2, y - delta);
  await touch(session, 'touchEnd');
  await page.waitForFunction(() => scrollY > 25);
  assert.equal(await card.locator('[data-drag],[data-done],[data-pointer-active]').count(), 0);
  // Use a fresh page so scroll momentum is gone before exercising the horizontal axis.
  const freshPage = await browser.newPage({viewport: {width: 390, height: 844}, hasTouch: true, reducedMotion: 'reduce'});
  const freshSession = await freshPage.context().newCDPSession(freshPage);
  await freshPage.goto(site + '?q=swipe-confirm');
  const freshCard = freshPage.locator('[data-ui="swipe-confirm"]');
  const freshKnob = freshCard.locator('.swipe-knob');
  await freshKnob.waitFor();
  const fresh = await freshKnob.boundingBox();
  const startX = fresh.x + fresh.width / 2, startY = fresh.y + fresh.height / 2;
  await touch(freshSession, 'touchStart', startX, startY);
  for (const delta of [14, 42, 81, 124, 165]) await touch(freshSession, 'touchMove', startX + delta, startY + 1);
  await touch(freshSession, 'touchEnd');
  await freshCard.locator('.swipe[data-done]').waitFor({timeout: 3000});
  assert.equal(await freshPage.evaluate(() => scrollY), 0);
});

test('果冻方块在慢拖时保持方向形变，松手或失焦后恢复', {timeout: 25_000}, async t => {
  const site = await startServer(t);
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({viewport: {width: 1440, height: 900}});
  await page.goto(site + '?q=jelly-pad');
  const card = page.locator('[data-ui="jelly-pad"]');

  async function pull(scope, {vertical = false, reduced = false, blur = false} = {}) {
    const surface = scope.locator('.jelly-surface');
    await surface.scrollIntoViewIfNeeded();
    const {x, y, width, height} = await surface.boundingBox();
    const startX = x + width / 2, startY = y + height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    for (let delta = 2; delta <= 40; delta += 2) {
      await page.mouse.move(startX + (vertical ? 0 : delta), startY + (vertical ? delta : 0));
    }
    const held = await surface.boundingBox();
    const ratio = vertical ? held.height / held.width : held.width / held.height;
    assert.ok(reduced ? Math.abs(ratio - 1) < .02 : ratio > 1.12, `拖动时的形变比例：${ratio}`);
    if (blur) await surface.evaluate(node => node.ownerDocument.defaultView.dispatchEvent(new Event('blur')));
    await page.mouse.up();
    await scope.locator('.jelly-cube[style*="translate(0px, 0px)"]').waitFor();
    assert.equal(await scope.locator('[data-pointer-active]').count(), 0);
    const rested = await surface.boundingBox();
    assert.ok(Math.abs(rested.width / rested.height - 1) < .02);
  }

  await card.locator('.original-root[data-gallery-active="true"] .jelly-surface').waitFor();
  await pull(card);
  await card.locator('[data-detail]').click();
  const detail = page.frameLocator('#component-frame[data-loaded]');
  await detail.locator('html[data-gallery-active="true"] .jelly-surface').waitFor();
  await page.locator('#component-detail').evaluate(node => Promise.all(node.getAnimations().map(animation => animation.finished)));
  await pull(detail, {blur: true});

  await page.goto(site + 'gallery/originals/visual.html#jelly-pad');
  const demo = page.locator('section#jelly-pad');
  await pull(demo, {vertical: true});
  await page.emulateMedia({reducedMotion: 'reduce'});
  await pull(demo, {vertical: true, reduced: true});
});
