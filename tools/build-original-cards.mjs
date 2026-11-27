import {readFileSync, writeFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {transform} from 'esbuild';
import {buildCatalog} from '../assets/catalog.mjs';

const directory = new URL('../gallery/originals/', import.meta.url);
const window = {};
runInNewContext(readFileSync(new URL('../gallery/works.js', import.meta.url), 'utf8'), {window});
// Four desktop rows cover the initial viewport. The rest follow the gallery's
// viewport observer, along with originals found via search or filters.
const initialIds = buildCatalog(window.WORKS).slice(0, 20).filter(item => item.original).map(({id}) => id);
const first = new Set(initialIds.slice(0, 6));
const wide = new Set(initialIds.slice(6));
const regular = new Set(window.WORKS.map(({id}) => id).filter(id => !first.has(id) && !wide.has(id)));
const batches = [['cards-first', first], ['cards-wide', wide], ['cards-later', regular]];
const pages = new Map();
// The existing demo sheets label their control rules. Keep shared tokens
// and embedded states, and include only the control rules needed by a batch.
const styleSections = {
  'index.html': [
    ['ink-switch', 'standalone:ink-switch-style'], ['detent-dial', 'standalone:detent-dial-style'],
    ['hold-confirm', 'Hold to Confirm'], ['odometer-stepper', 'Odometer Stepper'],
    ['leaf-tabs', 'Leaf Tabs'], ['tide-progress', 'Tide Progress'],
  ],
  'visual.html': [
    ['magnet-grid', 'standalone:magnet-grid-style'], ['jelly-pad', 'standalone:jelly-pad-style'],
    ['merge-drops', 'Merge Drops'], ['ripple-pad', 'Ripple Pad'], ['bloom-toggle', 'Bloom Toggle'],
  ],
  'gestures.html': [
    ['swipe-confirm', 'Swipe to Confirm'], ['pull-refresh', 'Pull to Refresh'], ['elastic-string', 'Elastic String'],
    ['domino-row', 'Domino Row'], ['rocker-switch', 'Rocker Switch'], ['scrub-wave', 'Scrub Wave'],
    ['snap-grid', 'Snap Grid'], ['radial-menu', 'Radial Menu'], ['step-track', 'Step Track'], ['breath-orb', 'Breath Orb'],
  ],
  'actions.html': [
    ['copy-morph', 'Copy Button'], ['like-burst', 'Like Burst'], ['paper-plane', 'Paper Plane'],
    ['download-ring', 'Download Ring'], ['code-shake', 'Code Shake'], ['bell-toggle', 'Bell Toggle'],
  ],
};

function splitStyles(css, path) {
  const controls = styleSections[path];
  if (!controls) return {base: css, sections: new Map(), tail: ''};
  const starts = controls.map(([, label]) => css.indexOf(`/* ${label} */`));
  const end = css.indexOf('[data-single]');
  if (starts.some((start, index) => start < 0 || (index && start <= starts[index - 1])) || end <= starts.at(-1)) {
    throw new Error(`原创控件的样式边界已变化：${path}`);
  }
  const sections = new Map(controls.map(([id], index) => [id, css.slice(starts[index], starts[index + 1] ?? end)]));
  return {base: css.slice(0, starts[0]), sections, tail: css.slice(end)};
}

async function readPage(path) {
  const page = readFileSync(new URL(path, directory), 'utf8').replaceAll('\r\n', '\n');
  const markup = [...page.matchAll(/<section class="sample" id="([^"]+)"[\s\S]*?<\/section>/g)];
  const script = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
  // The standalone harness ends at its theme button. Top-level blocks after
  // the shared helpers bind one example each, in the same order as the HTML.
  const themeEnd = script.indexOf('\n    });', script.indexOf("$('#theme').addEventListener"));
  if (themeEnd < 0) throw new Error(`找不到原创演示的初始化边界：${path}`);
  const behavior = script.slice(themeEnd + '\n    });'.length);
  const blocks = [...behavior.matchAll(/^    \{\n([\s\S]*?)^    \}/gm)];
  const native = new Set(["stroke-checklist"]);
  // The first example's standalone markers are comments between helpers and
  // its block. They end with that block's standalone closing marker.
  const shared = behavior.slice(0, blocks[0]?.index);
  if (markup.filter(([, id]) => !native.has(id)).length !== blocks.length) throw new Error(`原创演示的 HTML 与初始化块数量不同：${path}`);

  const css = page.match(/<style>([\s\S]*?)<\/style>/)[1]
    .replace(/@font-face\s*\{[^}]+\}/, '')
    // The embedded sample keeps its caption for ARIA and omits page chrome.
    .replace(/    \.page \{[\s\S]*?    \.samples \{[^}]+\}/, '')
    .replace(/^[ \t]*\.(?:caption[^{}]*|credit) \{[^}]+\}/gm, '')
    .replace(/:root/g, '.original-root')
    .replaceAll('height: 100dvh;', 'height: 100%;');
  const clean = text => text
    .replace(/^[ \t]*(?:html|body|\[data-single\][^{}]*|(?:\[data-embedded\] )?\.sets[^{}]*) \{[^}]+\}/gm, '');
  const minify = async text => (await transform(clean(text), {loader: 'css', minify: true})).code;
  const {base, sections, tail} = splitStyles(css, path);
  const embeddedMotion = path === 'gestures.html'
    ? '@media (prefers-reduced-motion: reduce) { .orb span, .swipe-hint i { animation: none; } }' : '';
  const shell = [
    await minify(base),
    await minify(`${tail}
      ${embeddedMotion}
      .original-root {
        height: 100%;
        background: var(--surface);
        color: var(--ink);
        font: 400 14px/1.6 var(--font);
        -webkit-font-smoothing: antialiased;
      }
      .original-root .sample { height: 100%; width: 100%; }
    `),
  ];
  const styles = new Map();
  for (const [name, batch] of batches) {
    styles.set(name, await minify([...sections].filter(([id]) => batch.has(id)).map(([, rules]) => rules).join('')));
  }
  let blockIndex = 0;
  return {
    shell, styles,
    controls: new Map(markup.map(([html, id]) => [
      id, {
        html: html.replace(/\n\s*/g, ' '),
        js: (native.has(id) ? "" : shared + blocks[blockIndex++][1])
          .replace("location.href.split('?')[0]", "sourceUrl")
          .replace("      document.addEventListener('visibilitychange', sync);\n", ""),
      },
    ])),
  };
}

