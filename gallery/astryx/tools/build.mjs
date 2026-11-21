import {readFile} from 'node:fs/promises';
import {dirname, join, resolve, sep} from 'node:path';
import {transformSync} from '@babel/core';
import stylexPlugin from '@stylexjs/babel-plugin';
import {build} from 'esbuild';
import {officialShowcases} from '../showcases.mjs';
import {officialVariants} from '../variants.mjs';
import {writeBundle} from './write-bundle.mjs';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const templates = 'node_modules/@astryxdesign/cli/assets/templates/blocks/components';
const templateRoot = join(root, templates) + sep;
const styleRules = new Map();
const localImages = new Map([
  ['light-home-square-1.png', 'lamp.jpg'],
  ['illustrative-horizontal-1.png', 'dimmer.jpg'],
  ['light-scene-horizontal-1.png', 'horizon.jpg'],
  ['moody-scene-horizontal-1.png', 'dimmer.jpg'],
  ['light-working-horizontal-1.png', 'lamp.jpg'],
  ['light-product-1.png', 'lamp.jpg'],
  ['building.png', 'horizon.jpg'],
]);
const posters = ['horizon.jpg', 'dimmer.jpg', 'lamp.jpg', 'neon.jpg', 'horizon.jpg'];

function localMedia(file) {
  if (file === 'Nature-1.mp4') return '../../light-scenes/clips/horizon.mp4';
  if (file.startsWith('does-not-exist-')) return 'data:image/png;base64,';
  if (file.startsWith('DATA-')) {
    const initials = file.replace(/^DATA-|-|\.png$/g, ' ').trim().split(/\s+/).map(word => word[0]).slice(0, 2).join('');
    return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#dcd9ec"/><text x="32" y="39" text-anchor="middle" fill="#30264d" font-family="system-ui,sans-serif" font-size="22">${initials}</text></svg>`)}`;
  }
  const vertical = file.match(/^illustrative-vertical-([1-5])\.png$/);
  const image = localImages.get(file) || (vertical && posters[Number(vertical[1]) - 1]) || (file.startsWith('Neutral-') && 'lamp.jpg');
  if (!image) throw new Error(`未提供本地演示素材：${file}`);
  return `../../light-scenes/posters/${image}`;
}
const showcasePlugin = {
  name: 'astryx-official-showcases',
  setup(builder) {
    builder.onResolve({filter: /^\.\/official-demos$/}, () => ({path: 'official-demos', namespace: 'astryx'}));
    builder.onResolve({filter: /^@astryx-docs\/demo-content$/}, () => ({path: join(root, 'src/template-support.jsx')}));
    builder.onLoad({filter: /.*/, namespace: 'astryx'}, () => ({
      contents: `export default new Map([${[...officialShowcases, ...officialVariants].map(([key, , file]) =>
        `[${JSON.stringify(key)}, () => import(${JSON.stringify(`./${templates}/${file}`)})]`).join(',')}]);`,
      resolveDir: root,
    }));
    builder.onLoad({filter: /\.tsx$/}, async ({path}) => {
      if (!path.startsWith(templateRoot)) return;
      const upstream = await readFile(path, 'utf8');
      let contents = upstream
        .replace(/\/template-assets\/([a-z0-9-]+\.(?:png|jpg|mp4))/gi, (_, file) => localMedia(file))
        .replace(/^\s*icon: 'https:\/\/[^']*favicon[^']*',\s*$/gm, '');
      if (contents.includes("from '@stylexjs/stylex'")) {
        const compiled = transformSync(contents, {
          filename: path, babelrc: false, configFile: false, parserOpts: {plugins: ['jsx', 'typescript']},
          plugins: [[stylexPlugin, {
            dev: false, runtimeInjection: false, classNamePrefix: 'umx',
            unstable_moduleResolution: {type: 'commonJS', rootDir: root},
          }]],
        });
        contents = compiled.code;
        styleRules.set(path, compiled.metadata.stylex || []);
      }
      return {contents, loader: 'tsx', resolveDir: dirname(path)};
    });
  },
};
const result = await build({
  absWorkingDir: root,
  entryPoints: ['src/demo.jsx'],
  outdir: dist,
  bundle: true,
  format: 'esm',
  splitting: true,
  chunkNames: 'chunks/[name]-[hash]',
  target: 'es2022',
  jsx: 'automatic',
  minify: true,
  define: {'process.env.NODE_ENV': '"production"'},
  legalComments: 'inline',
  metafile: true,
  write: false,
  plugins: [showcasePlugin],
});

await writeBundle({
  root, dist, result,
  fallbackLicenses: new Map([
    ['@astryxdesign/core@0.7.16', 'vendor/astryx/LICENSE'],
    ['@stylexjs/stylex@0.19.2', 'vendor/stylex/LICENSE'],
  ]),
  extraCss: stylexPlugin.processStylexRules([...styleRules].sort().flatMap(([, rules]) => rules), false),
});
