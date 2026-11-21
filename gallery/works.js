// 作品清单：首页从这里读取。新增作品时在数组里加一项即可。
const elasticControls = [
  {
    id: 'elastic-ruler',
    title: 'Elastic Slider',
    en: 'Elastic Slider',
    summary: 'The slider thumb stretches in the direction of the drag. Pull past either end and release to snap back.',
    tags: ['Slider', 'ticks', 'drag'],
    notes: ['Drag with a mouse or touch, or use the arrow keys.', 'Pulling past the ends changes the thumb shape. The value stays between 0 and 100.'],
  },
  {
    id: 'alignment-switch',
    title: 'Alignment Switch',
    en: 'Alignment Switch',
    summary: 'Switch between left, center, and right alignment. The selection stretches before settling, and the lines follow.',
    tags: ['radio', 'alignment', 'Segmented control'],
    notes: ['The native radio group supports arrow-key navigation.', 'When switched quickly, the selection continues from its current position.'],
  },
  {
    id: 'bookmark-press',
    title: 'Bookmark Button',
    en: 'Bookmark Button',
    summary: 'Press to toggle the bookmark. The button compresses and the bookmark springs out of its slot.',
    tags: ['favorite', 'bookmark', 'Button'],
    notes: ['Click or press Enter or Space to toggle the bookmark.', 'The button and bookmark icon each have their own spring.'],
  },
].map(work => ({
  ...work,
  tags: [...work.tags, 'elastic controls'],
  demo: 'gallery/elastic-controls/index.html#' + work.id,
  source: 'gallery/elastic-controls',
  live: true,
  credit: {
    name: '@yui540',
    url: 'https://x.com/yui540/status/2120825584947487170',
    note: 'Inspired by the squash, stretch, and spring timing. Design and implementation by UI Moments.',
  },
}));

// UI Moments 原创控件：构思、造型、动效与代码均由本项目完成，MIT 许可。
// 第一批（index.html）
const originalCore = [
  {
    id: 'ink-switch',
    title: 'Ink Switch',
    en: 'Ink Switch',
    type: 'Switch',
    summary: 'Ink spills from the thumb across the track, then draws back into the thumb when switched off.',
    tags: ['Switch', 'switch', 'ink', 'bleed'],
    notes: ['The switch supports Space and Enter.', 'A circular clip-path spreads the ink while the thumb squashes and rebounds.'],
  },
  {
    id: 'detent-dial',
    title: 'Detent Dial',
    en: 'Detent Dial',
    type: 'Dial',
    summary: 'Drag around the dial. The pointer snaps to the nearest tick, and the number flips as you cross each mark.',
    tags: ['Dial', 'slider', 'ticks', 'drag'],
    notes: ['The slider supports arrow keys, Page Up, Page Down, Home, and End.', 'Dragging across the bottom gap keeps the value at the endpoint.'],
  },
  {
    id: 'hold-confirm',
    title: 'Hold to Confirm',
    en: 'Hold to Confirm',
    type: 'Button',
    summary: 'Hold to complete the action. The progress resets if you release early, and the label trembles just before completion.',
    tags: ['Button', 'delete', 'hold', 'confirm'],
    notes: ['Works with a mouse, touch, and keyboard. With a keyboard, hold Space or Enter.', 'A quick tap prompts you to hold to delete.'],
  },
  {
    id: 'odometer-stepper',
    title: 'Odometer Stepper',
    en: 'Odometer Stepper',
    type: 'Stepper',
    summary: 'Digits roll in the direction of the change. Hold either step button to speed up, with a soft bump at each limit.',
    tags: ['Stepper', 'count', 'spinbutton', 'numbers'],
    notes: ['The spinbutton supports arrow keys, Page Up, Page Down, Home, and End.', 'The digits keep their direction when wrapping between 9 and 0.'],
  },
  {
    id: 'leaf-tabs',
    title: 'Leaf Tabs',
    en: 'Leaf Tabs',
    type: 'Tabs',
    summary: 'The selection flips like a page onto the new tab, and the bars grow to their new values in sequence.',
    tags: ['Tabs', 'tabs', 'page flip', 'charts'],
    notes: ['Standard tabs support arrow keys, Home, and End.', 'The fold follows the selected direction.'],
  },
  {
    id: 'tide-progress',
    autoplay: true,
    title: 'Tide Progress',
    en: 'Tide Progress',
    type: 'Progress',
    summary: 'A spring moves the water level toward the target. The percentage changes contrast where it crosses the waterline.',
    tags: ['Progress', 'progress', 'liquid', 'canvas'],
    notes: ['Drawing pauses offscreen and when gallery motion is paused.', 'Reduced motion shows the result immediately.'],
  },
];

