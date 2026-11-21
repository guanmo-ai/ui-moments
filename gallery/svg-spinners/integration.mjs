import {escapeHtml as esc} from '../loaders/snippets.mjs';

const styles = `
  svg { display: block; width: var(--size); height: var(--size); fill: currentColor; }
  svg[stroke] { stroke: currentColor; }
  :host([data-paused]) svg * { animation-play-state: paused !important; }
  @media (prefers-reduced-motion: reduce) {
    svg * { animation: none !important; }
    svg [opacity="0"] { opacity: 1; }
  }
`;

export function createSvgSpinnerIntegration({license, sources}) {
  const markup = item => `<style>${styles}</style>${sources[item.slug]}`;
  const credit = item => `Original work: ${item.origin.name} · ${item.origin.author}
${item.origin.repository}/tree/abfa05c49acf005b8b1e0ef8eb25a67a7057eb20
Theming, sizing, and standalone export by UI Moments.

${license.trim()}`;

  function preview(item, props) {
    const element = document.createElement('span');
    element.style.setProperty('--size', `${props.size}px`);
    element.style.color = props.color;
    element.attachShadow({mode: 'open'}).innerHTML = markup(item);
    element.setPlaying = playing => element.toggleAttribute('data-paused', !playing);
    return element;
  }

  function html(item, props, background) {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(item.name)} · UI Moments</title>
<style>body{margin:0;min-height:100svh;display:grid;place-items:center;background:${esc(background)}}</style>
</head>
<body>
<div role="status" aria-label="Loading" style="color:${esc(props.color)};--size:${Number(props.size)}px">
  <template shadowrootmode="open">
${markup(item)}
  </template>
</div>
<!--
${credit(item)}
-->
</body>
</html>
`;
  }

  function react(item, props) {
    return `'use client';
import { useEffect, useRef, type CSSProperties } from 'react';

const markup = ${JSON.stringify(markup(item))};

export default function LoadingIndicator({
  size = ${Number(props.size)},
  color = ${JSON.stringify(props.color)},
}: {size?: number; color?: string} = {}) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const shadow = element.shadowRoot ?? element.attachShadow({mode: 'open'});
    shadow.innerHTML = markup;
  }, []);

  return <div ref={host} role="status" aria-label="Loading"
    style={{color, '--size': size + 'px'} as CSSProperties} />;
}

/*
${credit(item)}
*/
`;
  }

  function prompt(item, props, background) {
    return `Integrate the ${item.name} loader in the current project.

Original work: ${item.origin.name} · ${item.origin.author} · MIT
Preview: https://guanmo-ai.github.io/ui-moments/#${item.key}
Effect: ${item.description}
Current settings: ${props.size}px, ${props.color}.

Preserve the original SVG animation, copyright notice, and full license. Use the HTML example below or select React code in the preview. Verify rendering, sizing, color, and reduced motion.

\`\`\`html
${html(item, props, background).trim()}
\`\`\``;
  }

  return {
    license, preview, html, react, prompt,
    htmlHelp: 'Save as an .html file and open it offline in a browser.',
    reactHelp: 'Save as .tsx and import into a React project.',
  };
}
