import {escapeHtml as esc} from '../loaders/snippets.mjs';

const source='https://github.com/turbostarter/loading-ui';
const escapedScript=text=>text.replace(/<\/script/gi,'<\\/script');

export function createLoadingUIIntegration({runtime,license,notices,sources}){
  function html(item,props,background='#151517'){
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(item.name)} · UI Moments</title>
<style>body{margin:0;min-height:100svh;display:grid;place-items:center;background:${esc(background)}}</style></head><body>
<${item.tag} size="${Number(props.size)}" color="${esc(props.color)}" surface="${esc(background)}" role="status" aria-label="Loading"></${item.tag}>
<script>${escapedScript(runtime)}</script>
<!--
Original work: Loading UI · Bartosz Zagrodzki
${source}
Standalone page, theming, and sizing by UI Moments. Animations use the upstream implementation.

${notices.trim()}
--></body></html>\n`;
  }
  function react(item,props,background='#ffffff'){
    const original=sources[item.slug];
    if(!original)throw new Error(`Missing upstream source: ${item.slug}`);
    const component=original.component.replaceAll('bg-muted','bg-[var(--muted)]').replace(/import \{ cn \} from "@\/lib\/utils";/g,'import { clsx, type ClassValue } from "clsx";\nimport { twMerge } from "tailwind-merge";\nconst cn = (...values: ClassValue[]) => twMerge(clsx(values));');
    const demo=original.demo.replace(/^import[^\n]+from "@\/registry\/components\/loading-ui\/[^\n]+;\s*/gm,'');
    const demoName=demo.match(/export function (\w+)/)[1];
    return `// Original work: Loading UI · Bartosz Zagrodzki\n// ${source}\n// Requires Tailwind CSS 4. Install: npm install react react-dom motion clsx tailwind-merge\n// Save as .tsx. The default export uses the current preview size and color. The original component is also exported.\n${component}\n\n${demo}\n\nexport default function LoadingIndicator() {\n  return <div role="status" aria-label="Loading" style={{'--background':${JSON.stringify(background)},'--mask-color':${JSON.stringify(background)},'--muted':${JSON.stringify(`color-mix(in srgb,${props.color} 35%,transparent)`)},color:${JSON.stringify(props.color)},width:${Number(props.size)*1.5},height:${Number(props.size)},display:'grid',placeItems:'center'} as React.CSSProperties}><div style={{transform:'scale(${Number(props.size)/96})'}}><${demoName}/></div></div>;\n}\n\n/*\nOriginal work: Loading UI · Bartosz Zagrodzki\n${source}\nCurrent preview settings: ${JSON.stringify(props)}\nTiming follows the original. UI Moments supplies the helpers, sizing wrapper, color, and background. bg-muted uses an equivalent CSS variable utility.\n\n${license.trim()}\n*/\n`;
  }
  function prompt(item,props,background){
    return `Integrate the ${item.name} loader in the current workspace.\n\nOriginal work: Loading UI · Bartosz Zagrodzki\nUpstream repository: ${source}\nPreview: https://guanmo-ai.github.io/ui-moments/#${item.key}\nGoal: ${item.description}\nCurrent settings: ${JSON.stringify(props)}. Background: ${background}\n\nUse the project stack. The React source and original demo below require Tailwind CSS 4. For HTML projects, download the self-contained HTML from the preview. Preserve the original attribution and full license and respect prefers-reduced-motion. Verify the animation, sizing, and behavior on light and dark backgrounds.\n\nReact source and usage\n\`\`\`tsx\n${react(item,props,background)}\`\`\``;
  }
  return {license,html,react,prompt,htmlHelp:'Save as an .html file and open it offline in a browser.',reactHelp:'Includes the upstream React component and example usage. Requires Tailwind CSS 4.'};
}
