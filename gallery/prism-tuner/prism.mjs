const canvas = document.querySelector('#spectrum');
const context = canvas.getContext('2d');
const instrument = document.querySelector('.instrument');
const bench = document.querySelector('.optical-bench');
const range = document.querySelector('#wavelength');
const number = document.querySelector('#number');
const buttons = [...document.querySelectorAll('[data-wavelength]')];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const root = document.documentElement;
const colors = [
  [390, [152, 115, 255]],
  [435, [174, 149, 255]],
  [480, [128, 186, 255]],
  [512, [146, 224, 231]],
  [545, [225, 222, 156]],
  [584, [255, 202, 122]],
  [630, [255, 131, 113]],
  [680, [249, 91, 126]],
];

let width = 0;
let height = 0;
let scale = 1;
let target = Number(range.value);
let wavelength = target;
let frame = 0;
let last = 0;

function rgb(value) {
  const next = colors.findIndex(([stop]) => stop > value);
  if (next < 0) return colors.at(-1)[1];
  if (next === 0) return colors[0][1];
  const [from, start] = colors[next - 1];
  const [to, end] = colors[next];
  const t = (value - from) / (to - from);
  return start.map((component, index) => Math.round(component + (end[index] - component) * t));
}

function rgba(color, alpha) {
  return `rgba(${color.join(',')}, ${alpha})`;
}

function line(x1, y1, x2, y2, paint, weight = 1) {
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.strokeStyle = paint;
  context.lineWidth = weight;
  context.stroke();
}

function drawBench(y) {
  context.fillStyle = '#110f18';
  context.fillRect(0, 0, width, height);
  const glow = context.createRadialGradient(width * .55, y, 0, width * .55, y, width * .57);
  glow.addColorStop(0, '#2d2238');
  glow.addColorStop(1, '#110f18');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  const grid = width < 500 ? 24 : 32;
  for (let x = width / 2 % grid; x < width; x += grid) line(x, 0, x, height, '#ebe4fa0d');
  for (let row = y % grid; row < height; row += grid) line(0, row, width, row, '#ebe4fa0d');
  line(0, y, width, y, '#eee6ff34');
  const ruler = height * .86;
  line(width * .06, ruler, width * .94, ruler, '#eee6ff37');
  for (let index = 0; index <= 36; index++) {
    const x = width * (.06 + .88 * index / 36);
    line(x, ruler, x, ruler + (index % 6 === 0 ? 10 : 4), '#eee6ff49');
  }
}

function drawBeam(x, y, radius, color) {
  const emitter = width * .07;
  const beam = context.createLinearGradient(emitter, y, x, y);
  beam.addColorStop(0, '#ffece06b');
  beam.addColorStop(.24, '#fff1e3e6');
  beam.addColorStop(1, '#fff5eafa');
  for (const [size, opacity] of [[14, .05], [7, .1], [3, .24], [1, .9]]) {
    context.globalAlpha = opacity;
    line(emitter, y, x, y, beam, size);
  }
  context.globalAlpha = 1;
  context.beginPath();
  context.arc(emitter, y, 3, 0, Math.PI * 2);
  context.fillStyle = '#fff0e2';
  context.fill();

  const exit = width * .965;
  const span = exit - x;
  const tilt = height * (.22 - (wavelength - 410) / 250 * .44);
  const spread = Math.min(height * .3, span * .59);
  for (let index = -7; index <= 7; index++) {
    const rayColor = rgb(wavelength + index * 12);
    const endY = y + tilt + index * spread / 8;
    const strength = 1 - Math.abs(index) / 9;
    const gradient = context.createLinearGradient(x, y, exit, y);
    gradient.addColorStop(0, rgba(color, .29));
    gradient.addColorStop(.45, rgba(rayColor, strength * .85));
    gradient.addColorStop(1, rgba(rayColor, .04));
    for (const [weight, alpha] of [[radius * .16, .15], [4, .23], [1.1, 1]]) {
      context.globalAlpha = alpha;
      line(x, y, exit, endY, gradient, weight);
    }
  }
  context.globalAlpha = 1;
}