// 第二批原创：表单控件（inputs.html）与操作反馈（actions.html）。
const originalInputs = [
  ['stroke-checklist', 'Stroke Checklist', 'Stroke Checklist', 'Checkbox', 'The checkmark draws itself and a line strikes through the task from left to right.', ['Checkbox', 'checkbox', 'to-do']],
  ['pebble-rating', 'Pebble Rating', 'Pebble Rating', 'Rating', 'Hover over five different pebbles to preview a rating. Select one and the pebbles bounce in sequence.', ['Rating', 'rating', 'radio']],
  ['notch-slider', 'Notch Slider', 'Notch Slider', 'Slider', 'Drag the thumb between XS and XL. It widens during the drag and lifts the active size label.', ['Slider', 'range', 'sizes']],
  ['strength-meter', 'Strength Meter', 'Strength Meter', 'Input', 'Four segments fill and change color. The eye blinks when you toggle password visibility.', ['password', 'Input', 'strength']],
  ['chip-input', 'Chip Input', 'Chip Input', 'Input', 'Press Enter to add a tag or Backspace to remove the last one. The field shakes on a duplicate.', ['tags', 'tags', 'Input']],
  ['plan-picker', 'Plan Picker', 'Plan Picker', 'Radio cards', 'The selection outline slides between cards and compresses slightly on arrival.', ['radio', 'Card', 'pricing']],
].map(([id, title, en, type, summary, tags]) => ({id, title, en, type, summary, tags, page: 'inputs'}));

const originalActions = [
  ['copy-morph', 'Copy Button', 'Copy Button', 'Button', 'The copy icon becomes a checkmark, and the label rolls up to show “Copied.”', ['copy', 'Button', 'clipboard']],
  ['like-burst', 'Like Burst', 'Like Burst', 'Button', 'A heart squashes and rebounds, sending out a ring and sparks as the count rolls.', ['like', 'favorite', 'count']],
  ['paper-plane', 'Paper Plane Send', 'Paper Plane Send', 'Button', 'A paper plane pulls back before taking off. The label reads “Sent,” then the plane returns from the left.', ['send', 'Button', 'paper plane']],
  ['download-ring', 'Download Ring', 'Download Ring', 'Button', 'The button becomes a progress ring and then a checkmark. Press again during the download to cancel.', ['download', 'Progress', 'Button']],
  ['code-shake', 'Code Shake', 'Code Shake', 'Input', 'A four-digit verification input advances automatically and supports paste. Wrong codes shake and clear, while the right code lights up each field.', ['verification code', 'OTP', 'Input']],
  ['bell-toggle', 'Bell Toggle', 'Bell Toggle', 'Switch', 'The bell swings and its badge pops in. A slash crosses the bell when turned off.', ['Notification', 'Switch', 'bell']],
].map(([id, title, en, type, summary, tags]) => ({id, title, en, type, summary, tags, page: 'actions'}));

