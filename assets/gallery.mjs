import {setupSite,foreground} from './site.mjs';
import {buildCatalog,categories,matches} from './catalog.mjs';
import * as ldrs from '../gallery/loaders/vendor/ldrs/dist/index.js';
import {previewProps,groups} from '../gallery/loaders/catalog.mjs';
import {escapeHtml as esc} from '../gallery/loaders/snippets.mjs';
import {createLoaderEditor,createLoaderPreview} from '../gallery/loaders/editor.mjs';
import {componentPrompt,mountPrompt} from './prompt.mjs';
import {createLoadingUIIntegration} from '../gallery/loading-ui/integration.mjs';
import {createSvgSpinnerIntegration} from '../gallery/svg-spinners/integration.mjs';
import {formatMicronDownload,micronLicensePath} from '../gallery/micron/catalog.mjs';

setupSite();
const $=selector=>document.querySelector(selector),root=document.documentElement,grid=$('#ui-grid');
const componentDialog=$('#component-detail'),componentFrame=$('#component-frame');
const items=buildCatalog(window.WORKS||[]),byId=new Map(items.map(item=>[item.id,item]));
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
const search=$('#work-search');
search.value=new URLSearchParams(location.search).get('q')||'';
const density=$('#gallery-density'),columnChoices=[...density.querySelectorAll('input')];
const densityKey='ui-moments-gallery-columns';
try{
  const saved=localStorage.getItem(densityKey);
  const choice=columnChoices.find(input=>input.value===saved);
  if(choice)choice.checked=true;
}catch{}
grid.dataset.columns=columnChoices.find(input=>input.checked).value;
density.addEventListener('change',event=>{
  grid.dataset.columns=event.target.value;
  try{localStorage.setItem(densityKey,event.target.value);}catch{}
});

