import {loaders} from '../gallery/loaders/catalog.mjs';
import {originalLoaders} from '../gallery/loaders/originals.mjs';
import {loadingUILoaders} from '../gallery/loading-ui/catalog.mjs';
import {svgSpinners} from '../gallery/svg-spinners/catalog.mjs';
import {micronWorks} from '../gallery/micron/catalog.mjs';
import {fluentWorks} from '../gallery/fluent-ui/catalog.mjs';
import {astryxWorks} from '../gallery/astryx/catalog.mjs';
import {translate} from './locale.mjs';

export const categories = [
  {id: 'all', name: 'All'},
  {id: 'input', name: 'Controls'},
  {id: 'feedback', name: 'Click Effects'},
  {id: 'loading', name: 'Loading'},
  // 色彩鲜艳的作品单独放在最后，图鉴首屏保持单色。
  {id: 'color', name: 'Color'},
];
const categoryNames = new Map(categories.map(({id, name}) => [id, name]));
const searchIndex = new WeakMap();

const controlTypes = {
  'day-night-toggle': 'Switch',
  'elastic-ruler': 'Slider',
  'alignment-switch': 'Segmented control',
  'bookmark-press': 'Bookmark button',
};

const feedbackShapes = {
  jelly: 'Bounce', bounce: 'Bounce', squeeze: 'Bounce', pop: 'Bounce', tada: 'Bounce',
  shake: 'Swing', groove: 'Swing', jerk: 'Swing', swing: 'Swing',
  fade: 'Flash', blink: 'Flash', flicker: 'Flash',
};

const shapeFilters = {
  feedback: {label: 'All effects', order: ['Bounce', 'Swing', 'Flash']},
  loading: {label: 'All shapes', order: ['Rings', 'Dots', 'Lines', 'Geometry', 'Text', 'Characters', 'Icons', 'States']},
};

const featured = [
  'magnet-grid', 'stretch-toggle', 'card-fan', 'ink-switch', 'gooey-tabbar', 'swipe-confirm', 'jelly-pad', 'squash-play',
  'fluent-drawer', 'paper-fold', 'tilt-card', 'elastic-string', 'detent-dial', 'merge-drops',
  'radial-menu', 'menu-morph', 'tide-ring', 'depth-stack', 'rocker-switch',
  'svg-spinner-gooey-balls-1', 'bloom-toggle', 'domino-row', 'like-burst', 'text-reveal', 'pixel-snake',
  'scrub-wave', 'worm-dots', 'download-ring', 'cart-badge', 'snap-grid', 'breath-orb', 'rubber-search', 'pull-refresh', 'bulge-volume', 'elastic-accordion',
  'step-track', 'orbit-pair', 'level-bars', 'flip-tile', 'ring',
  'cover-flow', 'odometer-stepper', 'ripple-pad', 'magnetic-button', 'elastic-ruler',
  'leaf-tabs', 'tide-progress', 'bell-toggle', 'stagger-rows', 'hold-confirm',
  'alignment-switch', 'pebble-rating', 'bookmark-press', 'paper-plane', 'copy-morph',
  'shutter-steps', 'micron-jelly', 'signal-return', 'micron-swing',
  'sand-turn', 'micron-fade', 'bow-spring', 'svg-spinner-wifi', 'dot-field', 'square',
  'micron-squeeze', 'svg-spinner-bars-scale-middle', 'corner-lock', 'micron-shake', 'lineWobble',
  'clock-hands', 'loading-ui-terminal', 'svg-spinner-clock', 'micron-tada', 'loading-ui-morphing-infinity',
  'svg-spinner-blocks-wave', 'stack-blocks', 'loading-ui-text-shimmer-wave',
];

export function buildCatalog(works = []) {
  const effects = [...originalLoaders, ...loaders, ...loadingUILoaders, ...svgSpinners].map(loader => ({
    id: loader.key, title: loader.name, en: loader.name, category: 'loading', type: 'Loader',
    shape: loader.group, summary: loader.description,
    tags: loader.original
      ? ['Original', 'loading', loader.collection]
      : [loader.origin?.name || 'LDRS', loader.origin?.author || 'UI Ball', 'Open-source integration'],
    loader,
    library: loader.original ? undefined : {id: loader.provider || 'ldrs', name: loader.origin?.name || 'LDRS'},
  }));
  const controls = works.filter(work => !['ldrs', 'loaders'].includes(work.id)).map(work => ({
    ...work, category: work.vivid ? 'color' : 'input', type: work.type || controlTypes[work.id] || 'Controls',
  }));
  const feedback = micronWorks.map(work => ({
    ...work, shape: feedbackShapes[work.en], library: {id: 'micron', name: 'Micron.js'},
  }));

  // 首批先展示可操作的控件，并穿插不同用途的精选案例。
  const byId = new Map([...controls, ...fluentWorks, ...astryxWorks, ...effects, ...feedback].map(item => [item.id, item]));
  const result = [];
  for (const id of featured) {
    if (!byId.has(id)) continue;
    result.push(byId.get(id));
    byId.delete(id);
  }

  // 剩余示例轮流取自各形态和来源，减少相近作品连续出现。
  const groups = new Map();
  for (const item of byId.values()) {
    const {loader} = item;
    const group = loader ? `${item.shape}:${loader.provider || (loader.original ? 'original' : 'ldrs')}` : item.category;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(item);
  }
  const longestGroup = Math.max(0, ...Array.from(groups.values(), group => group.length));
  for (let index = 0; index < longestGroup; index++) {
    for (const group of groups.values()) {
      if (group[index]) result.push(group[index]);
    }
  }
  // 「All」里多彩作品统一排在最后。
  return [...result.filter(item => item.category !== 'color'), ...result.filter(item => item.category === 'color')];
}

export function getCategoryFilters(items, category) {
  const filter = shapeFilters[category];
  if (!filter) return [];

  const inCategory = items.filter(item => item.category === category);
  const counts = new Map();
  for (const {shape} of inCategory) {
    if (shape) counts.set(shape, (counts.get(shape) || 0) + 1);
  }
  const shapes = [...new Set([...filter.order, ...counts.keys()])].filter(shape => counts.has(shape));
  if (shapes.length === 0) return [];
  return [
    {id: 'all', name: filter.label, count: inCategory.length},
    ...shapes.map(shape => ({id: shape, name: shape, count: counts.get(shape)})),
  ];
}

export function matches(item, {category = 'all', shape = 'all', motion = 'all', query = ''} = {}) {
  const previewMotion = item.loader || item.autoplay ? 'dynamic' : 'static';
  if ((category !== 'all' && item.category !== category) ||
      (shape !== 'all' && item.shape !== shape) ||
      (motion !== 'all' && motion !== previewMotion)) return false;
  const term = query.trim().toLowerCase();
  if (!term) return true;
  let text = searchIndex.get(item);
  if (!text) {
    const labels = [categoryNames.get(item.category), item.type, item.shape].filter(Boolean);
    text = [item.title, item.en, item.id, item.summary, item.library?.name, ...(item.tags || []), ...labels,
      ...labels.map(label => translate(label, undefined, 'zh-CN'))]
      .filter(Boolean).join(' ').toLowerCase();
    searchIndex.set(item, text);
  }
  return text.includes(term);
}
