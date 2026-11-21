import {setupSite,setupGalleryFavorites,showLoadingAccent,foreground,embedUrl} from './site.mjs';
import {onLanguageChange,translate as t} from './locale.mjs';
import {buildCatalog,categories,getCategoryFilters,matches} from './catalog.mjs';
import {previewProps} from '../gallery/loaders/catalog.mjs';
import {escapeHtml as esc} from '../gallery/loaders/snippets.mjs';
import {createLoaderEditor,createLoaderPreview,setPreviewPlaying} from '../gallery/loaders/editor.mjs';
import {componentPrompt,mountPrompt} from './prompt.mjs';
import {createLoadingUIIntegration} from '../gallery/loading-ui/integration.mjs';
import {createSvgSpinnerIntegration} from '../gallery/svg-spinners/integration.mjs';
import {formatMicronDownload,micronLicensePath} from '../gallery/micron/catalog.mjs';

setupSite();
const $=selector=>document.querySelector(selector);
const root=document.documentElement,grid=$('#ui-grid');
const loaderDialog=$('#detail'),componentDialog=$('#component-detail'),componentFrame=$('#component-frame');
const categoryButtons=$('#categories'),shapeButtons=$('#shapes');
const motionButton=$('#motion'),empty=$('#empty');
const items=buildCatalog(window.WORKS||[]);
const motionFilter=$('#preview-motion');
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
const search=$('#work-search');
const params=new URLSearchParams(location.search);
search.value=params.get('q')||'';
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

let playing=!reduced.matches,category='all',shape='all';
let component=null,componentTrigger=null,opening=null;
let themeColor=foreground();
const cards=new Map(),mounted=new Set(),providers={};
const pendingFrames=new Set();
const concurrentFrameLimit=5;
let loadingFrames=0;
const favorites=setupGalleryFavorites(filter);
const resourceLoads=new Map(),importFailures=new Map();
const loadingRuntimePath='gallery/loading-ui/dist/runtime.js';
const svgSourcePath='gallery/svg-spinners/dist/sources.json';

function loadOnce(key,load){
  if(!resourceLoads.has(key)){
    resourceLoads.set(key,load().catch(error=>{
      resourceLoads.delete(key);
      throw error;
    }));
  }
  return resourceLoads.get(key);
}

function fetchText(path){
  return loadOnce(path,async()=>{
    const response=await fetch(path);
    if(!response.ok)throw new Error(`Could not load resource: ${path}`);
    return response.text();
  });
}

function loadModule(path){
  return loadOnce(`module:${path}`,async()=>{
    const url=new URL(path,import.meta.url);
    const failures=importFailures.get(path)||0;
    // 浏览器会记住失败的模块 URL，重试时使用新的模块地址。
    if(failures)url.searchParams.set('retry',failures);
    try{return await import(url.href);}
    catch(error){importFailures.set(path,failures+1);throw error;}
  });
}

function loadSvgSources(){
  return loadOnce('svg-sources',async()=>{
    const response=await fetch(svgSourcePath);
    if(!response.ok)throw new Error(`Could not load resource: ${svgSourcePath}`);
    return response.json();
  });
}

async function preparePreview(loader){
  if(loader.original)return;
  if(loader.provider==='loading-ui'){
    await loadModule(`../${loadingRuntimePath}`);
    if(!customElements.get(loader.tag))throw new Error(`Missing animation: ${loader.key}`);
  }else if(loader.provider==='svg-spinners'){
    const sources=await loadSvgSources();
    if(!sources[loader.slug])throw new Error(`Missing animation: ${loader.key}`);
    providers['svg-spinners']??=createSvgSpinnerIntegration({sources});
  }else if(!customElements.get(loader.tag)){
    const {default:definition}=await loadModule(`../gallery/loaders/vendor/ldrs/dist/elements/${loader.key}.js`);
    if(!customElements.get(loader.tag))definition.register(loader.tag);
  }
}

