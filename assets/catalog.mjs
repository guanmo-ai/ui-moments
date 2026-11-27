import {originalLoaders} from '../gallery/loaders/originals.mjs';
import {fluentWorks} from '../gallery/fluent-ui/catalog.mjs';
import {astryxWorks} from '../gallery/astryx/catalog.mjs';
import {localizedText, translate} from './locale.mjs';
import {escapeHtml as escape} from '../gallery/loaders/snippets.mjs';

export const categories = [
  {id: 'all', name: 'All'},
  {id: 'tap', name: 'Tap'},
  {id: 'drag', name: 'Drag'},
  {id: 'type', name: 'Type'},
  {id: 'color', name: 'Color'},
  {id: 'loading', name: 'Loading'},
];
const groupOrder = categories.slice(1);
const categoryNames = new Map(categories.map(({id, name}) => [id, name]));
const searchIndex = new WeakMap();

const typesByTask = {
  input: [
    'Checkbox', 'Color', 'Color picker', 'Combobox', 'Dial', 'Dropdown', 'Field', 'Input', 'Number input',
    'Radio', 'Radio cards', 'Rating', 'Search', 'Segmented control', 'Select', 'Slider', 'Stepper', 'Switch', 'Tags',
  ],
  navigation: [
    'Accordion', 'Carousel', 'Dialog', 'Disclosure', 'Drawer', 'Menu', 'Navigation', 'Pagination', 'Popover',
    'Tab bar', 'Tabs', 'Tooltip', 'Tree',
  ],
  feedback: ['Bookmark button', 'Button', 'Notification', 'Toolbar'],
  progress: ['Loading state', 'Progress'],
  content: ['Card', 'Icon', 'List', 'Text'],
  data: ['Dashboard', 'Table'],
  motion: ['Lighting', 'Pointer effect', 'Rhythm', 'Showcase'],
};
const taskByType = new Map(Object.entries(typesByTask)
  .flatMap(([task, types]) => types.map(type => [type, task])));

// 当控件的用途由具体场景决定时，优先使用作品本身的判定。
const taskById = {
  'domino-row': 'motion', 'elastic-string': 'motion',
  'flip-coin': 'motion', 'jelly-pad': 'motion', 'merge-drops': 'motion',
  'code-shake': 'feedback', 'fluent-dialog': 'feedback', 'strength-meter': 'feedback',
  'swipe-confirm': 'feedback',
  'download-ring': 'progress', 'pull-refresh': 'progress',
  'fluent-card': 'input', 'fluent-list': 'input', 'fluent-toggle-button': 'input', 'snap-grid': 'input',
};

// 按主要玩法区分文字输入与直接操作。可键入内容的搜索、日期和组合框归入文字段；
// 只选现成选项的菜单、下拉列表和日历仍归入直接操作段。
const textEntryTypes = new Set(['Combobox', 'Field', 'Input', 'Number input', 'Search']);
const textEntryFamilies = new Set([
  'BaseTypeahead', 'ChatComposer', 'ChatComposerDrawer', 'ChatComposerInput', 'CodeEditor',
  'CommandPalette', 'CommandPaletteInput', 'DateInput', 'DateRangeInput', 'DateTimeInput',
  'EmojiPicker', 'Field', 'FieldStatus', 'FormLayout', 'InputGroup', 'ListInput', 'NumberInput',
  'PowerSearch', 'TextArea', 'TextInput', 'TimeInput', 'Tokenizer', 'Typeahead',
]);
// 同一家族有不同玩法时，只把实际带文字字段的演示移到文字段。
const textEntryExamples = new Set([
  'fluent-tag-picker',
  'astryx-variant-complex-selector-complex-selector-tree-search',
  'astryx-variant-dialog-dialog-form-dialog',
  'astryx-variant-hooks-use-announce-hook-usage',
  'astryx-variant-hooks-use-hotkeys-hook-usage',
  'astryx-variant-hooks-use-input-container-hook-usage',
  'astryx-variant-hooks-use-merged-refs-hook-usage',
  'astryx-variant-multi-selector-multi-selector-column-visibility-selector',
  'astryx-variant-multi-selector-multi-selector-searchable-multi-selector',
  'astryx-variant-multi-selector-use-multi-combobox-hook-usage',
  'astryx-variant-selector-use-combobox-hook-usage',
]);

export function usesTextEntry(item) {
  return textEntryTypes.has(item.type) || textEntryFamilies.has(item.family) || textEntryExamples.has(item.id);
}

