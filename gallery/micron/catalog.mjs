const source = 'gallery/micron';
const repository = 'https://github.com/webkul/micron';
export const micronLicensePath = `${source}/vendor/micron/LICENSE`;

const effects = [
  ['jelly', 'Jelly', 'The button stretches sideways and springs back.'],
  ['bounce', 'Bounce', 'The button dips and bounces back up.'],
  ['squeeze', 'Squeeze', 'The button squashes horizontally and vertically in turn.'],
  ['pop', 'Pop', 'The button squashes and quickly pops back.'],
  ['shake', 'Shake', 'The button shakes from side to side and settles.'],
  ['fade', 'Fade', 'The button briefly fades before returning to full opacity.'],
  ['blink', 'Blink', 'The button pulses twice in quick succession.'],
  ['flicker', 'Flicker', 'The button skews from side to side and settles.'],
  ['groove', 'Groove', 'The button alternates between tilting and rotating.'],
  ['jerk', 'Jerk', 'The button shifts and twists before returning to center.'],
  ['swing', 'Swing', 'The button swings like a pendulum.'],
  ['tada', 'Tada', 'The button shrinks, expands, and gives a quick celebratory wiggle.'],
];

export const micronWorks = effects.map(([effect, title, summary]) => ({
  id: `micron-${effect}`,
  title,
  en: effect,
  summary,
  category: 'feedback',
  type: 'Click effect',
  tags: ['Micron', 'Button', 'Click effect', 'Open-source integration'],
  demo: `${source}/index.html#${effect}`,
  source,
  credit: {
    name: 'Micron.js · Webkul',
    url: repository,
    licensePath: micronLicensePath,
    note: 'MIT-licensed effects with a button, themes, and replay behavior by UI Moments.',
  },
  sourceFiles: [`${source}/vendor/micron/dist/css/micron.css`],
}));

export function formatMicronDownload(page, effect, css, license) {
  return page
    .replace('<html lang="en">', `<html lang="en" data-effect="${effect}">`)
    .replace('<script src="../../assets/embed.js"></script>', '')
    .replace('<link rel="stylesheet" href="vendor/micron/dist/css/micron.css">', `<style>\n${css}\n</style>`)
    .replace('</body>', `<!--
Original work: Micron.js · Webkul
${repository}
Button, themes, and interaction by UI Moments.

${license.trim()}
-->
</body>`);
}