// 第三批原创：没有文字的图形交互（visual.html）。
const originalVisuals = [
  ['magnet-grid', 'Magnet Grid', 'Magnet Grid', 'Pointer effect', 'Forty dots pull toward the pointer, growing and brightening as it nears. They spring back when it leaves.', ['dot grid', 'pointer', 'magnetic']],
  ['jelly-pad', 'Jelly Cube', 'Jelly Cube', 'Drag', 'Drag the cube to stretch it in the direction of motion. Release and it springs back to the center.', ['jelly', 'drag', 'spring']],
  ['hue-orbit', 'Hue Orbit', 'Hue Orbit', 'Color picker', 'Drag around the wheel to pick a hue. The selected dot grows and the center swatch changes color.', ['color', 'color picker', 'ring'], 'color'],
  ['merge-drops', 'Merge Drops', 'Merge Drops', 'Drag', 'Drag the small drop into the large one to merge them, then release to pull them apart and spring back.', ['droplet', 'gooey', 'merge']],
  ['pull-cord', 'Pull Cord Lamp', 'Pull Cord Lamp', 'Switch', 'Pull the cord to toggle the lamp. The cord springs back and the shade casts a warm beam.', ['Switch', 'lamp', 'pull cord'], 'color'],
  ['flip-coin', 'Flip Coin', 'Flip Coin', 'Button', 'The coin flips and lands on the sun or moon side. Its shadow scales with its height.', ['coin', 'flip', 'random'], 'color'],
  ['ripple-pad', 'Ripple Pad', 'Ripple Pad', 'Pointer effect', 'Press to send out three ripples. Hold longer for a larger drop and wider ripples.', ['ripple', 'hold', 'water']],
  ['bloom-toggle', 'Bloom Toggle', 'Bloom Toggle', 'Switch', 'Six petals open in sequence and light up the center. Press again to close the bloom.', ['Switch', 'flower', 'petals']],
].map(([id, title, en, type, summary, tags, page = 'visual']) => ({id, title, en, type, summary, tags, page, ...(page === 'color' && {vivid: true})}));

// 第四批原创：单色微交互（motion.html）。卡片排布与过渡类型参考 amicro（MIT），代码与造型由本项目独立完成。
const amicro = {
  name: 'amicro',
  url: 'https://github.com/Subhan-code/Amicro--Micro-transitions-',
  note: 'Inspired by the card layouts and interaction types. Design and implementation by UI Moments.',
};
const originalMotion = [
  ['card-fan', 'Card Fan', 'Card Fan', 'Card', 'Five cards fan out along an arc on hover or press.', ['Card', 'fan', 'expand'], amicro],
  ['depth-stack', 'Depth Stack', 'Depth Stack', 'Card', 'Press to sink the front card and slide it back into the stack.', ['Card', 'stack', 'depth'], amicro],
  ['cover-flow', 'Cover Flow', 'Cover Flow', 'Carousel', 'Side cards tilt in perspective while the center card faces forward. Press a card or use the arrow keys to browse.', ['Carousel', '3D', 'perspective'], amicro],
  ['tilt-card', 'Tilt Card', 'Tilt Card', 'Card', 'The card tilts toward the pointer and moves its highlight, then springs back when the pointer leaves.', ['Card', 'tilt', 'highlight'], amicro],
  ['magnetic-button', 'Magnetic Button', 'Magnetic Button', 'Button', 'The button is drawn toward the pointer, with the arrow traveling a little farther.', ['Button', 'magnetic', 'pointer'], amicro],
  ['text-reveal', 'Text Reveal', 'Text Reveal', 'Text', 'Hover to flip the letters upward from left to right and reveal a new line.', ['Text', 'flip', 'hover'], amicro],
  ['menu-morph', 'Menu Morph', 'Menu Morph', 'Icon', 'Three bars fold into a close icon and back again.', ['Menu', 'Icon', 'morph']],
  ['stagger-rows', 'Stagger Rows', 'Stagger Rows', 'List', 'Four rows rise and fade in one by one. Press to replay.', ['List', 'entrance', 'stagger'], amicro],
].map(([id, title, en, type, summary, tags, credit]) => ({id, title, en, type, summary, tags, page: 'motion', ...(credit && {credit})}));

