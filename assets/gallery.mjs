import {setupSite,foreground} from './site.mjs';
import {buildCatalog,categories,matches} from './catalog.mjs';
import * as ldrs from '../gallery/loaders/vendor/ldrs/dist/index.js';
import {previewProps,groups} from '../gallery/loaders/catalog.mjs';
import {escapeHtml as esc} from '../gallery/loaders/snippets.mjs';
import {createLoaderEditor} from '../gallery/loaders/editor.mjs';
import {componentPrompt,mountPrompt} from './prompt.mjs';

setupSite();
const $=selector=>document.querySelector(selector),root=document.documentElement,grid=$('#ui-grid');
const items=buildCatalog(window.WORKS||[]),byId=new Map(items.map(item=>[item.id,item]));
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
let playing=!reduced.matches,category='all',shape='all',component=null,componentTrigger=null;
const visible=new Set(),frames=new Map();
let license;
try{const response=await fetch('gallery/loaders/vendor/ldrs/LICENSE');if(!response.ok)throw new Error('许可证载入失败');license=await response.text();}
catch(error){$('#load-error').hidden=false;throw error;}
const editor=createLoaderEditor({license,isPlaying:()=>playing});
function effect(item){
  const element=document.createElement(item.tag);
  element.className='ui-animation';
  for(const [name,value] of Object.entries(previewProps(item,foreground())))element.setAttribute(name,String(value));
  element.setAttribute('aria-hidden','true');return element;
}
function embedUrl(item){const url=new URL(item.demo,location.href);url.searchParams.set('embed','ui');url.searchParams.set('theme',root.dataset.theme);return url.href;}
for(const item of items){
  if(item.loader)ldrs[item.loader.key].register(item.loader.tag);
  const element=document.createElement('article');element.className='ui-item';element.dataset.ui=item.id;
  element.innerHTML=`
    <div class="ui-stage" aria-label="${esc(item.title)}实时演示">
      <button type="button" class="ui-expand${item.loader?' ui-expand-stage':''}" data-detail aria-label="放大 ${esc(item.title)}" aria-haspopup="dialog">
        <span class="ui-expand-label">放大 <span aria-hidden="true">↗</span></span>
      </button>
    </div>
    <div class="ui-caption"><div><h2>${esc(item.title)}</h2><p>${esc(item.type)}${item.shape?' · '+esc(item.shape):''}</p></div></div>`;
  if(item.loader)element.querySelector('.ui-stage').append(effect(item.loader));
  grid.append(element);
}
function renderCategories(){
  $('#categories').innerHTML=categories.filter(cat=>cat.id==='all'||items.some(item=>item.category===cat.id)).map(cat=>`<button type="button" data-category="${cat.id}" aria-pressed="${cat.id===category}">${esc(cat.name)}<span>${cat.id==='all'?items.length:items.filter(item=>item.category===cat.id).length}</span></button>`).join('');
  $('#shapes').innerHTML=[['all','全部形态'],...groups.map(name=>[name,name])].map(([key,name])=>`<button type="button" data-shape="${key}" aria-pressed="${key===shape}">${name}</button>`).join('');
}
function mountFrame(element,item){
  if(frames.has(item.id))return;
  const frame=document.createElement('iframe');frame.title=item.title+'：直接操作';frame.src=embedUrl(item);frame.allow='fullscreen; clipboard-write';
  frame.addEventListener('load',()=>syncFrame(item.id));element.querySelector('.ui-stage').append(frame);frames.set(item.id,frame);
}
function syncFrame(id){
  const frame=frames.get(id),element=grid.querySelector(`[data-ui="${id}"]`);
  frame?.contentWindow?.postMessage({type:'ui-moments:embed',active:playing&&visible.has(element)&&!element.hidden&&!document.hidden,theme:root.dataset.theme},location.origin);
}
function syncMotion(){
  for(const element of grid.children){
    const item=byId.get(element.dataset.ui),run=playing&&!element.hidden&&visible.has(element)&&!document.hidden;
    if(item.loader){for(const animation of element.querySelector('.ui-animation').shadowRoot?.getAnimations()||[])run?animation.play():animation.pause();}
    else syncFrame(item.id);
  }
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
  let count=0;
  for(const element of grid.children){
    const item=byId.get(element.dataset.ui);element.hidden=!matches(item,{category,shape,query:$('#work-search').value});
    if(!element.hidden){count++;if(!item.loader&&visible.has(element))mountFrame(element,item);}
  }
  $('#ui-count').textContent=`${count} 个 UI`;$('#empty').hidden=count!==0;$('#shape-row').hidden=category!=='feedback';
  syncMotion();
}
$('#categories').addEventListener('click',event=>{const button=event.target.closest('[data-category]');if(!button)return;category=button.dataset.category;shape='all';renderCategories();filter();});
$('#shapes').addEventListener('click',event=>{const button=event.target.closest('[data-shape]');if(!button)return;shape=button.dataset.shape;renderCategories();filter();});
$('#work-search').addEventListener('input',filter);
$('#motion').addEventListener('click',()=>{playing=!playing;syncMotion();});
reduced.addEventListener('change',event=>{playing=!event.matches;syncMotion();});
document.addEventListener('visibilitychange',syncMotion);
root.addEventListener('ui-moments:theme',()=>{
  for(const element of grid.children){const item=byId.get(element.dataset.ui);if(item.loader)element.querySelector('.ui-animation').replaceWith(effect(item.loader));}
  requestAnimationFrame(syncMotion);
});

