import {readFileSync, writeFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {transform} from 'esbuild';
import {buildCatalog} from '../assets/catalog.mjs';

const directory = new URL('../gallery/originals/', import.meta.url);
const window = {};
runInNewContext(readFileSync(new URL('../gallery/works.js', import.meta.url), 'utf8'), {window});
// Four desktop rows cover the initial viewport. The rest follow the gallery's
// viewport observer, along with originals found via search or filters.
const initialIds = buildCatalog(window.WORKS).slice(0, 20).filter(item => item.original).slice(0, 18).map(({id}) => id);
// Four rows also cover the part of the next pair visible on tall phones.
const phoneCards = 8;
const first = new Set(initialIds.slice(0, phoneCards));
const wide = new Set(initialIds.slice(phoneCards));
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

function initialMarkup(id, html, script) {
  function insert(selector, children) {
    const pattern = new RegExp(`(<[a-z]+ class="${selector}"[^>]*>)(?=</)`);
    if (!pattern.test(html)) throw new Error(`找不到首屏控件的初始节点：${id} / ${selector}`);
    return html.replace(pattern, '$1' + children);
  }
  function values(name) {
    return JSON.parse(script.match(new RegExp(`const ${name} = (\\[[^\\n]+\\]);`))[1].replaceAll("'", '"'));
  }
  switch (id) {
    case 'magnet-grid':
      return insert('pad magnet', '<i></i>'.repeat(40));
    case 'detent-dial':
      return insert('dial-ticks', Array.from({length: 11}, (_, n) => `<i style="--a:${n * 27 - 135}deg"${n <= 4 ? ' data-on' : ''}></i>`).join(''));
    case 'bloom-toggle':
      return insert('bloom', Array.from({length: 6}, (_, n) => `<i style="--r:${n * 60}deg;--n:${n}"></i>`).join(''));
    case 'pull-refresh':
      return insert('pull-list', values('widths').slice(0, 4).map(w => `<div class="pull-row"><b></b><span style="--w:${w}"></span></div>`).join(''));
    case 'scrub-wave':
      return insert('wave-bars', values('heights').map((h, n, bars) => `<i style="--h:${h}px"${n < Math.round(bars.length * .35) ? ' data-on' : ''}></i>`).join(''));
    case 'snap-grid':
      return html.replace('class="snap-tile"', 'class="snap-tile" style="--tx:46px;--ty:46px"');
    case 'step-track':
      return html.replace('<i data-on></i><i data-on></i>', '<i data-on></i><i data-on data-current></i>');
    default:
      return html;
  }
}

function reuseInitialNodes(id, source) {
  function replace(original, updated) {
    if (!source.includes(original)) throw new Error(`原创控件的初始化代码已变化：${id}`);
    return source.replace(original, updated);
  }
  switch (id) {
    case 'magnet-grid':
      return replace('const dots = Array.from', 'const dots = pad.children.length ? Array.from(pad.children) : Array.from');
    case 'detent-dial':
      return replace('ticks.append(...Array.from', 'if (!ticks.children.length) ticks.append(...Array.from');
    case 'bloom-toggle':
      return replace('Array.from({ length: 6 }', 'if (!bloom.children.length) Array.from({ length: 6 }');
    case 'pull-refresh':
      return replace('list.append(row(), row(), row(), row());', 'if (list.children.length) count = list.children.length; else list.append(row(), row(), row(), row());');
    case 'scrub-wave':
      return replace('const items = heights.map', 'const items = bars.children.length ? Array.from(bars.children) : heights.map');
    default:
      return source;
  }
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
  const palette = [...base.matchAll(/(?<selector>\.original-root(?:\[data-theme="dark"\])?)\s*\{([^}]+)\}/g)].slice(0, 2);
  const staticBase = palette.reduce((content, [rule]) => content.replace(rule, ''), base);

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
    palette: palette.map(([, , declarations]) => declarations),
    staticBase: await minify(staticBase),
    staticStyles: new Map(await Promise.all([...sections].map(async ([id, css]) => [id, await minify(css)]))),
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

for (const [name, batch] of batches) {
  const styles = new Map();
  const controls = [];
  for (const {demo, id} of window.WORKS.filter(({id}) => batch.has(id))) {
    const path = demo.split('/').at(-1).split('#')[0];
    const {shell, styles: pageStyles, controls: examples} = pages.get(path);
    const control = examples.get(id);
    if (!control) throw new Error(`找不到原创控件：${id}`);
    if (!styles.has(path)) {
      const css = shell[0] + pageStyles.get(name) + shell[1];
      styles.set(path, {css, variable: `style${styles.size}`});
    }
    const fields = `{style:${styles.get(path).variable},html:${JSON.stringify(control.html)}}`;
    controls.push(`${JSON.stringify(id)}: {
      ...${name === 'cards-later' ? fields : `(typeof __PUBLISHED_PREVIEWS__ === 'undefined' ? ${fields} : {})`},
      page: ${JSON.stringify(path)},
      init({root, reducedMotion, motionEnabled, $, $$, clamp, document, sourceUrl}) {
        ${reuseInitialNodes(id, control.js)}
      },
    }`);
  }
  const source = [
    '// Generated from gallery/originals by tools/build-original-cards.mjs.',
    ...(name === 'cards-first' ? [`export const wide = new Set(${JSON.stringify([...wide])});`] : []),
    ...[...styles.values()].map(({css, variable}) => `const ${variable} = ${JSON.stringify(css)};`),
    `export default {\n${controls.join(',\n')}\n};\n`,
  ].join('\n');
  writeFileSync(new URL(`dist/${name}.mjs`, directory), source);
}

const staticCards = {};
const palettes = new Map();
for (const [name, batch] of [['first', first], ['wide', wide]]) {
  for (const {id, demo} of window.WORKS.filter(({id}) => batch.has(id))) {
    const path = demo.split('/').at(-1).split('#')[0];
    const {shell, palette, staticBase, staticStyles, controls} = pages.get(path);
    const control = controls.get(id);
    const key = JSON.stringify(palette);
    if (!palettes.has(key)) palettes.set(key, new Set());
    palettes.get(key).add(path);
    const html = initialMarkup(id, control.html, control.js)
      .replace(/(<div class="caption"><h2[^>]*>[^<]+<\/h2>)<p>[^<]*<\/p>/g, '$1')
      .replace(/>\s+</g, '><');
    const firstPaint = staticBase + staticStyles.get(id) + shell[1];
    staticCards[id] = {page: path, html, wide: name === 'wide', style: firstPaint};
  }
}
const colorRules = [...palettes].map(([key, paths]) => {
  const [light, dark] = JSON.parse(key);
  const hosts = palettes.size === 1 ? ['ui-original-card'] : [...paths].map(page => `ui-original-card[data-original-page="${page}"]`);
  return hosts.join(',') + `{${light}}` + hosts.map(host => `html[data-theme=dark] ${host}`).join(',') + `{${dark}}`;
});
writeFileSync(new URL('dist/cards-static.json', directory), JSON.stringify(staticCards));
writeFileSync(new URL('dist/cards-static-theme.css', directory),
  (await transform(colorRules.join(''), {loader: 'css', minify: true})).code);