async function prepareExport(loader){
  if(loader.provider==='loading-ui'){
    return loadOnce('loading-ui:export',async()=>{
      const [license,notices,runtime,sources]=await Promise.all([
        fetchText(loader.origin.licensePath),
        fetchText('gallery/loading-ui/dist/THIRD_PARTY_LICENSES.txt'),
        fetchText(loadingRuntimePath),
        fetchText('gallery/loading-ui/dist/sources.json').then(JSON.parse),
      ]);
      providers['loading-ui']=createLoadingUIIntegration({license,notices,runtime,sources});
    });
  }
  if(loader.provider==='svg-spinners'){
    return loadOnce('svg-spinners:export',async()=>{
      const [license,sources]=await Promise.all([fetchText(loader.origin.licensePath),loadSvgSources()]);
      providers['svg-spinners']=createSvgSpinnerIntegration({license,sources});
    });
  }
  return fetchText(loader.original?'LICENSE':'gallery/loaders/vendor/ldrs/LICENSE');
}

function restoreDetailFocus(button){
  if(button?.closest('[hidden]'))$('#gallery-favorites').focus({preventScroll:true});
  else button?.focus({preventScroll:true});
}

const editor=createLoaderEditor({
  providers,
  restoreFocus:restoreDetailFocus,
  isPlaying:()=>playing&&!document.hidden,
});

function effect(loader){
  const preview=createLoaderPreview(loader,previewProps(loader,themeColor,root.dataset.theme),providers);
  preview.className='ui-animation';
  return preview;
}

grid.innerHTML=items.map(item=>{
  const caption=item.shape||item.type;
  const titleId=`work-title-${item.id}`,actionId=`work-action-${item.id}`;
  return `<article class="ui-item" data-ui="${esc(item.id)}" data-category="${esc(item.category)}"${item.previewSize?` data-preview-size="${esc(item.previewSize)}"`:''}>
    ${item.loader
      ? `<button type="button" class="ui-stage ui-playback" aria-pressed="false" aria-label="${esc(t('Pause {name} preview',{name:item.title}))}"></button>`
      : item.category==='feedback'
        ? `<div class="ui-stage"><button lang="en" type="button" class="ui-micron mjs-ease-in-out" aria-label="Try ${esc(item.title)}">Try it</button></div>`
        : '<div class="ui-stage"></div>'}
    <div class="ui-caption">
      <div><h2 lang="en" id="${titleId}">${esc(item.title)}</h2><p>${esc(t(caption))}</p></div>
      <button type="button" class="ui-expand" data-detail aria-labelledby="${actionId} ${titleId}" aria-haspopup="dialog">
        <span class="ui-detail-label" id="${actionId}">${t('Details')}</span>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M11 3h6v6m0-6-6 6m-2 8H3v-6m0 6 6-6"/></svg>
      </button>
    </div></article>`;
}).join('');
for(const [index,item] of items.entries()){
  const element=grid.children[index];
  cards.set(item.id,{
    item,element,stage:element.firstElementChild,detail:element.querySelector('[data-detail]'),
    near:false,visible:false,paused:false,
  });
}

// Leave space for the card's own height plus the gutter.
const cardSizes=new ResizeObserver(entries=>{
  const style=getComputedStyle(grid);
  const gap=parseFloat(style.columnGap),rowHeight=parseFloat(style.getPropertyValue('--masonry-row'));
  for(const {target,borderBoxSize} of entries){
    const {blockSize}=borderBoxSize[0];
    if(!blockSize)continue;
    const rows=String(Math.ceil((blockSize+gap)/rowHeight));
    if(target.style.getPropertyValue('--card-rows')!==rows)target.style.setProperty('--card-rows',rows);
  }
});
grid.dataset.masonry='';

const intro=$('#gallery-intro');
intro.querySelector('[data-stat="total"]').textContent=items.length;
function localizeIntro(){
  const [before,after]=t('Explore {count} live UI examples.').split('{count}');
  intro.firstChild.textContent=before;
  intro.lastChild.textContent=after;
}
localizeIntro();

categoryButtons.innerHTML=categories.map(({id,name})=>{
  const count=id==='all'?items.length:items.filter(item=>item.category===id).length;
  return `<button type="button" data-category="${id}"><span class="category-label">${esc(t(name))}</span><span class="category-count">${count}</span></button>`;
}).join('');