const componentDialog=$('#component-detail');
const refreshComponentPrompt=mountPrompt(componentDialog,()=>componentPrompt(component),editor.copy);
function openComponent(item,button){
  component=item;componentTrigger=button;
  $('#component-title').textContent=item.title;$('#component-kind').textContent=categories.find(cat=>cat.id===item.category).name+' / '+item.type;
  $('#component-description').textContent=item.summary;
  $('#component-frame').src=embedUrl(item);$('#component-frame').title=item.title+'放大体验';
  $('#component-source').href='https://github.com/guanmo-ai/ui-moments/tree/main/'+item.source;
  $('#component-open').href=item.demo;
  $('#component-copy').hidden=item.demo.includes('/dist/');
  const credit=item.credit;
  $('#component-credit').innerHTML=credit?`来源：<a href="${esc(credit.url)}" target="_blank" rel="noopener">${esc(credit.name)} ↗</a> · ${esc(credit.note||'参考交互想法，由 UI Moments 实现。')}`:'UI Moments 原创实现 · MIT';
  refreshComponentPrompt();
  componentDialog.showModal();document.body.style.overflow='hidden';history.replaceState(null,'','#'+item.id);
}
grid.addEventListener('click',event=>{
  const button=event.target.closest('[data-detail]');if(!button)return;
  const item=byId.get(button.closest('[data-ui]').dataset.ui);
  item.loader?editor.open(item.loader,button):openComponent(item,button);
});
$('#component-close').addEventListener('click',()=>componentDialog.close());
componentDialog.addEventListener('close',()=>{
  $('#component-frame').src='about:blank';
  editor.clearFeedback();
  document.body.style.overflow='';
  history.replaceState(null,'',location.pathname+location.search);
  componentTrigger?.focus({preventScroll:true});
});
$('#component-copy').addEventListener('click',async()=>{
  const button=$('#component-copy');button.disabled=true;
  try{
    const url=new URL(component.demo,location.href),response=await fetch(url.pathname);if(!response.ok)throw new Error('源码载入失败');
    let code=await response.text();
    code=code.replace('<script src="../../assets/embed.js"></script>','');
    if(url.hash)code=code.replace('<head>',`<head>\n<script>history.replaceState(null,'',${JSON.stringify(url.hash)})</script>`);
    const ownLicense=await (await fetch('LICENSE')).text();
    code+=`\n<!-- UI Moments\n来源：${component.credit?.name||'原创'} ${component.credit?.url||''}\n${component.credit?.note||'参考交互想法，由 UI Moments 实现。'}\n${ownLicense.trim()}\n-->\n`;
    await editor.copy(code);
  }catch(error){button.textContent='载入失败，重试';}finally{button.disabled=false;}
});
function fromHash(){
  const id=location.hash.slice(1);
  if(['loaders','ldrs'].includes(id)){category='feedback';shape='all';renderCategories();filter();return;}
  const item=byId.get(id);if(!item||editor.isOpen()||componentDialog.open)return;
  const button=grid.querySelector(`[data-ui="${item.id}"] [data-detail]`);item.loader?editor.open(item.loader,button):openComponent(item,button);
}
addEventListener('hashchange',fromHash);
renderCategories();filter();fromHash();root.dataset.ready='true';