// 第五批原创：手势与物理（gestures.html）。单色、无文字。
const originalGestures = [
  ['swipe-confirm', 'Swipe to Confirm', 'Swipe to Confirm', 'Slider', 'Drag the thumb to the end to confirm. Release early and it springs back; a flashing arrow shows which way to go.', ['swipe', 'confirm', 'drag'], true],
  ['pull-refresh', 'Pull to Refresh', 'Pull to Refresh', 'List', 'Pull down to draw the progress ring. Release past the threshold to refresh and drop in a new row.', ['pull', 'refresh', 'List']],
  ['elastic-string', 'Elastic String', 'Elastic String', 'Drag', 'Pull the string from any point and watch its vibration gradually settle.', ['string', 'spring', 'vibration']],
  ['domino-row', 'Domino Row', 'Domino Row', 'Button', 'Seven dominoes fall in sequence. Press again and they stand up in reverse order.', ['domino', 'chain', 'stagger']],
  ['rocker-switch', 'Rocker Switch', 'Rocker Switch', 'Switch', 'A wall-style rocker tilts in perspective, darkening the pressed side.', ['Switch', '3D', 'rocker']],
  ['scrub-wave', 'Scrub Wave', 'Scrub Wave', 'Slider', 'Waveform bars fill as the playhead passes during playback or dragging.', ['audio', 'waveform', 'Progress']],
  ['snap-grid', 'Snap Grid', 'Snap Grid', 'Drag', 'Drag the tile and release to snap into the nearest cell. Arrow keys move it one cell at a time.', ['grid', 'snap', 'drag']],
  ['radial-menu', 'Radial Menu', 'Radial Menu', 'Menu', 'Press the plus to fan out four actions along an arc. The plus rotates into a close icon.', ['Menu', 'arc', 'expand']],
  ['step-track', 'Step Track', 'Step Track', 'Progress', 'The track extends and the next node bounces as you advance.', ['steps', 'Progress', 'onboarding']],
  ['breath-orb', 'Breath Orb', 'Breath Orb', 'Rhythm', 'The orb follows a four-second inhale and exhale, with an outer ring slightly behind. Press to pause.', ['breathing', 'Rhythm', 'meditation'], true],
].map(([id, title, en, type, summary, tags, autoplay]) => ({id, title, en, type, summary, tags, page: 'gestures', autoplay}));

// 第六批：Elastic（elastic.html）。参考 @yui540 弹性 UI 的视觉语言（浅灰底板、粗圆角近黑控件、压缩回弹），
// 控件种类、造型与代码均为本项目独立设计，未复刻原视频中的控件。
const yuiStyle = {
  name: '@yui540',
  url: 'https://x.com/yui540/status/2120825584947487170',
  note: 'Inspired by the pale surfaces, rounded near-black controls, and spring motion. The controls, visuals, and code are by UI Moments.',
};
const elasticSet = [
  ['stretch-toggle', 'Stretch Toggle', 'Stretch Toggle', 'Switch', 'The thumb stretches as you hold it, then springs to the opposite end when released.', ['Switch', 'stretch', 'elastic']],
  ['worm-dots', 'Worm Dots', 'Worm Dots', 'Pagination', 'The indicator leads with its front edge, then pulls its tail into place.', ['Pagination', 'indicator', 'worm']],
  ['rubber-search', 'Rubber Search', 'Rubber Search', 'Input', 'The round button stretches into a search field. Escape or clearing the field brings it back.', ['search', 'expand', 'Input']],
  ['gooey-tabbar', 'Gooey Tab Bar', 'Gooey Tab Bar', 'Tab bar', 'The selected background stretches toward the next tab and rebounds as its icon hops.', ['Tab bar', 'navigation', 'elastic']],
  ['squash-play', 'Squash Play Key', 'Squash Play Key', 'Button', 'The keycap sinks and squashes, and the play icon morphs into pause.', ['play', 'keycap', 'Button']],
  ['cart-badge', 'Cart Badge', 'Cart Badge', 'Button', 'Press plus to drop a dot into the bag along an arc. The bag squashes and the count pops.', ['cart', 'badge', 'count']],
  ['elastic-accordion', 'Elastic Accordion', 'Elastic Accordion', 'Accordion', 'The panel stretches before settling as it expands, and the arrow flips.', ['collapse', 'Card', 'expand']],
  ['bulge-volume', 'Bulge Volume', 'Bulge Volume', 'Slider', 'The top of the fill bulges as you drag. The speaker waves follow the volume.', ['volume', 'vertical slider', 'drag']],
].map(([id, title, en, type, summary, tags]) => ({id, title, en, type, summary, tags, page: 'elastic', credit: yuiStyle}));

