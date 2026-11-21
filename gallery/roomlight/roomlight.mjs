const presets = [
  { name: 'Daybreak',  icon: '☀', tint: '#ffe2bc', light: [1.12, 1.00, .84], kelvin: 4800, level: 76, description: 'Soft morning light over the water.' },
  { name: 'Reading',   icon: '◐', tint: '#ffbc82', light: [1.25, .79, .43], kelvin: 3000, level: 64, description: 'A warm glow along the shoreline.' },
  { name: 'Cinema',    icon: '▷', tint: '#aebdff', light: [.55, .69, 1.38], kelvin: 6500, level: 26, description: 'The coast in low blue light.' },
  { name: 'Midnight',  icon: '☾', tint: '#d2b8ff', light: [.74, .43, 1.09], kelvin: 2200, level: 11, description: 'A trace of violet over the tide.' },
];

const root = document.documentElement;
const $ = selector => document.querySelector(selector);
const room = $('.room');
const group = $('#scenes');
const range = $('#level');
const reading = $('#reading');
const demo = $('#demo');
const canvas = $('#optics');
const photo = $('#coast');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const levels = presets.map(preset => preset.level);
const cards = presets.map(({name, icon, tint}, index) => {
  const button = document.createElement('button');
  button.className = 'scene';
  button.type = 'button';
  button.style.setProperty('--tint', tint);
  button.setAttribute('aria-label', name);
  button.innerHTML = `
    <span class="scene-top" aria-hidden="true">
      <span class="scene-icon">${icon}</span><span class="scene-state"></span>
    </span>
    <span class="scene-bottom" aria-hidden="true">
      <span class="scene-name">${name}</span><span class="scene-value">${levels[index]}%</span>
    </span>`;
  group.append(button);
  return button;
});

let active = 0;
let hover = -1;
let hoverTarget = 0;
let hoverAmount = 0;
let pointer = [0, 0];
let pointerTarget = pointer;
let gesture;
let previewTimer = 0;
let optics, opticsStarted = false;
let frame = 0;
let last = 0;
let velocity = 0;
let brightness = levels[0] / 100;
let light = [...presets[0].light];

function isVisible() {
  return !document.hidden && root.dataset.galleryActive !== 'false';
}

function requestDraw() {
  if (!frame && isVisible() && optics) frame = requestAnimationFrame(draw);
}

function draw(time) {
  frame = 0;
  if (!optics || !isVisible()) return;
  const target = levels[active] / 100;
  const dt = Math.min(.032, (time - last) / 1000);
  last = time;
  if (reduceMotion.matches) {
    brightness = target;
    light = [...presets[active].light];
    velocity = 0;
  } else {
    velocity += ((target - brightness) * 140 - velocity * 20) * dt;
    brightness += velocity * dt;
    light = light.map((value, index) => value + (presets[active].light[index] - value) * (1 - Math.exp(-dt * 9)));
  }
  const follow = reduceMotion.matches ? 1 : 1 - Math.exp(-dt * 33);
  hoverAmount += (hoverTarget - hoverAmount) * follow;
  if (Math.abs(hoverTarget - hoverAmount) < .005) hoverAmount = hoverTarget;
  pointer = pointer.map((value, index) => value + (pointerTarget[index] - value) * follow);
  optics.draw({light, brightness: Math.max(0, brightness), active, hover, hoverAmount, pointer});
  if (canvas.hidden) {
    canvas.hidden = false;
    root.dataset.optics = 'true';
  }
  if (Math.abs(target - brightness) + Math.abs(velocity) > .001 ||
      hoverTarget !== hoverAmount ||
      (hoverTarget && Math.hypot(pointer[0] - pointerTarget[0], pointer[1] - pointerTarget[1]) > .25) ||
      light.some((value, index) => Math.abs(value - presets[active].light[index]) > .001)) requestDraw();
}

function syncLevel() {
  const value = levels[active];
  range.value = value;
  range.setAttribute('aria-valuetext', `${value} percent`);
  reading.textContent = `${value}%`;
  cards[active].querySelector('.scene-value').textContent = reading.textContent;
  room.style.setProperty('--shade', String(.7 - value * .006));
  requestDraw();
}

