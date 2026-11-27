import first, {wide, shells} from '../gallery/originals/dist/cards-first.mjs';

const mounted = new WeakMap();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const sheets = new Map();
let later, wider;

function loadWide() {
  wider ??= import('../gallery/originals/dist/cards-wide.mjs').then(module => module.default).catch(error => {
    wider = undefined;
    throw error;
  });
  return wider;
}

function mount(stage, definition, theme, active) {
  if (mounted.has(stage)) return mounted.get(stage);
  const host = document.createElement('ui-original-card');
  host.dataset.originalCard = '';
  host.style.cssText = 'position:absolute;inset:0;container:original-card / size';
  const shadow = host.attachShadow({mode: 'open'});
  for (const type of ['keydown', 'keyup']) host.addEventListener(type, event => event.stopPropagation());
  const shell = shells[definition.page];
  const css = shell ? shell[0] + definition.style + shell[1] : definition.style;
  if (!sheets.has(css)) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    sheets.set(css, sheet);
  }
  shadow.adoptedStyleSheets = [sheets.get(css)];
  const root = document.createElement('div');
  root.className = 'original-root';
  root.lang = 'en';
  root.dataset.embedded = 'true';
  root.dataset.theme = theme;
  root.dataset.galleryActive = String(active);
  root.innerHTML = definition.html;
  shadow.append(root);
  stage.append(host);
  try {
    definition.init({
      root,
      reducedMotion,
      motionEnabled: () => !reducedMotion.matches && root.dataset.galleryActive !== 'false',
      $: (selector, scope = shadow) => scope.querySelector(selector),
      $$: (selector, scope = shadow) => Array.from(scope.querySelectorAll(selector)),
      clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
      document: {
        createElement: name => document.createElement(name),
        get hidden() { return document.hidden; },
        fonts: document.fonts,
      },
      sourceUrl: new URL(`gallery/originals/${definition.page}`, document.baseURI).href,
    });
  } catch (error) {
    host.remove();
    throw error;
  }
  mounted.set(stage, root);
  return root;
}

class OriginalCard extends HTMLElement {
  static get(stage) {
    return mounted.get(stage);
  }

  static async mount(stage, id, theme, active) {
    if (Object.hasOwn(first, id)) return mount(stage, first[id], theme, active);
    if (wide.has(id)) return mount(stage, (await loadWide())[id], theme, active);
    later ??= import('../gallery/originals/dist/cards-later.mjs').then(module => module.default).catch(error => {
      later = undefined;
      throw error;
    });
    return mount(stage, (await later)[id], theme, active);
  }
}
customElements.define('ui-original-card', OriginalCard);

const theme = document.documentElement.dataset.theme;
const canPlay = !document.hidden && !reducedMotion.matches;
const wideScreen = matchMedia('(min-width: 760px)').matches;
const initial = [...document.querySelectorAll('#ui-grid > [data-ui]')];
const wideDefinitions = wideScreen && initial.some(element => wide.has(element.dataset.ui))
  ? await loadWide().catch(() => undefined)
  : undefined;
const visible = [];
for (const element of initial) {
  const definition = first[element.dataset.ui] ?? wideDefinitions?.[element.dataset.ui];
  if (!definition) continue;
  if (wideScreen) {
    const {top, bottom} = element.getBoundingClientRect();
    if (top >= innerHeight) continue;
    visible.push({element, definition, inView: bottom > 0});
  } else {
    visible.push({element, definition, inView: false});
  }
}
for (const {element, definition, inView} of visible) {
  try {
    mount(element.firstElementChild, definition, theme, inView && canPlay);
  } catch {
    // The gallery can offer a retry if initialization fails.
  }
}
document.documentElement.removeAttribute('data-preview-pending');
if (!wideScreen && canPlay) requestAnimationFrame(() => {
  if (document.documentElement.dataset.ready) return;
  for (const {element} of visible) {
    const root = OriginalCard.get(element.firstElementChild);
    const {top, bottom} = element.getBoundingClientRect();
    if (root && top < innerHeight && bottom > 0) root.dataset.galleryActive = 'true';
  }
});

// The packaged homepage gives the in-view controls the first render. The
// remaining gallery modules can now download without slowing that batch.
const galleryEntry = document.querySelector('template[data-gallery-entry]');
if (galleryEntry) {
  for (const sheet of document.querySelectorAll('link[data-home-href]')) sheet.href = sheet.dataset.homeHref;
  document.head.append(galleryEntry.content.cloneNode(true));
  void import(new URL(galleryEntry.dataset.galleryEntry, document.baseURI).href);
}
