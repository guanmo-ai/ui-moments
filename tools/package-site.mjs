import { execFileSync } from 'node:child_process';
import { cpSync, lstatSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, '_site');
const rootFiles = new Set(['index.html', 'styles.html', 'LICENSE', 'THIRD_PARTY_NOTICES.md', '.nojekyll']);
const pages = [
  {html: 'index.html', entry: 'assets/gallery.mjs', tag: 'assets/gallery.mjs'},
  {html: 'styles.html', entry: 'assets/styles.mjs', tag: 'assets/styles.mjs'},
  {html: 'gallery/loaders/index.html', entry: 'gallery/loaders/app.mjs', tag: 'app.mjs'},
];
const scripts = await build({
  absWorkingDir: root,
  entryPoints: pages.map(({entry}) => entry),
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

function pageHtml({html, entry, tag}) {
  const [main] = [...moduleFiles].find(([, file]) => file.entryPoint === entry);
  const preload = new Set();
  function addImports(path) {
    for (const item of moduleFiles.get(path).imports) {
      if (item.kind !== 'import-statement' || item.external || preload.has(item.path)) continue;
      preload.add(item.path);
      addImports(item.path);
    }
  }
  const href = path => './' + relative(dirname(join(output, html)), resolve(root, path)).split(sep).join('/');
  addImports(main);
  const original = `<script type="module" src="${tag}"></script>`;
  const source = readFileSync(join(root, html), 'utf8');
  if (!source.includes(original)) throw new Error(`找不到页面入口：${html}`);
  const head = [...preload].map(path => `<link rel="modulepreload" href="${href(path)}">`);
  head.push(`<script type="module" src="${href(main)}"></script>`);
  return source.replace(original, '').replace('</head>', head.join('\n') + '\n</head>');
}

const htmlOutputs = pages.map(page => [page.html, pageHtml(page)]);
const tracked = execFileSync('git', ['ls-files', '-z'], {cwd: root, encoding: 'utf8'}).split('\0');
const siteFiles = tracked.filter(path => rootFiles.has(path) || (
  /^(assets|gallery)\//.test(path) &&
  !path.startsWith('gallery/date-picker/') &&
  !path.split('/').some(part => part.startsWith('.'))
));
const astryxAssets = ['gallery/astryx/dist', 'gallery/astryx/experimental/dist'].flatMap(directory =>
  JSON.parse(readFileSync(join(root, directory, 'assets.json'), 'utf8')).map(file => join(directory, file)));
const generated = [
  ...astryxAssets,
  'gallery/fluent-ui/dist',
  'gallery/loading-ui/dist',
  'gallery/svg-spinners/dist',
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
for (const [path, html] of htmlOutputs) writeFileSync(join(output, path), html);
console.log('已准备 GitHub Pages 站点：_site/');