function select(index) {
  active = index;
  const {tint, kelvin, description} = presets[index];
  cards.forEach((card, position) => card.setAttribute('aria-pressed', String(position === index)));
  root.style.setProperty('--scene-color', tint);
  $('#temperature').textContent = `${kelvin} K`;
  $('#ambience').textContent = description;
  syncLevel();
}

function setLevel(value) {
  levels[active] = Math.round(Math.max(0, Math.min(100, value)));
  syncLevel();
}

function setPreview(enabled) {
  clearInterval(previewTimer);
  previewTimer = 0;
  demo.setAttribute('aria-pressed', String(enabled));
  if (enabled) {
    const next = () => select((active + 1) % presets.length);
    next();
    previewTimer = setInterval(next, 2500);
  }
}

group.addEventListener('keydown', event => {
  const index = cards.indexOf(event.target);
  if (index < 0) return;
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault();
    setPreview(false);
    const next = (index + (event.key === 'ArrowDown' ? 1 : -1) + cards.length) % cards.length;
    select(next);
    cards[next].focus();
  }
  if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && index === active) {
    event.preventDefault();
    setPreview(false);
    setLevel(levels[active] + (event.key === 'ArrowRight' ? 5 : -5));
  }
});

cards.forEach((card, index) => {
  card.addEventListener('click', event => {
    if (gesture?.dragged && event.pointerId === gesture.id) {
      gesture = undefined;
      return;
    }
    setPreview(false);
    select(index);
  });
  card.addEventListener('pointerdown', event => {
    gesture = undefined;
    if (event.button !== 0) return;
    setPreview(false);
    if (active === index) gesture = {id: event.pointerId, start: event.clientX, initial: levels[active], dragged: false};
  });
  function moveLens(event) {
    const box = room.getBoundingClientRect();
    pointerTarget = [event.clientX - box.left, event.clientY - box.top];
    if (hover !== index || !hoverTarget) pointer = pointerTarget;
    hover = index;
    hoverTarget = 1;
    requestDraw();
  }

  function clearLens() {
    hoverTarget = 0;
    requestDraw();
  }

  card.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'touch') moveLens(event);
  });
  card.addEventListener('pointermove', event => {
    if (event.pointerType !== 'touch' || event.buttons) moveLens(event);
    if (event.pointerId !== gesture?.id || (event.buttons & 1) === 0) return;
    const delta = event.clientX - gesture.start;
    if (gesture.dragged || Math.abs(delta) > 4) {
      if (!gesture.dragged) card.setPointerCapture(event.pointerId);
      gesture.dragged = true;
      setLevel(gesture.initial + delta / card.offsetWidth * 100);
    }
  });
  card.addEventListener('pointerleave', clearLens);
  card.addEventListener('pointerup', event => {
    if (event.pointerType === 'touch') clearLens();
  });
  card.addEventListener('pointercancel', () => {
    gesture = undefined;
    clearLens();
  });
});

range.addEventListener('input', () => {
  setPreview(false);
  setLevel(Number(range.value));
});
demo.addEventListener('click', () => setPreview(!previewTimer));
reduceMotion.addEventListener('change', requestDraw);

function updateVisibility() {
  if (!isVisible() && previewTimer) setPreview(false);
  void startOptics();
  requestDraw();
}
document.addEventListener('visibilitychange', updateVisibility);
new MutationObserver(updateVisibility).observe(root, {attributes: true, attributeFilter: ['data-gallery-active']});
select(0);

function resize() {
  optics?.resize(room, cards);
  requestDraw();
}

canvas.addEventListener('webglcontextlost', () => {
  optics = null;
  delete root.dataset.optics;
  canvas.hidden = true;
});

photo.addEventListener('load', () => {
  optics?.setPhoto();
  requestDraw();
});

async function startOptics() {
  if (opticsStarted || !isVisible()) return;
  opticsStarted = true;
  try {
    const {createOptics} = await import('./optics.mjs');
    optics = await createOptics(canvas, photo);
    if (!optics) return;
    const observer = new ResizeObserver(resize);
    observer.observe(room);
    observer.observe(group);
    document.fonts.ready.then(resize);
    resize();
  } catch (error) {
    console.warn('Using CSS room lighting.', error);
  }
}
updateVisibility();
