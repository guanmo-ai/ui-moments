const groups = {
  Rings: '90-ring 90-ring-with-bg 180-ring 180-ring-with-bg 270-ring 270-ring-with-bg eclipse eclipse-half ring-resize pulse-ring pulse-rings-2 pulse-rings-3 pulse-rings-multiple',
  Dots: '3-dots-bounce 3-dots-fade 3-dots-move 3-dots-rotate 3-dots-scale 3-dots-scale-middle 6-dots-rotate 6-dots-scale 6-dots-scale-middle 8-dots-rotate 12-dots-scale-rotate bouncing-ball dot-revolve gooey-balls-1 gooey-balls-2 pulse pulse-2 pulse-3 pulse-multiple',
  Lines: 'bars-fade bars-rotate-fade bars-scale bars-scale-fade bars-scale-middle',
  Geometry: 'blocks-scale blocks-shuffle-2 blocks-shuffle-3 blocks-wave',
  Icons: 'clock tadpole wifi wifi-fade wind-toy',
};

const descriptions = {
  'gooey-balls-1': 'Two balls stretch and merge as they meet.',
  'gooey-balls-2': 'Two balls move apart along a track and merge again.',
  'wind-toy': 'Pinwheel blades spin around the center.',
  'tadpole': 'A dot circles with a curved tail.',
  'wifi': 'Wi-Fi bars light up from the inside out.',
  'wifi-fade': 'Wi-Fi bars fade in and out from the inside out.',
  'clock': 'Clock hands turn continuously around the center.',
};

const groupDescriptions = {
  Rings: 'A looping loader built from arcs or concentric rings.',
  Dots: 'A looping loader built from dots.',
  Lines: 'A looping loader built from bars.',
  Geometry: 'A looping loader built from blocks.',
};

const origin = {
  name: 'SVG Spinners',
  author: 'Utkarsh Verma',
  license: 'MIT',
  licensePath: 'gallery/svg-spinners/vendor/svg-spinners/LICENSE',
  repository: 'https://github.com/n3r4zzurr0/svg-spinners',
};

export const svgSpinners = Object.entries(groups).flatMap(([group, slugs]) =>
  slugs.split(' ').map(slug => ({
    key: `svg-spinner-${slug}`,
    name: slug.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' ').replace('Wifi', 'Wi-Fi'),
    group,
    description: descriptions[slug] || groupDescriptions[group],
    provider: 'svg-spinners',
    slug,
    defaults: {size: 58, color: '#f5f5f7'},
    origin,
  })),
);