function modalOpen(){
  return loaderDialog.open||componentDialog.open;
}

function canAnimate(){
  return playing&&!document.hidden;
}

function sendEmbed(frame,active){
  frame.contentWindow?.postMessage({type:'ui-moments:embed',active,theme:root.dataset.theme},location.origin);
}

function syncCard(card,{reload=false}={}){
  const run=canAnimate()&&!modalOpen()&&!card.element.hidden&&card.visible&&!card.paused;
  if(card.frame){
    const state=`${run}:${root.dataset.theme}`;
    if(reload||card.motion!==state){
      card.motion=state;
      sendEmbed(card.frame,run);
    }
  }else if(card.preview&&card.motion!==run){
    card.motion=run;
    setPreviewPlaying(card.preview,run);
  }
}

function syncMotion(){
  for(const card of mounted)syncCard(card);
  if(componentDialog.open)sendEmbed(componentFrame,canAnimate());
  editor.syncMotion();
}

function mountFrame(card){
  const frame=document.createElement('iframe');
  frame.title=t('{name} interactive preview',{name:card.item.title});
  const url=embedUrl(card.item.demo,root.dataset.theme);
  if(card.item.fitPreview)url.searchParams.set('preview','card');
  frame.src=url.href;
  frame.allow='fullscreen; clipboard-write';
  frame.addEventListener('load',()=>{
    frame.dataset.loaded='';
    syncCard(card,{reload:true});
  });
  loadingFrames++;
  const timeout=setTimeout(releaseSlot,2500);
  frame.addEventListener('load',releaseSlot,{once:true});
  function releaseSlot(){
    clearTimeout(timeout);
    frame.removeEventListener('load',releaseSlot);
    loadingFrames--;
    mountPendingFrames();
  }
  card.frame=frame;
  card.stage.append(frame);
  mounted.add(card);
}

function mountPendingFrames(){
  for(const card of pendingFrames){
    if(loadingFrames>=concurrentFrameLimit)return;
    pendingFrames.delete(card);
    if(nearScreen(card)&&!card.frame)mountFrame(card);
  }
}

function nearScreen(card){
  return card.near&&!card.element.hidden;
}

function renderPreview(card){
  const preview=effect(card.item.loader);
  card.preview=preview;
  card.stage.replaceChildren(preview);
  card.motion=undefined;
  mounted.add(card);
  syncCard(card);
}

async function mountPreview(card){
  if(card.preview||card.loading||card.failed)return;
  card.loading=true;
  try{
    await preparePreview(card.item.loader);
    if(nearScreen(card))renderPreview(card);
  }catch{
    if(!nearScreen(card))return;
    const message=document.createElement('span');
    message.className='ui-preview-error';
    message.textContent=t('Preview failed. Click to retry.');
    card.failed=true;
    card.stage.dataset.previewState='error';
    card.stage.removeAttribute('aria-pressed');
    card.stage.setAttribute('aria-label',t('Retry {name} preview',{name:card.item.title}));
    card.stage.disabled=false;
    card.stage.replaceChildren(message);
  }finally{
    card.loading=false;
  }
}

function updateCard(card){
  if(nearScreen(card)){
    if(card.item.loader)void mountPreview(card);
    else if(card.item.category!=='feedback'&&!card.frame)pendingFrames.add(card);
  }else if(card.item.fitPreview&&card.frame){
    card.frame.remove();
    card.frame=null;
    mounted.delete(card);
  }else if(card.preview){
    card.preview.remove();
    card.preview=null;
    mounted.delete(card);
  }
  if(!nearScreen(card))pendingFrames.delete(card);
  syncCard(card);
}

// 近屏挂载与实际在屏播放分开。循环动效和批量示例离开缓冲区后释放预览。
const nearObserver=new IntersectionObserver(entries=>{
  for(const entry of entries){
    const card=cards.get(entry.target.dataset.ui);
    card.near=entry.isIntersecting;
    updateCard(card);
  }
  mountPendingFrames();
},{rootMargin:'140px 0px'});
const visibleObserver=new IntersectionObserver(entries=>{
  for(const entry of entries){
    const card=cards.get(entry.target.dataset.ui);
    card.visible=entry.isIntersecting;
    syncCard(card);
  }
});

