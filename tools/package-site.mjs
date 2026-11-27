import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { build, transform } from 'esbuild';
import { buildCatalog, cardMarkup, categoryMarkup, initialCardCount, kindLabel, standaloneExamplePath } from '../assets/catalog.mjs';
import {translate} from '../assets/locale.mjs';
import {themeIcons} from '../assets/site.mjs';
import {escapeHtml as esc} from '../gallery/loaders/snippets.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, '_site');
const defaultRepository = 'https://github.com/guanmo-ai/ui-moments';
const repository = (process.env.UI_MOMENTS_REPOSITORY || defaultRepository).replace(/\/$/, '');
const ref = process.env.UI_MOMENTS_REF || 'main';
if (!/^https:\/\/github\.com\/[a-z\d-]+\/[a-z\d_.-]+$/i.test(repository)) {
  throw new Error('UI_MOMENTS_REPOSITORY 应为 GitHub 仓库地址');
}
if (!/^[a-z\d_./-]+$/i.test(ref) || ref.includes('..')) {
  throw new Error('UI_MOMENTS_REF 应为 Git 分支、标签或提交');
}

function projectLinks(html) {
  const repositoryPage = ref === 'main' ? repository : `${repository}/tree/${ref}`;
  return html
    .replaceAll(defaultRepository + '/blob/main/', repository + '/blob/' + ref + '/')
    .replaceAll(defaultRepository + '/issues/', repository + '/issues/')
    .replaceAll(`href="${defaultRepository}"`, `href="${repositoryPage}"`)
    .replace(/(<meta name="ui-moments:repository" content=")[^"]*/, `$1${repository}`)
    .replace(/(<meta name="ui-moments:ref" content=")[^"]*/, `$1${ref}`);
}

const publicFiles = new Set([
  'index.html', 'LICENSE', 'CREDITS.md', '.nojekyll',
]);
const pages = [
  {html: 'index.html', entries: ['assets/original-cards.mjs', 'assets/gallery.mjs']},
];
const homepage = projectLinks(readFileSync(join(root, 'index.html'), 'utf8'));
const dialogs = /<!-- gallery dialogs -->([\s\S]*?)<!-- \/gallery dialogs -->/;
if (!dialogs.test(homepage)) throw new Error('找不到图鉴详情模板');
const scripts = await build({
  absWorkingDir: root,
  define: {
    __UI_MOMENTS_DIALOGS__: JSON.stringify(homepage.match(dialogs)[1]),
    __PUBLISHED_PREVIEWS__: 'true',
  },
  entryPoints: pages.flatMap(({entries}) => entries),
  outbase: root,
  outdir: output,
  outExtension: {'.js': '.mjs'},
  entryNames: '[dir]/[name]-[hash]',
  chunkNames: 'assets/modules/[name]-[hash]',
  bundle: true,
  splitting: true,
  format: 'esm',
  target: 'es2022',
  minify: true,
  legalComments: 'inline',
  metafile: true,
  write: false,
});
const moduleFiles = new Map(Object.entries(scripts.metafile.outputs));
const window = {};
runInNewContext(readFileSync(join(root, 'gallery/works.js'), 'utf8'), {window});
const items = buildCatalog(window.WORKS);
const staticCards = JSON.parse(readFileSync(join(root, 'gallery/originals/dist/cards-static.json'), 'utf8'));
const originalPalette = readFileSync(join(root, 'gallery/originals/dist/cards-static-theme.css'), 'utf8');
const wideMedia = '(min-width:760px), (min-height:1000px)';
const staticItems = items.filter(({id}) => Object.hasOwn(staticCards, id));
const lastPhoneCard = staticItems.filter(({id}) => !staticCards[id].wide).at(-1).id;
const lastWideCard = staticItems.at(-1).id;
// A streamed response may expose the title one frame before the card HTML.
// These selectors wait only for the visible batch's end marker in the HTML.
const firstPaintCss = `html:not([data-ready],:has([data-phone-ready])) body{visibility:hidden}
@media ${wideMedia}{html:not([data-ready],:has([data-wide-ready])) body{visibility:hidden}}`;

