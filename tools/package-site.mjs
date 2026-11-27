import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { build, transform } from 'esbuild';
import { buildCatalog, cardMarkup, categoryMarkup, initialCardCount, standaloneExamplePath } from '../assets/catalog.mjs';

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
  define: {__UI_MOMENTS_DIALOGS__: JSON.stringify(homepage.match(dialogs)[1])},
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

// The shared source sheets remain the source of truth for both render paths.
const criticalSources = ['assets/site.css', 'assets/gallery.css'];
const siteHomeCss = readFileSync(join(root, 'assets/site.css'), 'utf8').replace(/@font-face\s*\{[^}]+\}/g, '');
const criticalCss = await transform(criticalSources.flatMap(path => {
  const source = readFileSync(join(root, path), 'utf8')
    .replace(/\/\* home-deferred \*\/[\s\S]*?\/\* \/home-deferred \*\//g, '');
  return [...source.matchAll(/\/\* home-critical \*\/([\s\S]*?)\/\* \/home-critical \*\//g)]
    .map(([, css]) => css.replaceAll("url('./fonts/", "url('assets/fonts/"));
}).join('\n'), {loader: 'css', minify: true});

function inlineHomeStyles(html) {
  const firstStylesheet = '<link rel="stylesheet" href="assets/site.css">';
  return html.replace(firstStylesheet, () => `<style data-home-critical>${criticalCss.code}[data-preview-pending] body{visibility:hidden;animation:reveal-previews 0s 1.8s forwards}@keyframes reveal-previews{to{visibility:visible}}</style>
<link rel="stylesheet" href="assets/site-home.css">`)
    .replace(/<link rel="stylesheet" href="([^"]+)">/g, (link, path) => (
      `<link rel="stylesheet" data-home-href="${path}" media="print" onload="this.media='all'"><noscript>${link}</noscript>`
    ));
}

function pageHtml({html, entries}) {
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
    hints('high'),
    `<link rel="modulepreload" href="${href(wide)}" media="(min-width: 760px)">`,
    `<script type="module" src="${href(originals)}" blocking="render"></script>`,
    `<template data-gallery-entry="${href(gallery)}">${hints('low')}</template>`,
  ];
  const page = source.replace('<script>\n', '<script>document.documentElement.dataset.previewPending="";\n')
    .replace(/<meta name="viewport"[^>]+>/, viewport => viewport + '\n' + head.join('\n'));
  if (html !== 'index.html') return page;
  const cards = items.slice(0, initialCardCount).map(item => cardMarkup(item).replace(/>\s+</g, '><')).join('');
  return inlineHomeStyles(page).replace(dialogs, '').replace('<!-- initial gallery cards -->', () => cards)
    .replace('<!-- gallery categories -->', () => categoryMarkup(items))
    .replace('<span data-stat="total"></span>', `<span data-stat="total">${items.length}</span>`)
    .replace(/<!--[^]*?-->/g, '').replace(/>[ \t]*\n[ \t\n]*</g, '><');
}

const htmlOutputs = pages.map(page => [page.html, pageHtml(page)]);
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
writeFileSync(join(output, 'assets/site-home.css'), siteHomeCss);
for (const [path, html] of htmlOutputs) writeFileSync(join(output, path), html);
console.log('已准备 GitHub Pages 站点：_site/');