for (const {demo} of window.WORKS) {
  const path = demo.split('/').at(-1).split('#')[0];
  if (!pages.has(path)) pages.set(path, await readPage(path));
}

const firstPages = new Set(window.WORKS.filter(({id}) => first.has(id)).map(({demo}) => demo.split('/').at(-1).split('#')[0]));
for (const [name, batch] of batches) {
  const styles = new Map();
  const controls = [];
  for (const {demo, id} of window.WORKS.filter(({id}) => batch.has(id))) {
    const path = demo.split('/').at(-1).split('#')[0];
    const {shell, styles: pageStyles, controls: examples} = pages.get(path);
    const control = examples.get(id);
    if (!control) throw new Error(`找不到原创控件：${id}`);
    if (!styles.has(path)) {
      const css = pageStyles.get(name);
      const common = firstPages.has(path) ? null : shell;
      styles.set(path, {css, common, variable: `style${styles.size}`});
    }
    controls.push(`${JSON.stringify(id)}: {
      style: ${styles.get(path).variable},
      html: ${JSON.stringify(control.html)},
      page: ${JSON.stringify(path)},
      init({root, reducedMotion, motionEnabled, $, $$, clamp, document, sourceUrl}) {
        ${control.js}
      },
    }`);
  }
  const source = [
    '// Generated from gallery/originals by tools/build-original-cards.mjs.',
    ...(name === 'cards-first' ? [
      `export const wide = new Set(${JSON.stringify([...wide])});`,
      `export const shells = ${JSON.stringify(Object.fromEntries([...firstPages].map(path => [path, pages.get(path).shell])))};`,
    ] : []),
    ...[...styles.values()].map(({css, common, variable}) => `const ${variable} = ${JSON.stringify(common ? common[0] + css + common[1] : css)};`),
    `export default {\n${controls.join(',\n')}\n};\n`,
  ].join('\n');
  writeFileSync(new URL(`dist/${name}.mjs`, directory), source);
}
