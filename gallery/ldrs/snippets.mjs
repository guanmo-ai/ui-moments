export function escapeHtml(value){
  return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

export function htmlExample(item,props,markup,license,background='#151517'){
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(item.name)} · LDRS</title>
<!--
LDRS 1.1.9 · Griffin Johnston / UI Ball
https://github.com/GriffinJohnston/ldrs
独立页面由 UI Moments 生成，动效保留原作实现。

${license.trim()}
-->
<style>
body{margin:0;min-height:100svh;display:grid;place-items:center;background:${escapeHtml(background)}}
</style>
</head>
<body>
<div role="status" aria-label="正在加载">
  <div>
    <template shadowrootmode="open">
${markup}
<style>@media(prefers-reduced-motion:reduce){*{animation-play-state:paused!important}}</style>
    </template>
  </div>
</div>
</body>
</html>
`;
}

export function reactExample(item,props,license){
  const attributes=Object.entries(props).map(([name,value])=>{
    const attr=name.replaceAll('-','_');
    return `      ${attr}=${typeof value==='number'?`{${value}}`:JSON.stringify(value)}`;
  }).join('\n');
  return `/*
LDRS 1.1.9 · Griffin Johnston / UI Ball
https://github.com/GriffinJohnston/ldrs
安装：npm install ldrs@1.1.9

${license.trim()}
*/
import { ${item.react} } from 'ldrs/react';
import 'ldrs/react/${item.react}.css';

export default function LoadingIndicator() {
  return (
    <span role="status" aria-label="正在加载">
      <${item.react}
${attributes}
      />
    </span>
  );
}
`;
}
