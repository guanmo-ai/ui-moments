const sun='<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="10" cy="10" r="3.5"/><path d="M10 1v2m0 14v2M1 10h2m14 0h2M3.6 3.6 5 5m10 10 1.4 1.4M3.6 16.4 5 15M15 5l1.4-1.4"/></svg>';
const moon='<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M16.5 12.2A7 7 0 0 1 7.8 3.5a7 7 0 1 0 8.7 8.7Z"/></svg>';

export function setupSite(){
  const root=document.documentElement,button=document.getElementById('theme'),header=document.getElementById('top');
  let theme=root.dataset.theme||'dark';try{theme=localStorage.getItem('ui-moments-theme')||theme;}catch{}
  root.dataset.theme=theme==='light'?'light':'dark';
  const paint=()=>{if(!button)return;const dark=root.dataset.theme!=='light';button.innerHTML=dark?sun:moon;button.setAttribute('aria-label',dark?'切换浅色模式':'切换深色模式');button.title=button.getAttribute('aria-label');};
  paint();
  button?.addEventListener('click',()=>{
    const previousForeground=foreground();
    root.dataset.theme=root.dataset.theme==='light'?'dark':'light';paint();
    try{localStorage.setItem('ui-moments-theme',root.dataset.theme);}catch{}
    root.dispatchEvent(new CustomEvent('ui-moments:theme',{detail:{theme:root.dataset.theme,previousForeground}}));
  });
  const scroll=()=>header?.classList.toggle('scrolled',scrollY>8);scroll();addEventListener('scroll',scroll,{passive:true});
  addEventListener('keydown',event=>{
    if(event.key!=='/'||event.metaKey||event.ctrlKey||event.altKey||document.querySelector('dialog[open]')||event.target.closest?.('input,textarea,[contenteditable]'))return;
    const search=document.getElementById('search')||document.getElementById('work-search');
    if(search){event.preventDefault();search.focus();}
  });
}

export const foreground=()=>getComputedStyle(document.documentElement).getPropertyValue('--c-fg').trim();
export const background=()=>getComputedStyle(document.documentElement).getPropertyValue('--c-bg').trim();
