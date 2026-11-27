import first, {wide} from '../gallery/originals/dist/cards-first.mjs';

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
  const wideTemplate = stage.querySelector('template[data-original-wide]');
  if (wideTemplate) {
    const end = wideTemplate.nextElementSibling;
    wideTemplate.replaceWith(wideTemplate.content);
    end?.remove();
  }
  let host = stage.querySelector('ui-original-card');
  const existing = Boolean(host);
  if (!host) {
    host = document.createElement('ui-original-card');
    host.dataset.originalCard = '';
    host.style.cssText = 'position:absolute;inset:0;container:original-card / size';
  }
  const shadow = host.shadowRoot ?? host.attachShadow({mode: 'open'});
  const template = host.querySelector('template[shadowrootmode]');
  if (template) {
    shadow.append(template.content);
    template.remove();
  }
  for (const type of ['keydown', 'keyup']) host.addEventListener(type, event => event.stopPropagation());
  let root = shadow.querySelector('.original-root');
  if (!root) {
    const css = definition.style;
    if (!sheets.has(css)) {
      const sheet = document.createElement('style');
      sheet.textContent = css;
      sheets.set(css, sheet);
    }
    shadow.prepend(sheets.get(css).cloneNode(true));
    root = document.createElement('div');
    root.className = 'original-root';
    root.lang = 'en';
    root.dataset.embedded = 'true';
    root.innerHTML = definition.html;
    shadow.append(root);
  }
  root.dataset.theme = theme;
  root.dataset.galleryActive = String(active);
  if (!existing) stage.append(host);
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
    if (!existing) host.remove();
    throw error;
  }
  host.dataset.hydrated = '';
  mounted.set(stage, root);
  return root;
}

class OriginalCard extends HTMLElement {
  static get(stage) {
    return mounted.get(stage);
  }

  static async mount(stage, id, theme, active) {
    if (Object.hasOwn(first, id) || wide.has(id)) {
      const definition = first[id] ?? (await loadWide())[id];
      return mount(stage, definition, theme, active);
    }
    later ??= import('../gallery/originals/dist/cards-later.mjs').then(module => module.default).catch(error => {
      later = undefined;
      throw error;
    });
    return mount(stage, (await later)[id], theme, active);
  }
}
customElements.define('ui-original-card', OriginalCard);

function start() {
  const theme = document.documentElement.dataset.theme;
  const canPlay = !document.hidden && !reducedMotion.matches;
  const wideScreen = matchMedia('(min-width:760px), (min-height:1000px)').matches;
  const initial = [...document.querySelectorAll('#ui-grid > [data-ui]')];
  const inView = element => {
    const {top, bottom} = element.getBoundingClientRect();
    return top < innerHeight && bottom > 0;
  };
  function hydrate(element, active = canPlay) {
    void OriginalCard.mount(element.firstElementChild, element.dataset.ui, theme, active).catch(() => {
      // The gallery can offer a retry if initialization fails.
    });
  }
  // Bind the leading static control without a layout read; leave its motion paused until visibility is measured.
  const lead = initial.find(element => Object.hasOwn(first, element.dataset.ui));
  if (lead) hydrate(lead, false);
  requestAnimationFrame(() => {
    const visible = initial.filter(element => element !== lead &&
      (Object.hasOwn(first, element.dataset.ui) || (wideScreen && wide.has(element.dataset.ui))) && inView(element));
    const leadingRoot = lead && OriginalCard.get(lead.firstElementChild);
    if (leadingRoot && canPlay && inView(lead)) leadingRoot.dataset.galleryActive = 'true';
    for (const element of visible) hydrate(element);
  });

  // The packaged homepage gives the in-view controls the first render. The
  // remaining gallery modules can now download without slowing that batch.
  const galleryEntry = document.querySelector('template[data-gallery-entry]');
  if (galleryEntry) requestAnimationFrame(() => setTimeout(() => {
    for (const sheet of document.querySelectorAll('link[data-home-href]')) sheet.href = sheet.dataset.homeHref;
    document.head.append(galleryEntry.content.cloneNode(true));
    void import(new URL(galleryEntry.dataset.galleryEntry, document.baseURI).href);
  }, 0));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true});
else start();