// 按预览的主要玩法分组。独立色彩作品与颜色选择归彩色，独立加载示例归加载动效。
// 必须拖、拨或长按才能体验的示例归拖动，需要键入的归输入；
// 单击即可触发、只挑选现成选项或无需输入即可查看的示例归点按。
const dragTypes = new Set(['Drag', 'Dial', 'Slider']);
const dragFamilies = new Set(['Slider', 'Resizable', 'createDragToSnapPoints', 'useDragToSnapPoints', 'usePanGesture']);
const dragExamples = new Set([
  'swipe-confirm', 'hold-confirm', 'pull-refresh', 'scrub-wave',
  'astryx-variant-table-column-resize-hook-usage',
]);
const loadingFamilies = new Set(['Skeleton', 'Spinner', 'ChatReasoning']);

function playCategory(item) {
  if (item.vivid || ['Color', 'Color picker'].includes(item.type) || item.id === 'astryx-variant-hooks-use-grid-focus-hook-usage') return 'color';
  if (item.loader || item.type === 'Loading state' || loadingFamilies.has(item.family) ||
    item.id === 'astryx-variant-aspect-ratio-aspect-ratio-with-skeleton') return 'loading';
  if (dragExamples.has(item.id) || dragTypes.has(item.type) || dragFamilies.has(item.family)) return 'drag';
  return usesTextEntry(item) ? 'type' : 'tap';
}

export function groupHeading(id, t = translate) {
  const label = categoryNames.get(id);
  return id === 'color' ? t('Color examples').replace(/^Color examples$/, 'Color') : t(label);
}

const searchAliases = [
  [/\b(?:calendar|date (?:input|picker|range|time))\b/, 'calendar date picker date range 日历 日期选择 日期选择器'],
  [/\b(?:switch|toggle)\b/, 'toggle switch 开关 切换'],
  [/\b(?:dialog|modal)\b/, 'dialog modal 对话框 弹窗'],
  [/\bskeleton\b/, '骨架屏 内容占位'],
  [/\bdropdown menu\b/, '下拉菜单'],
  [/\bswipe (?:to )?confirm\b/, '滑动确认 滑动解锁'],
  [/\b(?:charts?|data visualization)\b/, '图表 数据可视化'],
  [/\b(?:data grid|data table|table)\b/, '数据表格 表格'],
  [/\b(?:click effects?|press feedback)\b/, '按钮反馈 点击反馈'],
  [/\bempty state\b/, '空状态 空页面'],
];

const shapeFilters = {
  loading: {label: 'All shapes', order: ['Rings', 'Dots', 'Lines', 'Geometry', 'Text', 'Characters', 'Icons', 'States']},
};

const firstExamples = [
  'magnet-grid', 'ink-switch', 'swipe-confirm', 'jelly-pad', 'paper-fold',
  'elastic-string', 'detent-dial', 'merge-drops', 'tide-ring',
  'rocker-switch', 'bloom-toggle', 'domino-row', 'tide-progress', 'radial-menu', 'copy-morph', 'ripple-pad', 'like-burst', 'pixel-snake',
  'scrub-wave', 'download-ring', 'snap-grid', 'pull-refresh',
  'step-track', 'orbit-pair', 'fluent-drawer', 'astryx-date-range',
  'odometer-stepper', 'leaf-tabs', 'bell-toggle',
  'hold-confirm', 'pebble-rating', 'paper-plane', 'stroke-checklist', 'plan-picker', 'breath-orb', 'signal-return',
];

export const initialCardCount = 24;

export function standaloneExamplePath(item) {
  return item.standalone ? `gallery/originals/dist/${item.id}.html` : null;
}

export function categoryMarkup(items) {
  return categories.map(({id}) => {
    const count = id === 'all' ? items.length : items.filter(item => item.category === id).length;
    return `<button type="button" data-category="${id}" aria-pressed="${id === 'all'}"><span class="category-label">${escape(groupHeading(id))}</span><span class="category-count">${count}</span></button>`;
  }).join('');
}

export function workHeading(item) {
  const {text, lang} = localizedText(item.en, item.original ? item.title : item.loader?.nameZh);
  return {name: text, lang};
}

// 卡片副标题说明组件类型。Astryx 的类型统一是 Component，改用具体的组件名。
function humanizeIdentifier(name = '') {
  return name.replace(/([a-z\d])([A-Z])/g, '$1 $2');
}

export function kindLabel(item, t = translate) {
  const generic = /^(?:Component|Component variant|Experimental component)$/.test(item.type ?? '');
  const family = item.family && humanizeIdentifier(item.family);
  // 标题里已经有组件名时不再重复，改用类型。
  const repeats = family && item.en?.toLowerCase().startsWith(family.toLowerCase());
  return !item.shape && generic && family && !repeats ? family : t(item.shape || item.type);
}