function setPressed(button,pressed){
  const value=String(pressed);
  if(button.getAttribute('aria-pressed')!==value)button.setAttribute('aria-pressed',value);
}

function renderShapes(){
  const options=getCategoryFilters(items,category);
  $('#shape-row').hidden=options.length===0;
  $('[data-shape-label]').textContent=t(category==='feedback'?'Effect':'Shape');
  shapeButtons.innerHTML=options.map(({id,name})=>`<button type="button" data-shape="${esc(id)}" aria-pressed="${id===shape}">${esc(t(name))}</button>`).join('');
}

let resultCount=0;
function localizeResults(){
  $('#ui-count').textContent=t('{count} components',{count:resultCount});
  if(resultCount===0)empty.textContent=t(favorites.only&&!search.value.trim()&&category==='all'&&motionFilter.value==='all'
    ?'No favorites yet.':'No components match these filters.');
}

function filter(){
  for(const button of categoryButtons.querySelectorAll('[data-category]'))setPressed(button,button.dataset.category===category);
  for(const button of shapeButtons.children)setPressed(button,button.dataset.shape===shape);
  const query=search.value,motion=motionFilter.value;
  motionFilter.toggleAttribute('data-filtered',motion!=='all');
  let count=0;
  for(const card of cards.values()){
    const hidden=!matches(card.item,{category,shape,motion,query})||(favorites.only&&!favorites.has(card.item.id));
    if(card.element.hidden!==hidden){
      card.element.hidden=hidden;
      if(hidden){
        if(opening?.card===card)cancelOpening();
        updateCard(card);
      }
    }
    if(!hidden)count++;
  }
  resultCount=count;
  empty.hidden=count!==0;
  localizeResults();
}

function selectCategory(next){
  if(category!==next){
    category=next;
    shape='all';
    renderShapes();
  }
  filter();
}

categoryButtons.addEventListener('click',event=>{
  const button=event.target.closest('[data-category]');
  if(button)selectCategory(button.dataset.category);
});
shapeButtons.addEventListener('click',event=>{
  const button=event.target.closest('[data-shape]');
  if(!button)return;
  shape=button.dataset.shape;
  filter();
});
search.addEventListener('input',filter);
motionFilter.addEventListener('change',filter);

function setPlaying(value){
  playing=value;
  motionButton.textContent=t(playing?'Pause motion':'Play motion');
  setPressed(motionButton,!playing);
  grid.toggleAttribute('data-motion-paused',!playing);
  for(const card of cards.values()){
    if(card.item.loader)card.stage.disabled=!playing&&!card.failed;
  }
  syncMotion();
}

motionButton.addEventListener('click',()=>setPlaying(!playing));
reduced.addEventListener('change',event=>setPlaying(!event.matches));
document.addEventListener('visibilitychange',syncMotion);
root.addEventListener('ui-moments:theme',()=>{
  themeColor=foreground();
  for(const card of mounted){
    if(card.preview)renderPreview(card);
    else syncCard(card);
  }
  if(componentDialog.open)sendEmbed(componentFrame,canAnimate());
});
componentFrame.addEventListener('load',()=>{
  if(componentFrame.src!=='about:blank')componentFrame.dataset.loaded='';
  if(componentDialog.open)sendEmbed(componentFrame,canAnimate());
});
loaderDialog.addEventListener('close',syncMotion);

const refreshComponentPrompt=mountPrompt(componentDialog,()=>componentPrompt(component),editor.copy);
const componentCopy=$('#component-copy');
function localizeComponent(){
  const {category,title,shape,type,credit}=component;
  const categoryName=categories.find(item=>item.id===category).name;
  $('#component-kind').textContent=`${t(categoryName)} / ${t(category==='feedback'?shape:type)}`;
  componentFrame.title=t('{name} enlarged preview',{name:title});
  componentCopy.textContent=t(componentCopy.hasAttribute('data-error')?'Retry loading':'Copy HTML');
  if(credit){
    $('#component-credit [data-credit-label]').textContent=t('Source');
    const license=$('#component-credit [data-license]');
    if(license)license.textContent=t('MIT license');
  }
}

