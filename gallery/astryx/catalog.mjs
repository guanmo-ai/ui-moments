import {officialShowcases} from './showcases.mjs';
import {officialVariants} from './variants.mjs';
import {canary, canaryCommit, canaryStories} from './experimental/stories.mjs';

const source = 'gallery/astryx';
const upstream = 'https://github.com/meta/astryx/blob/3fcee8b8a559c41735064b2560fc9d358c99919b/packages/cli/assets/templates/blocks/components';
const library = {id: 'astryx', name: 'Astryx'};
const credit = {
  name: 'Astryx · Meta Platforms, Inc.',
  url: 'https://github.com/meta/astryx',
  licensePath: `${source}/vendor/astryx/LICENSE`,
  note: 'MIT components from Astryx 0.7.16. Demo content, gallery integration, and theming by UI Moments.',
};

const adapted = [
  ['date-range', 'Date Range Input', 'Date Range Input', 'Date range', 'Pick start and end dates in the calendar or clear the range.', ['calendar', 'form'], 'large'],
  ['bottom-sheet', 'Bottom Sheet', 'Bottom Sheet', 'Overlay', 'Open the sheet from the bottom. Drag it down or press Escape to close it.', ['Overlay', 'drag'], 'wide'],
  ['command-palette', 'Command Palette', 'Command Palette', 'Search panel', 'Type to filter commands, then use the arrow keys and Enter to select one.', ['search', 'keyboard'], 'wide'],
].map(([key, title, en, type, summary, tags, previewSize]) => ({
  id: `astryx-${key}`,
  title,
  en,
  type,
  category: 'input',
  previewSize,
  summary,
  tags: [...tags, 'Astryx', 'Open-source integration'],
  demo: `${source}/dist/index.html#${key}`,
  source,
  library,
  credit,
}));

const showcasePreviewSizes = {
  'app-shell': 'wide',
  'bottom-sheet-switcher': 'large',
  calendar: 'large',
  'chat-layout': 'large',
  'chat-message-list': 'large',
  'date-input': 'large',
  'date-time-input': 'large',
  drawer: 'wide',
  'layout-panel': 'large',
  table: 'wide',
};

const coreWorks = [...officialShowcases, ...officialVariants].map(([key, title, template, summary]) => ({
  id: `astryx-${key}`,
  title,
  en: title,
  type: key.startsWith('variant-') ? 'Component variant' : 'Component',
  category: 'input',
  previewSize: showcasePreviewSizes[key],
  summary,
  tags: ['Astryx', 'Open-source integration', ...(key.startsWith('variant-') ? ['Variant'] : [])],
  demo: `${source}/dist/index.html#${key}`,
  source,
  library,
  fitPreview: true,
  credit: {...credit, url: `${upstream}/${template}`, note: 'Official Astryx 0.7.16 example, embedded by UI Moments. MIT.'},
}));

const experimentalSource = `${source}/experimental`;
const canaryWorks = canaryStories.map(([key, title, story, , kind]) => ({
  id: `astryx-${key}`,
  title,
  en: title,
  type: kind === 'chart' ? 'Data visualization' : 'Experimental component',
  category: 'input',
  previewSize: key === 'lab-transfer-list' || key.startsWith('lab-schedule-') ? 'large' : 'wide',
  summary: `Official Astryx Storybook example from the ${canary} release.`,
  tags: ['Astryx', 'Open-source integration', kind === 'chart' ? 'Chart' : 'Experimental'],
  demo: `${experimentalSource}/dist/index.html#${key}`,
  source: experimentalSource,
  library,
  fitPreview: true,
  credit: {
    ...credit,
    url: `https://github.com/meta/astryx/blob/${canaryCommit}/apps/storybook/stories/${story}.stories.tsx`,
    licensePath: `${experimentalSource}/vendor/astryx/LICENSE`,
    note: `Official Astryx ${canary} Storybook example, embedded by UI Moments. MIT.`,
  },
}));

export const astryxWorks = [...adapted, ...coreWorks, ...canaryWorks];