function drawLens(x, y, radius, color) {
  const inner = radius * .83;
  const circle = r => {
    context.beginPath();
    context.arc(x, y, r, 0, 2 * Math.PI);
  };

  const halo = context.createRadialGradient(x, y, radius * .66, x, y, radius * 1.52);
  halo.addColorStop(0, rgba(color, .36));
  halo.addColorStop(.49, rgba(color, .17));
  halo.addColorStop(1, rgba(color, 0));
  circle(radius * 1.52);
  context.fillStyle = halo;
  context.fill();

  context.save();
  circle(radius - 1);
  context.clip();
  const glass = context.createRadialGradient(x - radius * .34, y - radius * .58, 1, x, y, radius * 1.22);
  glass.addColorStop(0, '#f0e6ff99');
  glass.addColorStop(.35, '#b6a3e749');
  glass.addColorStop(.69, rgba(color, .14));
  glass.addColorStop(1, '#0d0b22b5');
  context.fillStyle = glass;
  context.fillRect(x - radius, y - radius, radius * 2, radius * 2);

  const focus = context.createRadialGradient(x + radius * .08, y, 0, x, y, inner);
  focus.addColorStop(0, '#fff4fbdc');
  focus.addColorStop(.08, rgba(color, .72));
  focus.addColorStop(.36, rgba(color, .15));
  focus.addColorStop(1, rgba(color, 0));
  context.fillStyle = focus;
  context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  for (let index = -2; index <= 2; index++) {
    if (index === 0) continue;
    context.beginPath();
    context.moveTo(x - inner, y);
    context.quadraticCurveTo(x, y + index * radius * .32, x + inner, y + index * radius * .25);
    context.strokeStyle = rgba(color, .26);
    context.lineWidth = 1;
    context.stroke();
  }
  context.restore();

  const rim = context.createConicGradient(-2.35, x, y);
  rim.addColorStop(0, '#ffe7f7');
  rim.addColorStop(.19, rgba(color, .72));
  rim.addColorStop(.44, '#33314d');
  rim.addColorStop(.63, '#d8bdff');
  rim.addColorStop(.81, '#73648e');
  rim.addColorStop(1, '#ffe7f7');
  circle(radius - 1);
  context.strokeStyle = rim;
  context.lineWidth = 2.5;
  context.stroke();
  circle(inner);
  context.strokeStyle = '#e8def36b';
  context.lineWidth = 1;
  context.stroke();

  const tick = height * .86;
  line(x, y + radius + 6, x, tick + 2, rgba(color, .63));
  line(x - 4, tick + 2, x + 4, tick + 2, rgba(color, .92), 2);
}

function requestDraw() {
  if (context && width && !frame && !document.hidden && root.dataset.galleryActive !== 'false') {
    frame = requestAnimationFrame(draw);
  }
}

function draw(time) {
  frame = 0;
  if (document.hidden || root.dataset.galleryActive === 'false') return;
  const dt = Math.min(.04, (time - last) / 1000);
  last = time;
  const delta = target - wavelength;
  wavelength = reduceMotion.matches || Math.abs(delta) < .06 ? target : wavelength + delta * (1 - Math.exp(-dt * 19));
  const x = width * (.24 + .45 * (wavelength - 410) / 250);
  const y = height / 2;
  const radius = Math.min(78, height * .25, width * .15);
  const color = rgb(wavelength);
  context.setTransform(scale, 0, 0, scale, 0, 0);
  drawBench(y);
  drawBeam(x, y, radius, color);
  drawLens(x, y, radius, color);
  if (wavelength !== target) requestDraw();
}

function resize() {
  width = bench.clientWidth;
  height = bench.clientHeight;
  if (!width || !height) return;
  scale = Math.min(devicePixelRatio, 2);
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  requestDraw();
}

function setWavelength(value) {
  target = value;
  range.value = value;
  range.setAttribute('aria-valuetext', `${value} nanometers`);
  number.textContent = value;
  instrument.style.setProperty('--wave-color', rgba(rgb(value), 1));
  for (const button of buttons) button.setAttribute('aria-pressed', String(Number(button.dataset.wavelength) === value));
  requestDraw();
}

range.addEventListener('input', () => setWavelength(Number(range.value)));
for (const button of buttons) button.addEventListener('click', () => setWavelength(Number(button.dataset.wavelength)));
reduceMotion.addEventListener('change', requestDraw);
document.addEventListener('visibilitychange', requestDraw);
new MutationObserver(requestDraw).observe(root, {attributes: true, attributeFilter: ['data-gallery-active']});
new ResizeObserver(resize).observe(bench);
setWavelength(target);