let playing=!reduced.matches,category='all',shape='all',component=null,componentTrigger=null;
const visible=new Set(),frames=new Map();
async function fetchText(path){
  const response=await fetch(path);
  if(!response.ok)throw new Error(`资源载入失败：${path}`);
  return response.text();
}
const [license,originalLicense,loadingLicense,loadingNotices,loadingRuntime,loadingSources,svgLicense,svgSources]=await Promise.all([
  fetchText('gallery/loaders/vendor/ldrs/LICENSE'),
  fetchText('LICENSE'),
  fetchText('gallery/loading-ui/vendor/loading-ui/LICENSE.md'),
  fetchText('gallery/loading-ui/dist/THIRD_PARTY_LICENSES.txt'),
  fetchText('gallery/loading-ui/dist/runtime.js'),
  fetchText('gallery/loading-ui/dist/sources.json'),
  fetchText('gallery/svg-spinners/vendor/svg-spinners/LICENSE'),
  fetchText('gallery/svg-spinners/dist/sources.json'),
  import('../gallery/loading-ui/dist/runtime.js'),
]).catch(error=>{$('#load-error').hidden=false;throw error;});
const providers={
  'loading-ui':createLoadingUIIntegration({license:loadingLicense,notices:loadingNotices,runtime:loadingRuntime,sources:JSON.parse(loadingSources)}),
  'svg-spinners':createSvgSpinnerIntegration({license:svgLicense,sources:JSON.parse(svgSources)}),
};
const editor=createLoaderEditor({license,originalLicense,providers,isPlaying:()=>playing});
function effect(item){
  const element=createLoaderPreview(item,previewProps(item,foreground(),root.dataset.theme),providers);
  element.className='ui-animation';
  return element;
}
function embedUrl(item){const url=new URL(item.demo,location.href);url.searchParams.set('embed','ui');url.searchParams.set('theme',root.dataset.theme);return url.href;}
for(const item of items){
  if(item.loader&&!item.loader.original&&!item.loader.provider)ldrs[item.loader.key].register(item.loader.tag);
  const element=document.createElement('article');element.className='ui-item';element.dataset.ui=item.id;
  if(item.loader)element.dataset.kind=item.loader.original?'original':'loader';
  let meta=item.type;
  if(item.loader)meta=item.loader.original?'原创加载动效':`${item.loader.origin?.name||'LDRS'} · 开源集成`;
  else if(item.credit?.licensePath===micronLicensePath)meta='Micron.js · 开源集成';
  else if(item.credit)meta=`参考后实现 · ${item.type}`;
  const caption=item.loader?.collection?`原创 · ${item.summary}`:meta+(item.shape?' · '+item.shape:'');
  element.innerHTML=`
    <div class="ui-stage" aria-label="${esc(item.title)}实时演示"></div>
    <div class="ui-caption">
      <div><h2>${esc(item.title)}</h2><p>${esc(caption)}</p></div>
      <button type="button" class="ui-expand" data-detail aria-label="放大 ${esc(item.title)}" title="放大预览" aria-haspopup="dialog">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M11 3h6v6m0-6-6 6m-2 8H3v-6m0 6 6-6"/></svg>
      </button>
    </div>`;
  if(item.loader)element.querySelector('.ui-stage').append(effect(item.loader));
  grid.append(element);
}
$('#categories').innerHTML=categories.filter(cat=>cat.id==='all'||items.some(item=>item.category===cat.id)).map(cat=>`<button type="button" data-category="${cat.id}">${esc(cat.name)}<span class="category-count">${cat.id==='all'?items.length:items.filter(item=>item.category===cat.id).length}</span></button>`).join('');
const shapes=[...new Set([...groups,...items.filter(item=>item.shape).map(item=>item.shape)])];
$('#shapes').innerHTML=[['all','全部形态'],...shapes.map(name=>[name,name])].map(([key,name])=>`<button type="button" data-shape="${key}">${name}</button>`).join('');
function mountFrame(element,item){
  if(frames.has(item.id))return;
  const frame=document.createElement('iframe');frame.title=item.title+'：直接操作';frame.src=embedUrl(item);frame.allow='fullscreen; clipboard-write';
  frame.addEventListener('load',()=>syncFrame(item.id));element.querySelector('.ui-stage').append(frame);frames.set(item.id,frame);
}
function syncFrame(id){
  const frame=frames.get(id),element=grid.querySelector(`[data-ui="${id}"]`);
  frame?.contentWindow?.postMessage({type:'ui-moments:embed',active:playing&&visible.has(element)&&!element.hidden&&!document.hidden,theme:root.dataset.theme},location.origin);
}
function syncComponentPreview(){
  if(componentDialog.open&&component?.credit?.licensePath===micronLicensePath){
    componentFrame.contentWindow?.postMessage({type:'ui-moments:embed',active:playing&&!document.hidden,theme:root.dataset.theme},location.origin);
  }
}
componentFrame.addEventListener('load',syncComponentPreview);
function syncMotion(){
  for(const element of grid.children){
    const item=byId.get(element.dataset.ui),run=playing&&!element.hidden&&visible.has(element)&&!document.hidden;
    if(item.loader){const preview=element.querySelector('.ui-animation');if(preview.setPlaying)preview.setPlaying(run);else for(const animation of preview.shadowRoot?.getAnimations()||[])run?animation.play():animation.pause();}
    else syncFrame(item.id);
  }
  syncComponentPreview();
  editor.syncMotion();$('#motion').textContent=playing?'暂停动效':'播放动效';$('#motion').setAttribute('aria-pressed',String(!playing));
}
const observer=new IntersectionObserver(entries=>{
  for(const entry of entries){
    const element=entry.target,item=byId.get(element.dataset.ui);
    if(entry.isIntersecting){visible.add(element);if(!item.loader&&!element.hidden)mountFrame(element,item);}else visible.delete(element);
  }
  syncMotion();
},{rootMargin:'120px'});
for(const element of grid.children)observer.observe(element);
function filter(){
  for(const button of $('#categories').children)button.setAttribute('aria-pressed',String(button.dataset.category===category));
  for(const button of $('#shapes').children)button.setAttribute('aria-pressed',String(button.dataset.shape===shape));
  const query=search.value;
  let count=0;
  for(const element of grid.children){
    const item=byId.get(element.dataset.ui);element.hidden=!matches(item,{category,shape,query});
    if(!element.hidden){count++;if(!item.loader&&visible.has(element))mountFrame(element,item);}
  }
  $('#ui-count').textContent=`${count} 个 UI`;$('#empty').hidden=count!==0;$('#shape-row').hidden=category!=='feedback';
  syncMotion();
}
$('#categories').addEventListener('click',event=>{const button=event.target.closest('[data-category]');if(!button)return;category=button.dataset.category;shape='all';filter();});
$('#shapes').addEventListener('click',event=>{const button=event.target.closest('[data-shape]');if(!button)return;shape=button.dataset.shape;filter();});
search.addEventListener('input',filter);
$('#motion').addEventListener('click',()=>{playing=!playing;syncMotion();});
reduced.addEventListener('change',event=>{playing=!event.matches;syncMotion();});
document.addEventListener('visibilitychange',syncMotion);
root.addEventListener('ui-moments:theme',()=>{
  for(const element of grid.children){const item=byId.get(element.dataset.ui);if(item.loader)element.querySelector('.ui-animation').replaceWith(effect(item.loader));}
  requestAnimationFrame(syncMotion);
});