function openComponent(item,button){
  component=item;
  componentTrigger=button;
  $('#component-title').textContent=item.title;
  $('#component-description').textContent=item.summary;
  delete componentFrame.dataset.loaded;
  componentFrame.src=embedUrl(item.demo,root.dataset.theme).href;
  $('#component-source').href='https://github.com/guanmo-ai/ui-moments/tree/main/'+item.source;
  $('#component-open').href=item.demo;
  componentCopy.hidden=Boolean(item.multiFile)||item.demo.includes('/dist/');
  componentCopy.removeAttribute('data-error');
  const credit=item.credit;
  const creditElement=$('#component-credit');
  creditElement.hidden=!credit;
  creditElement.innerHTML=credit?`<span data-credit-label></span>: <span lang="en"><a href="${esc(credit.url)}" target="_blank" rel="noopener">${esc(credit.name)} ↗</a> · ${esc(credit.note||'Interaction reference, implemented by UI Moments.')}</span>`:'';
  if(credit?.licensePath){
    const link=document.createElement('a');
    link.href=credit.licensePath;
    link.dataset.license='';
    creditElement.append(' ',link);
  }
  localizeComponent();
  refreshComponentPrompt();
  componentDialog.showModal();
  document.body.style.overflow='hidden';
  history.replaceState(null,'','#'+item.id);
}

function localizeDetailButton(button){
  const state=button.dataset.detailState;
  button.querySelector('.ui-detail-label').textContent=t(state==='loading'?'Loading details':state==='error'?'Retry details':'Details');
}

function setDetailState(card,state){
  const button=card.detail,label=button.querySelector('.ui-detail-label');
  button.querySelector('.ui-detail-loading')?.remove();
  if(state==='loading'){
    const accent=document.createElement('span');
    accent.className='ui-detail-loading';
    accent.setAttribute('aria-hidden','true');
    showLoadingAccent(accent);
    label.before(accent);
    button.setAttribute('aria-busy','true');
  }else{
    button.removeAttribute('aria-busy');
  }
  button.dataset.detailState=state;
  localizeDetailButton(button);
}

function cancelOpening(){
  if(!opening)return;
  setDetailState(opening.card,'ready');
  opening=null;
}

async function openDetails(card){
  if(modalOpen()||opening?.card===card)return;
  cancelOpening();
  const {item,detail}=card;
  if(!item.loader){
    favorites.showFor(item.id);
    openComponent(item,detail);
    syncMotion();
    return;
  }
  const attempt={card};
  opening=attempt;
  setDetailState(card,'loading');
  try{
    const [,license]=await Promise.all([preparePreview(item.loader),prepareExport(item.loader)]);
    if(opening!==attempt)return;
    favorites.showFor(item.id);
    editor.open(item.loader,detail,license);
    setDetailState(card,'ready');
    syncMotion();
  }catch{
    if(opening===attempt){
      setDetailState(card,'error');
      editor.notify(t('{name} details could not load. Try again.',{name:item.title}));
    }
  }finally{
    if(opening===attempt)opening=null;
  }
}

grid.addEventListener('click',event=>{
  const element=event.target.closest('[data-ui]');
  if(!element)return;
  const card=cards.get(element.dataset.ui);
  const micron=event.target.closest('.ui-micron');
  if(micron){
    if(!playing||reduced.matches)return;
    const animation=micron.getAnimations().find(animation=>animation.animationName===`action-${card.item.en}`);
    if(animation)animation.currentTime=0;
    else micron.classList.add(`mjs-${card.item.en}`);
  }else if(event.target.closest('.ui-caption')){
    void openDetails(card);
  }else if(event.target.closest('.ui-playback')){
    if(card.failed){
      card.failed=false;
      delete card.stage.dataset.previewState;
      card.stage.replaceChildren();
      card.stage.setAttribute('aria-label',t('Pause {name} preview',{name:card.item.title}));
      card.stage.disabled=!playing;
      setPressed(card.stage,card.paused);
      void mountPreview(card);
      return;
    }
    card.paused=!card.paused;
    setPressed(card.stage,card.paused);
    syncCard(card);
  }
});
function resetMicron(event){
  const button=event.target;
  if(button.matches('.ui-micron')&&event.animationName.startsWith('action-')){
    button.classList.remove(`mjs-${event.animationName.slice('action-'.length)}`);
  }
}
grid.addEventListener('animationend',resetMicron);
grid.addEventListener('animationcancel',resetMicron);

