// UI Moments 原创加载动效（第二批）。图形、路径与 CSS 均由本项目设计，MIT 许可。
const ink = {color: '#434eaa', darkColor: '#bcc4ff'};
const warm = {color: '#a4492f', darkColor: '#ffbd99'};
const sea = {color: '#2f6f86', darkColor: '#9fdcf0'};

export const motifLoaders = [
  {
    key: 'tide-ring',
    name: '潮环',
    group: '环形',
    ...ink,
    speed: 1.6,
    description: '弧线一边旋转一边像潮水一样涨落',
    parts: ['track', 'arc'],
    css: `
@property --um-sweep { syntax: '<percentage>'; inherits: false; initial-value: 10%; }
.um-tide-ring .track, .um-tide-ring .arc {
  position: absolute;
  inset: 12%;
  border-radius: 50%;
  border: calc(var(--size) * .08) solid currentColor;
}
.um-tide-ring .track { opacity: .16; }
.um-tide-ring .arc {
  -webkit-mask: conic-gradient(#000 var(--um-sweep), transparent 0);
  mask: conic-gradient(#000 var(--um-sweep), transparent 0);
  animation: um-tide-sweep var(--period) cubic-bezier(.55,.1,.35,.95) infinite, um-tide-turn calc(var(--period) * 1.5) linear infinite;
}
@keyframes um-tide-sweep { 0%, 100% { --um-sweep: 8%; } 50% { --um-sweep: 72%; } }
@keyframes um-tide-turn { to { transform: rotate(1turn); } }
`,
  },
  {
    key: 'stack-blocks',
    name: '叠块',
    group: '几何',
    ...warm,
    speed: 2.2,
    description: '三块方砖依次落下叠成一摞，再一起滑出',
    parts: ['block block-1', 'block block-2', 'block block-3'],
    css: `
.um-stack-blocks .block {
  position: absolute;
  left: 32%;
  width: 36%;
  height: 18%;
  border-radius: 12%;
  background: currentColor;
  bottom: var(--rest);
  animation: um-stack-drop var(--period) cubic-bezier(.5,0,.3,1) infinite;
  animation-delay: var(--delay);
  opacity: 0;
}
.um-stack-blocks .block-1 { --rest: 18%; --delay: 0s; }
.um-stack-blocks .block-2 { --rest: 40%; --delay: calc(var(--period) * .12); }
.um-stack-blocks .block-3 { --rest: 62%; --delay: calc(var(--period) * .24); }
.um-stack-blocks .block-2 { filter: opacity(.72); }
.um-stack-blocks .block-3 { filter: opacity(.48); }
@keyframes um-stack-drop {
  0% { transform: translateY(-120%); opacity: 0; }
  10% { opacity: 1; }
  22% { transform: translateY(0) scale(1.08, .86); opacity: 1; }
  30%, 66% { transform: translateY(0); opacity: 1; }
  86%, 100% { transform: translateX(160%); opacity: 0; }
}
`,
  },
  {
    key: 'metronome-dot',
    name: '节拍',
    group: '圆点',
    ...sea,
    speed: 1.1,
    description: '圆点在两道竖线之间来回弹，碰到时压扁',
    parts: ['wall wall-left', 'wall wall-right', 'dot'],
    css: `
.um-metronome-dot .wall {
  position: absolute;
  top: 30%;
  width: 5%;
  height: 40%;
  border-radius: 100px;
  background: currentColor;
  opacity: .35;
}
.um-metronome-dot .wall-left { left: 14%; animation: um-meter-hit var(--period) ease-out infinite; }
.um-metronome-dot .wall-right { right: 14%; animation: um-meter-hit var(--period) ease-out calc(var(--period) * -.5) infinite; }
.um-metronome-dot .dot {
  position: absolute;
  top: 41%;
  left: 21%;
  width: 18%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: currentColor;
  animation: um-meter-swing var(--period) cubic-bezier(.45,0,.55,1) infinite;
}
@keyframes um-meter-swing {
  0% { transform: translateX(0) scale(.78, 1.16); transform-origin: left; }
  8% { transform: translateX(0) scale(1); }
  42% { transform: translateX(255%) scale(1); }
  50% { transform: translateX(255%) scale(.78, 1.16); }
  58% { transform: translateX(255%) scale(1); }
  92% { transform: translateX(0) scale(1); }
  100% { transform: translateX(0) scale(.78, 1.16); }
}
@keyframes um-meter-hit { 0%, 12% { opacity: .9; transform: scaleY(1.15); } 30%, 100% { opacity: .35; transform: none; } }
`,
  },
  {
    key: 'rising-words',
    name: '浮字',
    group: '文字',
    ...ink,
    speed: 1.8,
    description: '「加载中」三个字依次浮起再落回',
    parts: ['ch ch-1', 'ch ch-2', 'ch ch-3'],
    css: `
.um-rising-words {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2%;
  font: 600 calc(var(--size) * .24) / 1 system-ui, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
.um-rising-words .ch { animation: um-words-rise var(--period) cubic-bezier(.3,.7,.3,1) var(--delay) infinite; }
.um-rising-words .ch-1 { --delay: 0s; }
.um-rising-words .ch-2 { --delay: calc(var(--period) * .1); }
.um-rising-words .ch-3 { --delay: calc(var(--period) * .2); }
.um-rising-words .ch-1::before { content: '加'; }
.um-rising-words .ch-2::before { content: '载'; }
.um-rising-words .ch-3::before { content: '中'; }
@keyframes um-words-rise {
  0%, 50%, 100% { transform: translateY(0); opacity: .4; }
  20% { transform: translateY(-22%); opacity: 1; }
  32% { transform: translateY(4%); opacity: .85; }
}
`,
  },
  {
    key: 'dot-field',
    name: '点阵波',
    group: '圆点',
    ...sea,
    speed: 1.4,
    description: '九个圆点沿对角线依次涨大，像风吹过草地',
    parts: Array.from({length: 9}, (_, index) => `cell cell-${(index % 3) + Math.floor(index / 3)}`),
    css: `
.um-dot-field {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 9%;
  padding: 20%;
}
.um-dot-field .cell {
  border-radius: 50%;
  background: currentColor;
  aspect-ratio: 1;
  animation: um-field-wave var(--period) ease-in-out infinite;
}
.um-dot-field .cell-1 { animation-delay: calc(var(--period) * .1); }
.um-dot-field .cell-2 { animation-delay: calc(var(--period) * .2); }
.um-dot-field .cell-3 { animation-delay: calc(var(--period) * .3); }
.um-dot-field .cell-4 { animation-delay: calc(var(--period) * .4); }
@keyframes um-field-wave { 0%, 60%, 100% { transform: scale(.45); opacity: .35; } 25% { transform: scale(1); opacity: 1; } }
`,
  },
  {
    key: 'sand-turn',
    name: '沙漏',
    group: '图标',
    ...warm,
    speed: 2.6,
    description: '沙子从上半漏到下半，漏完整只沙漏翻转',
    parts: ['cap cap-top', 'cap cap-bottom', 'bulb bulb-top', 'bulb bulb-bottom', 'sand sand-top', 'sand sand-bottom', 'stream'],
    css: `
.um-sand-turn { animation: um-sand-flip var(--period) cubic-bezier(.6,0,.3,1) infinite; }
.um-sand-turn .cap { position: absolute; left: 24%; right: 24%; height: 7%; border-radius: 100px; background: currentColor; }
.um-sand-turn .cap-top { top: 14%; }
.um-sand-turn .cap-bottom { bottom: 14%; }
.um-sand-turn .bulb { position: absolute; left: 29%; right: 29%; height: 29%; background: currentColor; opacity: .2; }
.um-sand-turn .bulb-top { top: 21%; clip-path: polygon(0 0, 100% 0, 58% 100%, 42% 100%); }
.um-sand-turn .bulb-bottom { bottom: 21%; clip-path: polygon(42% 0, 58% 0, 100% 100%, 0 100%); }
.um-sand-turn .sand { position: absolute; left: 33%; right: 33%; background: currentColor; }
.um-sand-turn .sand-top {
  top: 23%;
  height: 25%;
  clip-path: polygon(0 0, 100% 0, 50% 100%);
  transform-origin: bottom;
  animation: um-sand-drain var(--period) linear infinite;
}
.um-sand-turn .sand-bottom {
  bottom: 21%;
  height: 25%;
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
  transform-origin: bottom;
  animation: um-sand-fill var(--period) linear infinite;
}
.um-sand-turn .stream { position: absolute; left: 49%; width: 2%; top: 49%; height: 28%; background: currentColor; animation: um-sand-stream var(--period) linear infinite; }
@keyframes um-sand-drain { 0% { transform: scale(1); } 70%, 100% { transform: scale(0); } }
@keyframes um-sand-fill { 0% { transform: scale(0); } 70%, 100% { transform: scale(1); } }
@keyframes um-sand-stream { 0%, 68% { opacity: .8; } 70%, 100% { opacity: 0; } }
@keyframes um-sand-flip { 0%, 72% { transform: rotate(0); } 100% { transform: rotate(.5turn); } }
`,
  },
  {
    key: 'draft-card',
    name: '文稿',
    group: '状态',
    ...ink,
    speed: 1.6,
    description: '头像与三行文字的占位，一道柔光从左扫到右',
    parts: ['avatar', 'line line-1', 'line line-2', 'line line-3'],
    css: `
.um-draft-card { width: calc(var(--size) * 1.6); }
.um-draft-card > * {
  position: absolute;
  background: linear-gradient(90deg, color-mix(in srgb, currentColor 18%, transparent) 30%, color-mix(in srgb, currentColor 42%, transparent) 50%, color-mix(in srgb, currentColor 18%, transparent) 70%) 0 0 / 300% 100%;
  animation: um-draft-shine var(--period) ease-in-out infinite;
}
.um-draft-card .avatar { left: 10%; top: 24%; width: 18%; aspect-ratio: 1; border-radius: 50%; }
.um-draft-card .line { left: 36%; height: 9%; border-radius: 100px; }
.um-draft-card .line-1 { top: 26%; width: 40%; }
.um-draft-card .line-2 { top: 46%; width: 54%; left: 10%; animation-delay: calc(var(--period) * .08); }
.um-draft-card .line-3 { top: 63%; width: 38%; left: 10%; animation-delay: calc(var(--period) * .16); }
@keyframes um-draft-shine { from { background-position: 100% 0; } to { background-position: 0 0; } }
`,
  },
  {
    key: 'clock-hands',
    name: '时针',
    group: '线条',
    ...sea,
    speed: 2,
    description: '长针一圈，短针一格，表盘四个刻度随之亮起',
    parts: ['face', 'tick tick-1', 'tick tick-2', 'tick tick-3', 'tick tick-4', 'hand hand-hour', 'hand hand-minute', 'pin'],
    css: `
.um-clock-hands .face { position: absolute; inset: 14%; border-radius: 50%; border: calc(var(--size) * .045) solid currentColor; opacity: .3; }
.um-clock-hands .tick { position: absolute; left: 48.5%; top: 20%; width: 3%; height: 8%; border-radius: 100px; background: currentColor; transform-origin: 50% 375%; transform: rotate(var(--r)); animation: um-clock-tick calc(var(--period) * 4) steps(1) var(--d) infinite; opacity: .3; }
.um-clock-hands .tick-1 { --r: 0deg; --d: 0s; }
.um-clock-hands .tick-2 { --r: 90deg; --d: calc(var(--period) * -3); }
.um-clock-hands .tick-3 { --r: 180deg; --d: calc(var(--period) * -2); }
.um-clock-hands .tick-4 { --r: 270deg; --d: calc(var(--period) * -1); }
.um-clock-hands .hand { position: absolute; left: 48%; bottom: 50%; width: 4%; border-radius: 100px; background: currentColor; transform-origin: 50% 100%; }
.um-clock-hands .hand-minute { height: 30%; animation: um-clock-spin var(--period) linear infinite; }
.um-clock-hands .hand-hour { height: 20%; opacity: .7; animation: um-clock-spin calc(var(--period) * 4) steps(4) infinite; }
.um-clock-hands .pin { position: absolute; inset: 46%; border-radius: 50%; background: currentColor; }
@keyframes um-clock-spin { to { transform: rotate(1turn); } }
@keyframes um-clock-tick { 0% { opacity: 1; } 25%, 100% { opacity: .3; } }
`,
  },
].map(({speed, color, darkColor, ...item}) => ({
  ...item,
  collection: '原创动效',
  className: 'um-' + item.key,
  defaults: {size: 72, color, speed},
  darkColor,
}));