const originalControls = [
  ...originalCore.map(work => ({...work, page: 'index'})),
  ...originalVisuals,
  ...originalMotion,
  ...originalGestures,
  ...elasticSet,
  ...originalInputs,
  ...originalActions,
].map(({page, ...work}) => ({
  ...work,
  tags: [...work.tags, work.credit ? 'Independent implementation' : 'Original controls'],
  demo: `gallery/originals/${page}.html#${work.id}`,
  source: 'gallery/originals',
  live: true,
  original: !work.credit,
}));

window.WORKS = [
  ...originalControls,
  ...elasticControls,
  {
    id: 'roomlight',
    title: 'Roomlight',
    en: 'Roomlight',
    type: 'Lighting',
    previewSize: 'large',
    summary: 'Relight a coastal scene with four glass controls. Drag the active tile or use the dimmer to adjust its light.',
    tags: ['Lighting', 'glass', 'refraction', 'slider', 'WebGL'],
    demo: 'gallery/roomlight/index.html',
    source: 'gallery/roomlight',
    multiFile: true,
    live: true,
    vivid: true,
    credit: {
      name: 'Sean Galt',
      url: 'https://x.com/seanaiux/status/2123079833278423065',
      note: 'Inspired by Glass Scenes. The layout, coastal image, shader, and controls were made for UI Moments.',
    },
    notes: ['Each scene keeps its own brightness.', 'The shader bends and separates the colors along the glass edge. An animated light tint follows scene changes.', 'Use Up and Down to move between scenes, and Left and Right to dim the active scene.'],
  },
  {
    id: 'prism-tuner',
    title: 'Prism Tuner',
    en: 'Prism Tuner',
    type: 'Slider',
    previewSize: 'large',
    summary: 'Drag a glass lens across an optical bench to sweep the wavelength. The beam fans out as the lens settles.',
    tags: ['Slider', 'color', 'glass', 'spectrum', 'canvas', 'drag'],
    demo: 'gallery/prism-tuner/index.html',
    source: 'gallery/prism-tuner',
    multiFile: true,
    live: true,
    vivid: true,
    original: true,
    notes: ['Drag the lens or choose a wavelength preset.', 'The slider supports arrow keys, Home, and End.', 'The beam is a stylized visualization of visible light.'],
  },
  {
    id: 'quiet-hours',
    title: 'Quiet Hours',
    en: 'Quiet Hours',
    type: 'Dashboard',
    previewSize: 'large',
    summary: 'Explore sample energy and sleep charts, start a focus timer with ambient rain, and see completed sessions on your focus trail.',
    tags: ['Dashboard', 'focus', 'timer', 'sleep', 'audio', 'Independent implementation'],
    demo: 'gallery/quiet-hours/index.html',
    source: 'gallery/quiet-hours',
    live: true,
    credit: {
      name: 'Sean Galt',
      url: 'https://x.com/seanaiux/status/2122778549937422352',
      note: 'Inspired by the task dashboard and interaction flow. The interface, charts, code, and ambient audio are by UI Moments.',
    },
    notes: ['The energy and sleep data are illustrative.', 'Choose 25, 45, or 5 minutes. The browser synthesizes the rain audio.', 'Focus trail records completed sessions in this browser. Breaks appear on the trail and are excluded from focused minutes.'],
  },
  {
    id: 'day-night-toggle',
    autoplay: true,
    title: 'Day / Night Toggle',
    en: 'Day / Night Toggle',
    summary: 'Pixels spiral from the sun into the moon as a highlight travels around the thumb. Drag to stop anywhere in between.',
    tags: ['Switch', 'drag', 'canvas'],
    demo: 'gallery/day-night-toggle/index.html',
    video: 'gallery/day-night-toggle/card.mp4',
    full: 'gallery/day-night-toggle/preview.mp4',
    poster: 'gallery/day-night-toggle/poster.jpg',
    source: 'gallery/day-night-toggle',
    credit: { name: '@kaolti', url: 'https://x.com/kaolti/status/2119151022014894260' },
    notes: [
      'Paired pixels morph along spiral paths.',
      'Dragging holds the icon, rim light, and background at the intermediate state.',
      'Faster movement leaves a longer light trail.',
      'The thumb squashes, stretches, and springs into place with a ripple of light.',
      'Supports keyboard input, system color scheme, and reduced motion.',
    ],
    featured: true,
    vivid: true,
  },
];