const refreshComponentPrompt=mountPrompt(componentDialog,()=>componentPrompt(component),editor.copy);
function openComponent(item,button){
  component=item;componentTrigger=button;
  $('#component-title').textContent=item.title;$('#component-kind').textContent=categories.find(cat=>cat.id===item.category).name+' / '+item.type;
  $('#component-description').textContent=item.summary;
  componentFrame.src=embedUrl(item);componentFrame.title=item.title+'放大体验';
  $('#component-source').href='https://github.com/guanmo-ai/ui-moments/tree/main/'+item.source;
  $('#component-open').href=item.demo;
  $('#component-copy').hidden=item.demo.includes('/dist/');
  $('#component-copy').textContent='复制 HTML';
  const credit=item.credit;
  $('#component-credit').innerHTML=credit?`来源：<a href="${esc(credit.url)}" target="_blank" rel="noopener">${esc(credit.name)} ↗</a> · ${esc(credit.note||'参考交互想法，由 UI Moments 实现。')}`:'UI Moments 原创实现 · MIT';
  if(credit?.licensePath){
    const link=document.createElement('a');
    link.href=credit.licensePath;
    link.textContent='MIT 许可证';
    $('#component-credit').append(' ',link);
  }
  refreshComponentPrompt();
  componentDialog.showModal();document.body.style.overflow='hidden';history.replaceState(null,'','#'+item.id);
}
grid.addEventListener('click',event=>{
  const card=event.target.closest('[data-ui]');
  if(!card)return;
  const item=byId.get(card.dataset.ui);
  const button=event.target.closest('[data-detail]')||(item.loader&&event.target.closest('.ui-stage')?card.querySelector('[data-detail]'):null);
  if(!button)return;
  item.loader?editor.open(item.loader,button):openComponent(item,button);
});
$('#component-close').addEventListener('click',()=>componentDialog.close());
componentDialog.addEventListener('close',()=>{
  componentFrame.src='about:blank';
  editor.clearFeedback();
  document.body.style.overflow='';
  history.replaceState(null,'',location.pathname+location.search);
  componentTrigger?.focus({preventScroll:true});
});
$('#component-copy').addEventListener('click',async()=>{
  const button=$('#component-copy');button.disabled=true;
  try{
    const item=component;
    if(item.credit?.licensePath===micronLicensePath){
      const [page,css,micronLicense]=await Promise.all([
        fetchText(item.demo.split('#')[0]),
        fetchText(item.sourceFiles[0]),
        fetchText(micronLicensePath),
      ]);
      await editor.copy(formatMicronDownload(page,item.en,css,micronLicense));
      return;
    }
    const url=new URL(component.demo,location.href),response=await fetch(url.pathname);if(!response.ok)throw new Error('源码载入失败');
    let code=await response.text();
    code=code.replace('<script src="../../assets/embed.js"></script>','');
    if(url.hash)code=code.replace('<head>',`<head>\n<script>history.replaceState(null,'',${JSON.stringify(url.hash)})</script>`);
    code+=`\n<!-- UI Moments\n来源：${component.credit?.name||'原创'} ${component.credit?.url||''}\n${component.credit?.note||'参考交互想法，由 UI Moments 实现。'}\n${originalLicense.trim()}\n-->\n`;
    await editor.copy(code);
  }catch(error){button.textContent='载入失败，重试';}finally{button.disabled=false;}
});
function fromHash(){
  const id=location.hash.slice(1);
  if(['loaders','ldrs'].includes(id)){category='feedback';shape='all';filter();return;}
  const item=byId.get(id==='holiday-calendar'?'date-picker':id);if(!item||editor.isOpen()||componentDialog.open)return;
  const button=grid.querySelector(`[data-ui="${item.id}"] [data-detail]`);item.loader?editor.open(item.loader,button):openComponent(item,button);
}
addEventListener('hashchange',fromHash);
filter();fromHash();root.dataset.ready='true';