function clearComponentHash(){
  if(location.hash==='#'+component?.id)history.replaceState(null,'',location.pathname+location.search);
}

$('#component-close').addEventListener('click',()=>{
  clearComponentHash();
  componentDialog.close();
});
componentDialog.addEventListener('cancel',clearComponentHash);
componentDialog.addEventListener('close',()=>{
  componentFrame.src='about:blank';
  editor.clearFeedback();
  document.body.style.overflow='';
  clearComponentHash();
  restoreDetailFocus(componentTrigger);
  syncMotion();
});

componentCopy.addEventListener('click',async()=>{
  const button=componentCopy;
  const item=component;
  button.removeAttribute('data-error');
  button.textContent=t('Copy HTML');
  button.disabled=true;
  try{
    if(item.credit?.licensePath===micronLicensePath){
      const [page,css,micronLicense]=await Promise.all([
        fetchText(item.demo.split('#')[0]),
        fetchText(item.sourceFiles[0]),
        fetchText(micronLicensePath),
      ]);
      await editor.copy(formatMicronDownload(page,item.en,css,micronLicense));
      return;
    }
    const url=new URL(item.demo,location.href);
    const [page,license]=await Promise.all([fetchText(url.pathname),fetchText('LICENSE')]);
    let code=page.replace('<script src="../../assets/embed.js"></script>','');
    if(url.hash)code=code.replace('<head>',`<head>\n<script>history.replaceState(null,'',${JSON.stringify(url.hash)})</script>`);
    const origin=item.credit
      ?`Reference: ${item.credit.name} ${item.credit.url}\n${item.credit.note||'Interaction reference, implemented by UI Moments.'}`
      :'Original design and implementation by UI Moments.';
    code+=`\n<!-- UI Moments\n${origin}\n${license.trim()}\n-->\n`;
    await editor.copy(code);
  }catch{
    if(component===item){
      button.dataset.error='';
      button.textContent=t('Retry loading');
    }
  }finally{
    button.disabled=false;
  }
});

function fromHash(){
  const id=location.hash.slice(1);
  if(id==='sources'){
    $('#source-details').open=true;
    return;
  }
  if(['loaders','ldrs'].includes(id)){
    selectCategory('loading');
    return;
  }
  const card=cards.get(id);
  if(card)void openDetails(card);
  else cancelOpening();
}
addEventListener('hashchange',fromHash);

onLanguageChange(()=>{
  localizeIntro();
  for(const {id,name} of categories)categoryButtons.querySelector(`[data-category="${id}"] .category-label`).textContent=t(name);
  renderShapes();
  localizeResults();
  motionButton.textContent=t(playing?'Pause motion':'Play motion');
  for(const card of cards.values()){
    const {item}=card;
    card.element.querySelector('.ui-caption p').textContent=t(item.shape||item.type);
    localizeDetailButton(card.detail);
    if(item.loader){
      card.stage.setAttribute('aria-label',t(card.failed?'Retry {name} preview':'Pause {name} preview',{name:item.title}));
      if(card.failed)card.stage.firstElementChild.textContent=t('Preview failed. Click to retry.');
    }
    if(card.frame)card.frame.title=t('{name} interactive preview',{name:item.title});
  }
  if(componentDialog.open)localizeComponent();
});

renderShapes();
filter();
setPlaying(playing);
for(const card of cards.values()){
  cardSizes.observe(card.element,{box:'border-box'});
  nearObserver.observe(card.element);
  visibleObserver.observe(card.element);
}
root.dataset.ready='true';
fromHash();
