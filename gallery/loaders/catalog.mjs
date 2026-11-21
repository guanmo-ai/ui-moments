// LDRS 1.1.9 原始默认参数；额外维护分类和说明。
export const loaders=[
  {
    "key": "ring",
    "name": "Ring",
    "group": "Rings",
    "description": "An arc sweeps around the ring, growing and shrinking as it turns.",
    "tag": "l-ring",
    "react": "Ring",
    "defaults": {
      "size": 40.0,
      "color": "black",
      "stroke": 5.0,
      "speed": 2.0,
      "bg-opacity": 0.0
    }
  },
  {
    "key": "ring2",
    "name": "Ring 2",
    "group": "Rings",
    "description": "A short arc spins along a muted track.",
    "tag": "l-ring2",
    "react": "Ring2",
    "defaults": {
      "size": 40.0,
      "color": "black",
      "stroke": 5.0,
      "stroke-length": 0.25,
      "speed": 0.8,
      "bg-opacity": 0.1
    }
  },
  {
    "key": "tailspin",
    "name": "Tailspin",
    "group": "Rings",
    "description": "A ring spins with a fading tail.",
    "tag": "l-tailspin",
    "react": "Tailspin",
    "defaults": {
      "size": 40.0,
      "color": "black",
      "speed": 0.9,
      "stroke": 5.0
    }
  },
  {
    "key": "lineSpinner",
    "name": "Line Spinner",
    "group": "Rings",
    "description": "Short ticks light up in sequence around a circle.",
    "tag": "l-line-spinner",
    "react": "LineSpinner",
    "defaults": {
      "size": 40.0,
      "color": "black",
      "speed": 1.0,
      "stroke": 3.0
    }
  },
  {
    "key": "squircle",
    "name": "Squircle",
    "group": "Geometry",
    "description": "A line flows around a rounded square.",
    "tag": "l-squircle",
    "react": "Squircle",
    "defaults": {
      "size": 37.0,
      "color": "black",
      "stroke": 5.0,
      "stroke-length": 0.15,
      "speed": 0.9,
      "bg-opacity": 0.1
    }
  },
  {
    "key": "square",
    "name": "Square",
    "group": "Geometry",
    "description": "A short line travels around the edges of a square.",
    "tag": "l-square",
    "react": "Square",
    "defaults": {
      "size": 35.0,
      "color": "black",
      "stroke": 5.0,
      "stroke-length": 0.25,
      "speed": 1.2,
      "bg-opacity": 0.1
    }
  },
  {
    "key": "reuleaux",
    "name": "Reuleaux",
    "group": "Geometry",
    "description": "A line traces a rounded triangular path.",
    "tag": "l-reuleaux",
    "react": "Reuleaux",
    "defaults": {
      "size": 37.0,
      "color": "black",
      "stroke": 5.0,
      "speed": 0.9,
      "stroke-length": 0.15,
      "bg-opacity": 0.1
    }
  },
  {
    "key": "tailChase",
    "name": "Tail Chase",
    "group": "Dots",
    "description": "Three dots chase one another at changing speeds.",
    "tag": "l-tail-chase",
    "react": "TailChase",
    "defaults": {
      "size": 40.0,
      "color": "black",
      "speed": 1.5
    }
  },
  {
    "key": "dotSpinner",
    "name": "Dot Spinner",
    "group": "Dots",
    "description": "Dots form a spinning halo.",
    "tag": "l-dot-spinner",
    "react": "DotSpinner",
    "defaults": {
      "size": 40.0,
      "color": "black",
      "speed": 0.9
    }
  },
  {
    "key": "spiral",
    "name": "Spiral",
    "group": "Dots",
    "description": "Dots of different sizes flow along a spiral.",
    "tag": "l-spiral",
    "react": "Spiral",
    "defaults": {
      "size": 40.0,
      "color": "black",
      "speed": 0.9
    }
  },
  {
    "key": "bouncy",
    "name": "Bouncy",
    "group": "Dots",
    "description": "Three dots take turns bouncing and stretching.",
    "tag": "l-bouncy",
    "react": "Bouncy",
    "defaults": {
      "size": 45.0,
      "color": "black",
      "speed": 1.75
    }
  },
  {
    "key": "treadmill",
    "name": "Treadmill",
    "group": "Dots",
    "description": "Dots scroll past one another like a treadmill.",
    "tag": "l-treadmill",
    "react": "Treadmill",
    "defaults": {
      "size": 70.0,
      "color": "black",
      "speed": 1.25
    }
  },
  {
    "key": "bouncyArc",
    "name": "Bouncy Arc",
    "group": "Dots",
    "description": "Dots rise and fall along an arc.",
    "tag": "l-bouncy-arc",
    "react": "BouncyArc",
    "defaults": {
      "size": 70.0,
      "color": "black",
      "speed": 1.65
    }
  },
  {
    "key": "waveform",
    "name": "Waveform",
    "group": "Lines",
    "description": "Vertical lines rise and fall like a waveform.",
    "tag": "l-waveform",
    "react": "Waveform",
    "defaults": {
      "size": 35.0,
      "color": "black",
      "speed": 1.0,
      "stroke": 3.5
    }
  },
  {
    "key": "hatch",
    "name": "Hatch",
    "group": "Lines",
    "description": "Three lines flip between horizontal and vertical.",
    "tag": "l-hatch",
    "react": "Hatch",
    "defaults": {
      "size": 28.0,
      "color": "black",
      "speed": 3.5,
      "stroke": 4.0
    }
  },
  {
    "key": "hourglass",
    "name": "Hourglass",
    "group": "Geometry",
    "description": "Two shapes take turns shrinking like a turning hourglass.",
    "tag": "l-hourglass",
    "react": "Hourglass",
    "defaults": {
      "size": 40.0,
      "color": "black",
      "speed": 1.75,
      "bg-opacity": 0.1
    }
  },
  {
    "key": "zoomies",
    "name": "Zoomies",
    "group": "Lines",
    "description": "A point of light darts back and forth along a line.",
    "tag": "l-zoomies",
    "react": "Zoomies",
    "defaults": {
      "size": 80.0,
      "color": "black",
      "speed": 1.4,
      "stroke": 5.0,
      "bg-opacity": 0.1
    }
  },
  {
    "key": "lineWobble",
    "name": "Line Wobble",
    "group": "Lines",
    "description": "A segment extends and contracts along a track.",
    "tag": "l-line-wobble",
    "react": "LineWobble",
    "defaults": {
      "size": 80.0,
      "color": "black",
      "speed": 1.75,
      "stroke": 5.0,
      "bg-opacity": 0.1
    }
  },
  {
    "key": "infinity",
    "name": "Infinity",
    "group": "Rings",
    "description": "A fine line traces an infinity symbol.",
    "tag": "l-infinity",
    "react": "Infinity",
    "defaults": {
      "size": 55.0,
      "color": "black",
      "speed": 1.3,
      "stroke": 4.0,
      "stroke-length": 0.15,
      "bg-opacity": 0.1
    }
  },
  {
    "key": "trefoil",
    "name": "Trefoil",
    "group": "Rings",
    "description": "A line flows around a three-lobed path.",
    "tag": "l-trefoil",
    "react": "Trefoil",
    "defaults": {
      "size": 40.0,
      "color": "black",
      "stroke": 4.0,
      "stroke-length": 0.15,
      "speed": 1.4,
      "bg-opacity": 0.1
    }
  },
  {
    "key": "cardio",
    "name": "Cardio",
    "group": "Lines",
    "description": "A zigzag pulses like a heartbeat.",
    "tag": "l-cardio",
    "react": "Cardio",
    "defaults": {
      "size": 50.0,
      "color": "black",
      "speed": 1.5,
      "stroke": 4.0,
      "bg-opacity": 0.1
    }
  },
  {
    "key": "helix",
    "name": "Helix",
    "group": "Dots",
    "description": "Dots rise and fall in a double helix.",
    "tag": "l-helix",
    "react": "Helix",
    "defaults": {
      "size": 45.0,
      "color": "black",
      "speed": 2.5
    }
  },
  {
    "key": "grid",
    "name": "Grid",
    "group": "Dots",
    "description": "A grid of dots ripples outward from the center.",
    "tag": "l-grid",
    "react": "Grid",
    "defaults": {
      "size": 60.0,
      "color": "black",
      "speed": 1.5
    }
  },
  {
    "key": "quantum",
    "name": "Quantum",
    "group": "Dots",
    "description": "Dots pass one another, gather, and scatter.",
    "tag": "l-quantum",
    "react": "Quantum",
    "defaults": {
      "size": 45.0,
      "color": "black",
      "speed": 1.75
    }
  },
  {
    "key": "wobble",
    "name": "Wobble",
    "group": "Dots",
    "description": "Dots sway, converge, and repeat.",
    "tag": "l-wobble",
    "react": "Wobble",
    "defaults": {
      "size": 45.0,
      "color": "black",
      "speed": 0.9
    }
  },
  {
    "key": "orbit",
    "name": "Orbit",
    "group": "Dots",
    "description": "Dots orbit one another along a track.",
    "tag": "l-orbit",
    "react": "Orbit",
    "defaults": {
      "size": 35.0,
      "color": "black",
      "speed": 1.5
    }
  },
  {
    "key": "chaoticOrbit",
    "name": "Chaotic Orbit",
    "group": "Dots",
    "description": "Dots race around a track at different speeds.",
    "tag": "l-chaotic-orbit",
    "react": "ChaoticOrbit",
    "defaults": {
      "size": 35.0,
      "color": "black",
      "speed": 1.5
    }
  },
  {
    "key": "superballs",
    "name": "Superballs",
    "group": "Dots",
    "description": "Two dots move apart, come together, and swap places.",
    "tag": "l-superballs",
    "react": "Superballs",
    "defaults": {
      "size": 40.0,
      "color": "black",
      "speed": 1.4
    }
  },
  {
    "key": "trio",
    "name": "Trio",
    "group": "Dots",
    "description": "Three dots circle a shared center.",
    "tag": "l-trio",
    "react": "Trio",
    "defaults": {
      "size": 40.0,
      "color": "black",
      "speed": 1.3
    }
  },
  {
    "key": "momentum",
    "name": "Momentum",
    "group": "Dots",
    "description": "Dots pass momentum in a staggered rhythm.",
    "tag": "l-momentum",
    "react": "Momentum",
    "defaults": {
      "size": 40.0,
      "color": "black",
      "speed": 1.1
    }
  },
  {
    "key": "dotWave",
    "name": "Dot Wave",
    "group": "Dots",
    "description": "Dots rise and fall in a horizontal wave.",
    "tag": "l-dot-wave",
    "react": "DotWave",
    "defaults": {
      "size": 47.0,
      "color": "black",
      "speed": 1.0
    }
  },
  {
    "key": "leapfrog",
    "name": "Leapfrog",
    "group": "Dots",
    "description": "Dots take turns leaping over one another.",
    "tag": "l-leapfrog",
    "react": "Leapfrog",
    "defaults": {
      "size": 40.0,
      "color": "black",
      "speed": 2.5
    }
  },
  {
    "key": "newtonsCradle",
    "name": "Newton's Cradle",
    "group": "Dots",
    "description": "The outer balls swing like a Newton's cradle.",
    "tag": "l-newtons-cradle",
    "react": "NewtonsCradle",
    "defaults": {
      "size": 78.0,
      "color": "black",
      "speed": 1.4
    }
  },
  {
    "key": "dotStream",
    "name": "Dot Stream",
    "group": "Dots",
    "description": "Dots flow steadily along a straight line.",
    "tag": "l-dot-stream",
    "react": "DotStream",
    "defaults": {
      "size": 60.0,
      "color": "black",
      "speed": 2.5
    }
  },
  {
    "key": "dotPulse",
    "name": "Dot Pulse",
    "group": "Dots",
    "description": "Three dots brighten and grow in sequence.",
    "tag": "l-dot-pulse",
    "react": "DotPulse",
    "defaults": {
      "size": 43.0,
      "color": "black",
      "speed": 1.3
    }
  },
  {
    "key": "metronome",
    "name": "Metronome",
    "group": "Dots",
    "description": "Dots sway back and forth in a steady rhythm.",
    "tag": "l-metronome",
    "react": "Metronome",
    "defaults": {
      "size": 40.0,
      "color": "black",
      "speed": 1.6
    }
  },
  {
    "key": "jelly",
    "name": "Jelly",
    "group": "Geometry",
    "description": "A soft shape expands and contracts like jelly.",
    "tag": "l-jelly",
    "react": "Jelly",
    "defaults": {
      "size": 40.0,
      "color": "black",
      "speed": 0.9
    }
  },
  {
    "key": "jellyTriangle",
    "name": "Jelly Triangle",
    "group": "Geometry",
    "description": "Three dots stretch into a soft-edged triangle.",
    "tag": "l-jelly-triangle",
    "react": "JellyTriangle",
    "defaults": {
      "size": 30.0,
      "color": "black",
      "speed": 1.75
    }
  },
  {
    "key": "mirage",
    "name": "Mirage",
    "group": "Geometry",
    "description": "Soft shapes repeatedly stretch and merge.",
    "tag": "l-mirage",
    "react": "Mirage",
    "defaults": {
      "size": 60.0,
      "color": "black",
      "speed": 2.5
    }
  },
  {
    "key": "ping",
    "name": "Ping",
    "group": "Rings",
    "description": "A ripple spreads outward from the center.",
    "tag": "l-ping",
    "react": "Ping",
    "defaults": {
      "size": 45.0,
      "color": "black",
      "speed": 2.0
    }
  },
  {
    "key": "pulsar",
    "name": "Pulsar",
    "group": "Rings",
    "description": "A pulse expands from the center.",
    "tag": "l-pulsar",
    "react": "Pulsar",
    "defaults": {
      "size": 40.0,
      "color": "black",
      "speed": 1.75
    }
  },
  {
    "key": "ripples",
    "name": "Ripples",
    "group": "Rings",
    "description": "Several ripples spread outward at staggered intervals.",
    "tag": "l-ripples",
    "react": "Ripples",
    "defaults": {
      "size": 45.0,
      "color": "black",
      "speed": 2.0
    }
  },
  {
    "key": "miyagi",
    "name": "Miyagi",
    "group": "Lines",
    "description": "Thin lines fan out and draw together in sequence.",
    "tag": "l-miyagi",
    "react": "Miyagi",
    "defaults": {
      "size": 35.0,
      "color": "black",
      "speed": 0.9,
      "stroke": 3.5
    }
  },
  {
    "key": "pinwheel",
    "name": "Pinwheel",
    "group": "Lines",
    "description": "A pinwheel made of thin lines turns continuously.",
    "tag": "l-pinwheel",
    "react": "Pinwheel",
    "defaults": {
      "size": 35.0,
      "color": "black",
      "speed": 0.9,
      "stroke": 3.5
    }
  }
];

export const groups=[...new Set(loaders.map(item=>item.group))];
export function previewProps(item,color,theme){
  // 图鉴保持单色：原创动效也使用当前前景色，调色留给详情面板。
  if(item.original)return {...item.defaults,color};
  if(item.provider)return {...item.defaults,color};
  const wide=["lineWobble","zoomies","dotStream","waveform","treadmill","newtonsCradle","leapfrog"];
  return {...item.defaults,size:item.key==="hatch"?42:wide.includes(item.key)?100:68,color};
}