// The shared source sheets remain the source of truth for both render paths.
const criticalSources = ['assets/site.css', 'assets/gallery.css'];
const siteHomeCss = readFileSync(join(root, 'assets/site.css'), 'utf8').replace(/@font-face\s*\{[^}]+\}/g, '');
const criticalCss = await transform(criticalSources.flatMap(path => {
  const source = readFileSync(join(root, path), 'utf8')
    .replace(/\/\* home-deferred \*\/[\s\S]*?\/\* \/home-deferred \*\//g, '');
  return [...source.matchAll(/\/\* home-critical \*\/([\s\S]*?)\/\* \/home-critical \*\//g)]
    .map(([, css]) => css);
}).join('\n'), {loader: 'css', minify: true});

function homeStyles(html) {
  return html
    .replace('<link rel="stylesheet" href="assets/site.css">', '')
    .replace('<link rel="stylesheet" href="gallery/loaders/style.css">', '')
    .replace('<link rel="stylesheet" href="assets/gallery.css">', '<link rel="stylesheet" data-home-href="assets/site-home.css" media="print" onload="this.media=&quot;all&quot;"><noscript><link rel="stylesheet" href="assets/site-home.css"></noscript>');
}

const zh = (text, values) => translate(text, values, 'zh-CN');

function zhAttr(text, translation) {
  return text === translation ? '' : ` data-zh="${esc(translation)}"`;
}

function staticCard(item) {
  const title = item.original ? zhAttr(item.en, item.title) : '';
  const type = kindLabel(item);
  const card = cardMarkup(item)
    .replace('<h2 lang="en">', `<h2 lang="en"${title}>`)
    .replace('</h2><p>', `</h2><p${zhAttr(type, kindLabel(item, zh))}>`)
    .replace('class="ui-detail-label"', `class="ui-detail-label"${zhAttr('Details', zh('Details'))}`);
  const original = staticCards[item.id];
  if (!original) return card;
  const page = `data-original-page="${original.page}"`;
  const styles = `<style data-first-paint>${original.style}</style>`;
  const preview = `<ui-original-card data-original-card ${page}><template shadowrootmode="open">${styles}<div class="original-root" lang="en" data-embedded="true" data-gallery-active="false" ${page}>${original.html}</div></template></ui-original-card>`;
  const content = original.wide ? `<template data-original-wide>${preview}</template><i hidden></i>` : preview;
  const ready = item.id === lastPhoneCard ? 'data-phone-ready' : item.id === lastWideCard ? 'data-wide-ready' : '';
  return card.replace('<div class="ui-stage"></div>', `<div class="ui-stage">${content}</div>`)
    .replace('</article>', () => (ready ? `<template ${ready}></template>` : '') + '</article>');
}

function initialToolbar(source) {
  const icons = Object.entries(themeIcons).map(([theme, svg]) => {
    const label = theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
    return `<template data-theme-icon="${theme}" data-title="${label}" data-title-zh="${esc(zh(label))}">${svg}</template>`;
  }).join('');
  return source
    .replace('<button class="language-btn" id="language" type="button" hidden><span></span></button>',
      `<button class="language-btn" id="language" type="button" aria-label="Switch to Simplified Chinese" data-zh-aria-label="${esc(zh('Switch to English'))}"><span lang="zh-CN" data-zh="EN">中文</span></button>`)
    .replace('<button class="theme-btn" id="theme" type="button" aria-label="Switch to light mode"></button>',
      `<button class="theme-btn" id="theme" type="button" aria-label="Switch to light mode">${icons}<i hidden></i></button>`)
    .replace('id="motion" type="button"',
      `id="motion" data-play-label="Play motion" data-zh-play-label="${esc(zh('Play motion'))}"${zhAttr('Pause motion', zh('Pause motion'))} type="button"`);
}

async function pageHtml({html, entries}) {
  const mains = entries.map(entry => [...moduleFiles].find(([, file]) => file.entryPoint === entry)[0]);
  const preload = new Map();
  function addImports(path, priority) {
    for (const item of moduleFiles.get(path).imports) {
      if (item.kind !== 'import-statement' || item.external || preload.has(item.path)) continue;
      preload.set(item.path, priority);
      addImports(item.path, priority);
    }
  }
  const href = path => './' + relative(dirname(join(output, html)), resolve(root, path)).split(sep).join('/');
  mains.forEach((path, index) => addImports(path, index === 0 ? 'high' : 'low'));
  let source = projectLinks(readFileSync(join(root, html), 'utf8'));
  for (const entry of entries) {
    const original = `<script type="module" src="${entry}"></script>`;
    if (!source.includes(original)) throw new Error(`找不到页面入口：${entry}`);
    source = source.replace(original, '');
  }
  const [originals, gallery] = mains;
  const [wide] = [...moduleFiles].find(([, file]) => file.entryPoint === 'gallery/originals/dist/cards-wide.mjs');
  const hints = priority => [...preload].filter(([, value]) => value === priority)
    .map(([path]) => `<link rel="modulepreload" href="${href(path)}">`).join('\n');
  const head = [
    `<script type="module" src="${href(originals)}" fetchpriority="high"></script>`,
    `<style data-home-critical>${criticalCss.code.replaceAll('./fonts/', 'assets/fonts/')}ui-original-card{position:absolute;inset:0;container:original-card / size}${originalPalette}${firstPaintCss}</style>`,
    hints('high'),
    `<link rel="modulepreload" href="${href(wide)}" media="${wideMedia}">`,
    `<template data-gallery-entry="${href(gallery)}">${hints('low')}</template>`,
  ];
  const preference = source.match(/<script>([^]*?)<\/script>/)?.[0];
  if (!preference) throw new Error('找不到首页偏好脚本');
  const boot = await transform(preference.slice(8, -9), {loader: 'js', minify: true});
  const page = source.replace(preference, '')
    .replace(/<meta name="viewport"[^>]+>/,
    viewport => viewport + '<script>' + boot.code + '</script>' + head.join('\n'));
  if (html !== 'index.html') return page;
  const cards = items.slice(0, initialCardCount).map(item => staticCard(item).replace(/>\s+</g, '><')).join('');
  const [introStart, introEnd] = zh('Explore {count} live UI examples.').split('{count}');
  const heroName = items.find(item => item.id === 'jelly-pad').title;
  return initialToolbar(homeStyles(page).replace(dialogs, '')).replace('<!-- initial gallery cards -->', () => cards)
    .replace('<!-- gallery categories -->', () => categoryMarkup(items)
      .replace(/<span class="category-label">([^<]+)/g, (_tag, text) => `<span class="category-label"${zhAttr(text, zh(text))}>${text}`))
    .replace('Explore <span data-stat="total"></span> live UI examples.', () =>
      `<span data-zh="${esc(introStart)}">Explore </span><span data-stat="total"></span><span data-zh="${esc(introEnd)}"> live UI examples.</span>`)
    .replace('<span>Try Jelly Cube</span>', () => `<span data-zh="${esc(zh('Try {name}', {name: heroName}))}">Try Jelly Cube</span>`)
    .replace(/(<[a-z][^>]* data-i18n="text"[^>]*)(>)([^<]+)/g, (original, start, end, text) => {
      const attribute = zhAttr(text, zh(text));
      return attribute ? start + attribute + end + text : original;
    })
    .replace(/<([a-z][^<>]*?) data-i18n="(placeholder|title|aria-label|content)"([^<>]*)>/g, (tag, head, field, tail) => {
      const source = tag.match(new RegExp(` ${field}="([^"]+)"`))?.[1];
      const translation = source && zh(source);
      return translation && translation !== source
        ? `<${head} data-i18n="${field}" data-zh-${field}="${esc(translation)}"${tail}>`
        : tag;
    })
    .replace('<span data-stat="total"></span>', `<span data-stat="total">${items.length}</span>`)
    .replace(/<!--[^]*?-->/g, '').replace(/>[ \t]*\n[ \t\n]*</g, '><');
}

const htmlOutputs = await Promise.all(pages.map(async page => [page.html, await pageHtml(page)]));
const manifest = join(root, 'private/release-files.txt');
const tracked = existsSync(manifest)
  ? readFileSync(manifest, 'utf8').trimEnd().split('\n')
  : execFileSync('git', ['ls-files', '-z'], {cwd: root, encoding: 'utf8'}).split('\0');
const buildSources = /^gallery\/(?:astryx(?:\/experimental)?|fluent-ui)\/(?:src|tools)\//;
const siteFiles = tracked.filter(path => publicFiles.has(path) || (
  /^(assets|gallery)\//.test(path) &&
  !buildSources.test(path) &&
  (!path.includes('/vendor/') || /(?:^|\/)LICENSE$/.test(path) || path.endsWith('/UPSTREAM-LICENSE')) &&
  !/(?:^|\/)package(?:-lock)?\.json$/.test(path) &&
  !path.split('/').some(part => part.startsWith('.'))
));
const astryxAssets = ['gallery/astryx/dist', 'gallery/astryx/experimental/dist'].flatMap(directory =>
  JSON.parse(readFileSync(join(root, directory, 'assets.json'), 'utf8')).map(file => join(directory, file)));
const generated = [
  'gallery/originals/dist/magnet-grid-preview.html',
  ...astryxAssets,
  'gallery/fluent-ui/dist',
  ...items.map(standaloneExamplePath).filter(Boolean),
];

function copy(path) {
  const source = join(root, path);
  const destination = join(output, path);
  mkdirSync(dirname(destination), {recursive: true});
  cpSync(source, destination, {
    recursive: true,
    filter: file => {
      const entry = lstatSync(file);
      if (!entry.isFile() && !entry.isDirectory()) throw new Error(`发布文件不是普通文件或目录：${file}`);
      return true;
    },
  });
}

rmSync(output, {recursive: true, force: true});
for (const path of [...siteFiles, ...generated]) copy(path);
for (const file of scripts.outputFiles) {
  mkdirSync(dirname(file.path), {recursive: true});
  writeFileSync(file.path, file.contents);
}
const deferredCss = [siteHomeCss, ...['gallery/loaders/style.css', 'assets/gallery.css'].map(path => readFileSync(join(root, path), 'utf8'))];
writeFileSync(join(output, 'assets/site-home.css'), deferredCss.join('\n'));
for (const [path, html] of htmlOutputs) writeFileSync(join(output, path), html);
console.log('已准备 GitHub Pages 站点：_site/');
