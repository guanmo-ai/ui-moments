const reducedMotion = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-play-state: paused !important; } }';

export function escapeHtml(value){
  return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

export function htmlExample(item,props,markup,license,background='#151517'){
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(item.name)} · UI Moments</title>
<style>
body{margin:0;min-height:100svh;display:grid;place-items:center;background:${escapeHtml(background)}}
</style>
</head>
<body>
<div role="status" aria-label="正在加载">
  <div>
    <template shadowrootmode="open">
${markup}
<style>${reducedMotion}</style>
    </template>
  </div>
</div>
</body>
<!--
来源与许可：LDRS 1.1.9 · Griffin Johnston / UI Ball
https://github.com/GriffinJohnston/ldrs
独立页面由 UI Moments 生成，动效保留原作实现。

${license.trim()}
-->
</html>
`;
}

export function reactExample(item,props,license){
  return `'use client';
// 安装：npm install ldrs@1.1.9
import { useEffect, useRef } from 'react';

const defaults = ${JSON.stringify(props,null,2)};

export default function LoadingIndicator(props = {}) {
  const host = useRef(null);
  const values = JSON.stringify(Object.keys(defaults).map(name =>
    [name, props[name] ?? defaults[name]]
  ));

  useEffect(() => {
    const container = host.current;
    let disposed = false;
    let indicator;

    // 在浏览器注册同一个 Web Component，便于在 React 和 Next.js 中复用。
    import('ldrs').then(({ ${item.key} }) => {
      if (disposed) return;
      ${item.key}.register('${item.tag}');
      indicator = document.createElement('${item.tag}');
      for (const [name, value] of JSON.parse(values)) {
        indicator.setAttribute(name, String(value));
      }
      container.append(indicator);

      const style = document.createElement('style');
      style.textContent = ${JSON.stringify(reducedMotion)};
      indicator.shadowRoot.append(style);
    });

    return () => {
      disposed = true;
      indicator?.remove();
    };
  }, [values]);

  return <div ref={host} role="status" aria-label="正在加载" />;
}

/*
来源与许可：LDRS 1.1.9 · Griffin Johnston / UI Ball
https://github.com/GriffinJohnston/ldrs

${license.trim()}
*/
`;
}