export function cardMarkup(item, t = translate) {
  const {name, lang} = workHeading(item);
  const details = t('Details');
  return `<article class="ui-item" data-ui="${escape(item.id)}" data-category="${escape(item.category)}"${item.previewSize ? ` data-preview-size="${escape(item.previewSize)}"` : ''}>
    ${item.loader
      ? `<button type="button" class="ui-stage ui-playback" aria-pressed="false" aria-label="${escape(t('Pause {name} preview', {name}))}"></button>`
      : '<div class="ui-stage"></div>'}
    <div class="ui-caption">
      <div><h2 lang="${lang}">${escape(name)}</h2><p>${escape(kindLabel(item, t))}</p></div>
      <button type="button" class="ui-expand" data-detail aria-label="${escape(`${details} ${name}`)}" aria-haspopup="dialog">
        <span class="ui-detail-label">${escape(details)}</span>
        <span class="ui-expand-icon" aria-hidden="true"></span>
      </button>
    </div><span class="ui-card-light" aria-hidden="true"></span></article>`;
}

export function buildCatalog(works = []) {
  const effects = originalLoaders.map(loader => ({
    id: loader.key, title: loader.name, en: loader.name, category: 'loading', type: 'Loader', task: 'progress',
    shape: loader.group, summary: loader.description, summaryZh: loader.descriptionZh,
    tags: ['Original', 'loading'],
    loader,
  }));
  const controls = [...works, ...fluentWorks].map(work => ({
    ...work, task: taskById[work.id] ?? taskByType.get(work.type) ?? null,
  }));

  // 目录开头先展示可操作的控件，并穿插不同用途的案例。
  const byId = new Map([...controls, ...astryxWorks, ...effects].map(item => [item.id, {...item, category: playCategory(item)}]));
  const result = [];
  for (const id of firstExamples) {
    if (!byId.has(id)) continue;
    result.push(byId.get(id));
    byId.delete(id);
  }

  // 剩余示例轮流取自各形态和来源，减少相近作品连续出现。
  const groups = new Map();
  for (const item of byId.values()) {
    const {loader} = item;
    const group = loader ? item.shape : item.category;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(item);
  }
  const longestGroup = Math.max(0, ...Array.from(groups.values(), group => group.length));
  for (let index = 0; index < longestGroup; index++) {
    for (const group of groups.values()) {
      if (group[index]) result.push(group[index]);
    }
  }
  // 分区内先展示策展后的原创例子，再保留组件库各示例的顺序。
  return groupOrder.flatMap(({id}) => {
    const group = result.filter(item => item.category === id);
    if (id === 'loading') return [...group.filter(item => !item.loader), ...group.filter(item => item.loader)];
    return [...group.filter(item => item.original), ...group.filter(item => !item.original)];
  });
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

function normalizeSearch(text) {
  return text.normalize('NFKC').replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/[\s_‐‑–—-]+/g, ' ').trim().toLowerCase();
}

export function matches(item, {task = 'all', category = 'all', shape = 'all', motion = 'all', query = ''} = {}) {
  const previewMotion = item.loader || item.autoplay ? 'dynamic' : 'static';
  if ((task !== 'all' && item.task !== task) ||
      (category !== 'all' && item.category !== category) ||
      (shape !== 'all' && item.shape !== shape) ||
      (motion !== 'all' && motion !== previewMotion)) return false;
  const term = normalizeSearch(query);
  if (!term) return true;
  let text = searchIndex.get(item);
  if (!text) {
    const labels = [categoryNames.get(item.category), item.type, item.shape].filter(Boolean);
    const keywords = [item.title, item.en, item.loader?.nameZh, item.id, item.family, ...(item.tags || []), ...labels]
      .filter(Boolean).map(normalizeSearch);
    const aliases = searchAliases.filter(([pattern]) => keywords.some(keyword => pattern.test(keyword)))
      .map(([, value]) => value);
    const descriptions = [
      item.summary, item.summaryZh, item.library?.name,
      ...labels.map(label => translate(label, undefined, 'zh-CN')),
      groupHeading(item.category, label => translate(label, undefined, 'zh-CN')),
    ]
      .filter(Boolean).map(normalizeSearch);
    text = [...keywords, ...aliases, ...descriptions].join('\n');
    searchIndex.set(item, text);
  }
  if (!/^[a-z0-9]/.test(term)) return text.includes(term);
  // 保留按字首搜索的体验，避免 table 匹配 selectable 之类的词。
  for (let index = text.indexOf(term); index !== -1; index = text.indexOf(term, index + 1)) {
    if (!/[a-z0-9]/.test(text.charAt(index - 1))) return true;
  }
  return false;
}
