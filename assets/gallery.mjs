import '../gallery/works.js';
import {setupSite,setupGalleryFavorites,showLoadingAccent,foreground,embedUrl} from './site.mjs';
import {localizedText,onLanguageChange,translate as t} from './locale.mjs';
import {buildCatalog,cardMarkup,categories,categoryMarkup,galleryHighlights,groupHeading,getCategoryFilters,initialCardCount,matches,otherCount,standaloneExamplePath,workHeading,kindLabel} from './catalog.mjs';
import {previewProps} from '../gallery/loaders/catalog.mjs';
import {escapeHtml as esc} from '../gallery/loaders/snippets.mjs';
import {createLoaderPreview,setPreviewPlaying} from '../gallery/loaders/preview.mjs';

// The published HTML starts with the gallery. Closed dialogs travel with its module.
if(typeof __UI_MOMENTS_DIALOGS__!=='undefined'){
  document.body.insertAdjacentHTML('beforeend',__UI_MOMENTS_DIALOGS__);
}
setupSite();
const pendingSheets=[...document.querySelectorAll('link[rel="stylesheet"][media="print"][onload]')];
let homeStylesReady=pendingSheets.length ? Promise.all(pendingSheets.map(link=>new Promise(resolve=>{
  link.addEventListener('load',resolve,{once:true});
  link.addEventListener('error',resolve,{once:true});
}))).then(()=>{homeStylesReady=null;}) : null;

const $=selector=>document.querySelector(selector);
const root=document.documentElement,grid=$('#ui-grid');
const headings=new Map([...grid.querySelectorAll('[data-group-heading]')].map(heading=>[heading.dataset.groupHeading,heading]));
const OriginalCard=customElements.get('ui-original-card');
const galleryEnd=$('#gallery-end');
const loaderDialog=$('#detail'),componentDialog=$('#component-detail'),componentFrame=$('#component-frame');
const componentPreviewFeedback=$('#component-preview-feedback'),componentPreviewStatus=$('#component-preview-status');
const componentRetry=$('#component-retry');
const categoryButtons=$('#categories'),shapeButtons=$('#shapes');
const motionButton=$('#motion'),empty=$('#empty');
const otherFeedback=$('#other-feedback'),otherStatus=$('#other-status'),otherRetry=$('#other-retry');
const featured=buildCatalog(window.WORKS||[]);
const items=[...featured];
const itemsById=new Map(items.map(item=>[item.id,item]));
const highlights=galleryHighlights(featured);
const truncatedGroups=new Set(featured.map(item=>item.category)
  .filter(id=>highlights.filter(item=>item.category===id).length<featured.filter(item=>item.category===id).length));
const viewAllButtons=new Map();
let otherItems=[],otherState,otherHash,otherAttempts=0,showHighlights=false;
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
const search=$('#work-search');
const params=new URLSearchParams(location.search);
search.value=params.get('q')??search.value;

let playing=!reduced.matches,category='all',shape='all';
let component=null,componentTrigger=null,opening=null;
let loaderItemId,closingForHash=false;
let componentVisit=0,stopComponentPreview,componentPreviewState;
let themeColor=foreground();
const cards=new Map(),mounted=new Set();
const pendingPreviews=new Set(),idleFrames=new Set();
const concurrentFrameLimit=5;
const idleFrameLimit=6;
const resourceTimeout=8000;
let loadingFrames=0,previewFrame=0,scrollTimer=0;
let browseUrlTimer;
let lastScrollY=scrollY,lastScrollTime=performance.now();
const favorites=setupGalleryFavorites(filter);
const resourceLoads=new Map();

function mayBeOther(id){
  return /^(?:astryx|fluent)-/.test(id)&&!id.startsWith('astryx-variant-')&&!itemsById.has(id);
}

function localizeOtherFeedback(){
  otherRetry.textContent=t('Retry loading');
  otherStatus.textContent=t(otherState==='failed'?'Could not load other components.':'Loading other components…');
}

function updateOtherFeedback(needed){
  otherFeedback.hidden=!needed||!otherState||otherState==='ready';
  otherRetry.hidden=otherState!=='failed';
  if(!otherFeedback.hidden)localizeOtherFeedback();
}

async function loadOther(){
  const path=otherFeedback.dataset.catalog;
  const url=new URL(path||'./other-catalog.mjs',path?document.baseURI:import.meta.url);
  // A failed module fetch is cached by URL. Retry the same file with a fresh URL.
  if(otherAttempts)url.searchParams.set('retry',otherAttempts);
  otherAttempts++;
  otherState='loading';
  try{
    ({otherWorks:otherItems}=await import(url.href));
    for(const item of otherItems){
      items.push(item);
      itemsById.set(item.id,item);
    }
    otherState='ready';
  }catch{
    otherState='failed';
  }
  filter();
  if(otherState==='ready'&&otherHash)fromHash();
}

otherRetry.addEventListener('click',()=>{
  const target=search.value.trim()?search:categoryButtons.querySelector('[aria-pressed="true"]');
  target.focus({preventScroll:true});
  void loadOther();
  updateOtherFeedback(true);
});

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
    const response=await fetch(path,{signal:AbortSignal.timeout(resourceTimeout)});
    if(!response.ok)throw new Error(`Could not load resource: ${path}`);
    return response.text();
  });
}

function fetchFontData(path){
  return loadOnce(path,async()=>{
    const response=await fetch(path,{signal:AbortSignal.timeout(resourceTimeout)});
    if(!response.ok)throw new Error(`Could not load font: ${path}`);
    const bytes=new Uint8Array(await response.arrayBuffer());
    return `data:font/woff2;base64,${btoa(String.fromCharCode(...bytes))}`;
  });
}

function restoreDetailFocus(button){
  if(!button)search.focus({preventScroll:true});
  else if(button.closest('[hidden]'))$('#gallery-favorites').focus({preventScroll:true});
  else button.focus({preventScroll:true});
}

function dismissOnBackdrop(dialog){
  let start,canDismiss=false;
  function onBackdrop(event){
    if(event.target!==dialog)return false;
    const {left,top,right,bottom}=dialog.getBoundingClientRect();
    return event.clientX<left||event.clientX>=right||event.clientY<top||event.clientY>=bottom;
  }
  function reset(){start=undefined;canDismiss=false;}
  dialog.addEventListener('pointerdown',event=>{
    if(!event.isPrimary)return;
    reset();
    if(event.button===0&&onBackdrop(event))start=event;
  });
  dialog.addEventListener('pointerup',event=>{
    if(event.pointerId!==start?.pointerId)return;
    canDismiss=onBackdrop(event)&&Math.hypot(event.clientX-start.clientX,event.clientY-start.clientY)<8;
    start=undefined;
  });
  dialog.addEventListener('pointercancel',reset);
  dialog.addEventListener('close',reset);
  dialog.addEventListener('click',event=>{
    if(canDismiss&&event.detail>0&&onBackdrop(event))dialog.close();
    reset();
  });
}
dismissOnBackdrop(loaderDialog);
dismissOnBackdrop(componentDialog);

let editor,componentSourceHref,refreshComponentPrompt,detailModules;
function loadDetailModules(){
  detailModules??=import('../gallery/loaders/editor.mjs').then(
    ({createLoaderEditor,componentPrompt,componentSourceHref:sourceHref,mountPrompt})=>{
      editor=createLoaderEditor({restoreFocus:restoreDetailFocus,isPlaying:canAnimate});
      componentSourceHref=sourceHref;
      refreshComponentPrompt=mountPrompt(componentDialog,()=>componentPrompt(component),editor.copy);
    }
  ).catch(error=>{
    detailModules=undefined;
    throw error;
  });
  return detailModules;
}

function effect(loader){
  const preview=createLoaderPreview(loader,previewProps(loader,themeColor));
  preview.className='ui-animation';
  return preview;
}

function registerCard(item,element){
  const stage=element.firstElementChild;
  const card={item,element,stage,detail:element.querySelector('[data-detail]'),near:false,visible:false,paused:false};
  if(item.loader)stage.disabled=!playing;
  cards.set(item.id,card);
  card.original=OriginalCard.get(stage);
  if(card.original){
    mounted.add(card);
    localizeOriginal(card);
  }
  nearObserver.observe(element);
  visibleObserver.observe(element);
  return card;
}

function renderCards(batch){
  const wanted=new Set(batch.map(item=>item.id));
  const template=document.createElement('template');
  let pending=[];
  function insertBefore(anchor){
    if(!pending.length)return;
    template.innerHTML=pending.map(item=>cardMarkup(item)).join('');
    const elements=[...template.content.children];
    grid.insertBefore(template.content,anchor);
    pending.forEach((item,index)=>registerCard(item,elements[index]));
    pending=[];
  }
  // Insert missing cards in catalogue order without detaching existing previews.
  for(const item of items){
    const card=cards.get(item.id);
    if(card)insertBefore(card.element);
    else if(wanted.has(item.id))pending.push(item);
  }
  insertBefore(null);
}

let results=[],visibleCards=[],rowFillers=new Set();

function fillWideRows(){
  lightBounds=undefined;
  const next=new Set();
  const nextItem=results[visibleCards.length];
  if(!grid.hasAttribute('data-wide-only')&&(nextItem?.previewSize||visibleCards.some(({item})=>item.previewSize))){
    const columns=Number(getComputedStyle(grid).getPropertyValue('--columns'));
    let used=0,previous;
    for(const {item,element} of visibleCards){
      const span=item.previewSize?2:1;
      if(category==='all'&&item.category!==previous?.item.category)used=0;
      // Fill a spare column before a wide card without changing reading order.
      if(span===2&&used===columns-1){
        next.add(previous.element);
        used=0;
      }
      used=(used+span)%columns;
      previous={item,element};
    }
    if(previous&&nextItem?.previewSize&&used===columns-1&&
      (category!=='all'||nextItem.category===previous.item.category))next.add(previous.element);
  }
  for(const element of rowFillers)if(!next.has(element))element.removeAttribute('data-fill-row');
  for(const element of next)if(!rowFillers.has(element))element.dataset.fillRow='';
  rowFillers=next;
}

addEventListener('resize',fillWideRows);

const intro=$('#gallery-intro');
intro.querySelector('[data-stat="total"]').textContent=featured.length+otherCount;
function localizeIntro(){
  const [before,after]=t('Explore {count} live UI examples.').split('{count}');
  intro.firstChild.textContent=before;
  intro.lastChild.textContent=after;
}
localizeIntro();

if(!categoryButtons.firstElementChild)categoryButtons.innerHTML=categoryMarkup(items);
else if(root.lang!=='en')localizeCategories();

function localizeCategories(){
  for(const {id} of categories)categoryButtons.querySelector(`[data-category="${id}"] .category-label`).textContent=groupHeading(id);
  for(const [id,heading] of headings)heading.textContent=groupHeading(id);
  for(const button of viewAllButtons.values())localizeViewAll(button);
}


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
  const run=canAnimate()&&!scrollTimer&&!modalOpen()&&!card.element.hidden&&card.visible&&!card.paused;
  if(card.original){
    const theme=root.dataset.theme;
    if(card.original.dataset.theme!==theme)card.original.dataset.theme=theme;
    if(card.original.dataset.galleryActive!==String(run))card.original.dataset.galleryActive=String(run);
  }else if(card.frame){
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
  editor?.syncMotion();
  schedulePreviews();
}

function watchPreview(frame,item,{ready,failed}){
  let observer,stopped=false;
  const timeout=setTimeout(fail,resourceTimeout);
  function stop(){
    stopped=true;
    clearTimeout(timeout);
    observer?.disconnect();
    frame.removeEventListener('load',onLoad);
  }
  function fail(){
    stop();
    failed();
  }
  function onLoad(){
    if(stopped)return;
    const doc=frame.contentDocument;
    if(doc?.URL==='about:blank')return;
    if(doc?.documentElement?.dataset.embedded!=='true'){
      fail();
      return;
    }
    function check(){
      const sample=item.library?.id==='astryx'
        ?doc.querySelector('#sample .stage')
        :item.library?.id==='fluent-ui'
          ?doc.querySelector('.demo-stage > *')
          :doc.getElementById(item.id)?.querySelector('.stage');
      if(sample){
        stop();
        // Multiple same-origin previews share the accessibility scan with the gallery.
        const landmark=doc.querySelector('main:not([aria-label], [aria-labelledby])');
        if(landmark&&frame.title)landmark.setAttribute('aria-label',frame.title);
        frame.dataset.loaded='';
        ready(doc);
      }else if(doc.querySelector('#sample > p[role="alert"]'))fail();
    }
    observer?.disconnect();
    observer=new MutationObserver(check);
    observer.observe(doc.body,{childList:true,subtree:true});
    check();
  }
  frame.addEventListener('load',onLoad);
  // A parser-started preview can finish before the gallery module arrives.
  if(frame.contentDocument?.readyState==='complete')queueMicrotask(onLoad);
  return stop;
}

function paintFrameRetry(card,loading=false){
  if(!card.retry){
    card.retry=document.createElement('button');
    card.retry.type='button';
    card.retry.className='ui-preview-retry';
    card.stage.append(card.retry);
  }
  card.retry.textContent=t(loading?'Loading preview…':'Retry preview');
  card.retry.setAttribute('aria-disabled',String(loading));
  card.retry.setAttribute('aria-label',t(loading?'Loading preview…':'Retry {name} preview',workHeading(card.item)));
}

function unmountFrame(card){
  card.stopFrame?.();
  card.stopFrame=null;
  card.releaseSlot?.();
  card.frame.remove();
  card.frame=null;
  card.interacted=false;
  card.motion=undefined;
  idleFrames.delete(card);
  mounted.delete(card);
  if(card.retry){
    card.failed=true;
    paintFrameRetry(card);
  }
}

function trackCardFrame(card,frame){
  card.frame=frame;
  mounted.add(card);
  card.stopFrame=watchPreview(frame,card.item,{
    ready(doc){
      card.stopFrame=null;
      const selection=doc.createElement('style');
      selection.textContent=`body{-webkit-user-select:none;user-select:none}
        :is(textarea,[contenteditable]:not([contenteditable=false]),input:not([type=range],[type=radio],[type=checkbox],[type=button],[type=file])){-webkit-user-select:text;user-select:text}`;
      doc.head.append(selection);
      // Same-origin document boundaries stop pointer events. Feed mouse
      // coordinates from the embedded preview to the same pending paint.
      doc.addEventListener('mousemove',event=>{
        if(canTrackLight.matches)queueLight({card:card.element,frame,x:event.clientX,y:event.clientY});
      },{passive:true});
      const events=['click','keydown','input'];
      function rememberInteraction(event){
        if(!event.isTrusted)return;
        card.interacted=true;
        for(const type of events)doc.removeEventListener(type,rememberInteraction,true);
      }
      for(const type of events)doc.addEventListener(type,rememberInteraction,true);
      if(document.activeElement===card.retry)frame.focus({preventScroll:true});
      card.retry?.remove();
      card.retry=null;
      syncCard(card,{reload:true});
    },
    failed(){
      unmountFrame(card);
      card.failed=true;
      paintFrameRetry(card);
    },
  });
}

function mountFrame(card){
  const frame=document.createElement('iframe');
  frame.title=t('{name} interactive preview',workHeading(card.item));
  frame.allow='fullscreen; clipboard-write';
  const url=embedUrl(card.item.demo,root.dataset.theme);
  url.searchParams.set('paused','1');
  if(card.item.library)url.searchParams.set('preview','card');
  trackCardFrame(card,frame);
  loadingFrames++;
  card.releaseSlot=releaseSlot;
  const timeout=setTimeout(releaseSlot,2500);
  frame.addEventListener('load',releaseSlot,{once:true});
  function releaseSlot(){
    clearTimeout(timeout);
    frame.removeEventListener('load',releaseSlot);
    card.releaseSlot=null;
    loadingFrames--;
    schedulePreviews();
  }
  frame.src=url.href;
  card.stage.append(frame);
}

function localizeOriginal(card){
  const host=card.original.getRootNode().host;
  host.setAttribute('role','group');
  host.setAttribute('aria-label',t('{name} interactive preview',workHeading(card.item)));
}

async function mountOriginal(card){
  card.loading=true;
  try{
    card.original=await OriginalCard.mount(card.stage,card.item.id,root.dataset.theme,false);
    mounted.add(card);
    localizeOriginal(card);
    if(document.activeElement===card.retry){
      card.original.querySelector('button:not([disabled]), input:not([disabled]), [tabindex="0"]')?.focus({preventScroll:true});
    }
    card.retry?.remove();
    card.retry=null;
    syncCard(card);
  }catch{
    card.failed=true;
    paintFrameRetry(card);
  }finally{
    card.loading=false;
  }
}

function schedulePreviews(){
  if(previewFrame||document.hidden||modalOpen()||!pendingPreviews.size)return;
  previewFrame=requestAnimationFrame(()=>{
    previewFrame=0;
    if(document.hidden||modalOpen())return;
    // Keep previews filling in during a fast scroll while their animations are paused.
    let frames=Math.min(scrollTimer?1:2,concurrentFrameLimit-loadingFrames);
    let loaders=scrollTimer?3:6;
    const queue=[...pendingPreviews].sort((a,b)=>Number(b.visible)-Number(a.visible));
    for(const card of queue){
      if(!nearScreen(card)){
        pendingPreviews.delete(card);
      }else if(card.item.loader&&loaders>0){
        pendingPreviews.delete(card);
        loaders--;
        void mountPreview(card);
      }else if(!card.item.loader&&card.visible&&frames>0){
        pendingPreviews.delete(card);
        frames--;
        mountFrame(card);
      }
    }
    if(loadingFrames<concurrentFrameLimit||loaders===0)schedulePreviews();
  });
}

function nearScreen(card){
  return (card.near||card.visible)&&!card.element.hidden;
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
    if(nearScreen(card))renderPreview(card);
  }catch{
    if(!nearScreen(card))return;
    const message=document.createElement('span');
    message.className='ui-preview-error';
    message.textContent=t('Preview failed. Click to retry.');
    card.failed=true;
    card.stage.dataset.previewState='error';
    card.stage.removeAttribute('aria-pressed');
    card.stage.setAttribute('aria-label',t('Retry {name} preview',workHeading(card.item)));
    card.stage.disabled=false;
    card.stage.replaceChildren(message);
  }finally{
    card.loading=false;
  }
}

function updateCard(card){
  if(card.item.original){
    if(nearScreen(card)&&card.visible&&!card.original&&!card.loading&&!card.failed)void mountOriginal(card);
    syncCard(card);
    return;
  }
  if(nearScreen(card)){
    idleFrames.delete(card);
    if(card.item.loader){
      if(!card.preview&&!card.loading&&!card.failed)pendingPreviews.add(card);
    }else if(!card.frame&&!card.failed&&card.visible)pendingPreviews.add(card);
    else pendingPreviews.delete(card);
  }else{
    pendingPreviews.delete(card);
    if(card.frame){
      idleFrames.add(card);
      // Preserve focus and prefer recently used state within the idle-frame budget.
      if(idleFrames.size>idleFrameLimit){
        const evictable=[...idleFrames].filter(candidate=>document.activeElement!==candidate.frame);
        const oldest=evictable.find(candidate=>!candidate.interacted)||evictable[0];
        if(oldest)unmountFrame(oldest);
      }
    }else if(card.retry&&!card.failed){
      card.failed=true;
      paintFrameRetry(card);
    }else if(card.preview){
      card.preview.remove();
      card.preview=null;
      mounted.delete(card);
    }
  }
  syncCard(card);
}

// 近屏挂载与实际在屏播放分开。循环动效和批量示例离开缓冲区后释放预览。
const nearObserver=new IntersectionObserver(entries=>{
  for(const entry of entries){
    const card=cards.get(entry.target.dataset.ui);
    card.near=entry.isIntersecting;
    updateCard(card);
  }
  schedulePreviews();
},{rootMargin:'320px 0px'});
const visibleObserver=new IntersectionObserver(entries=>{
  for(const entry of entries){
    const card=cards.get(entry.target.dataset.ui);
    card.visible=entry.isIntersecting;
    updateCard(card);
  }
  schedulePreviews();
});

function setPressed(button,pressed){
  const value=String(pressed);
  if(button.getAttribute('aria-pressed')!==value)button.setAttribute('aria-pressed',value);
}

function renderShapes(){
  const options=getCategoryFilters(items,category);
  $('#shape-row').hidden=options.length===0;
  $('[data-shape-label]').textContent=t('Shape');
  shapeButtons.innerHTML=options.map(({id,name})=>`<button type="button" data-shape="${esc(id)}" aria-pressed="${id===shape}">${esc(t(name))}</button>`).join('');
}

let resultCount=0;
function localizeResults(){
  $('#ui-count').textContent=t('{count} components',{count:resultCount});
  if(resultCount===0)$('#empty-message').textContent=t(favorites.only&&!search.value.trim()&&category==='all'
    ?'No favorites yet.':'No components match these filters.');
}

// The sentinel follows the rendered prefix. Keyboard focus can extend the
// prefix before Tab leaves its last card, even before the observer callback.
const galleryObserver=new IntersectionObserver(([entry])=>{
  if(entry.isIntersecting)appendCards();
},{rootMargin:'480px 0px'});
galleryObserver.observe(galleryEnd);
grid.addEventListener('focusin',event=>{
  if(visibleCards.at(-1)?.element.contains(event.target))appendCards();
});

function setCardVisibility(card,visible){
  if(card.element.hidden===!visible)return;
  card.element.hidden=!visible;
  if(!visible&&opening?.card===card)cancelOpening();
  updateCard(card);
}

function localizeViewAll(button){
  const count=button.dataset.count;
  button.textContent=t('View all {count}',{count});
  button.setAttribute('aria-label',t('View all {count} · {category}',{count,category:groupHeading(button.dataset.viewAll)}));
}

function syncHeadings(){
  const visible=new Set();
  if(category==='all'){
    for(const {item,element} of visibleCards){
      const id=item.category;
      if(visible.has(id))continue;
      visible.add(id);
      if(!headings.has(id)){
        const heading=document.createElement('h2');
        heading.className='ui-group-heading';
        heading.dataset.groupHeading=id;
        heading.textContent=groupHeading(id);
        headings.set(id,heading);
      }
      const heading=headings.get(id);
      if(heading.nextElementSibling!==element)grid.insertBefore(heading,element);
    }
  }
  for(const [id,heading] of headings)heading.hidden=!visible.has(id);
  const completed=new Set();
  if(showHighlights){
    for(const [index,{item,element}] of visibleCards.entries()){
      const id=item.category;
      // 分区已经全部展示时，不再提供只会重复当前内容的入口。
      if(results[index+1]?.category===id||!truncatedGroups.has(id))continue;
      let button=viewAllButtons.get(id);
      if(!button){
        button=document.createElement('button');
        button.type='button';
        button.dataset.viewAll=id;
        button.dataset.count=categoryButtons.querySelector(`[data-category="${id}"] .category-count`).textContent;
        localizeViewAll(button);
        viewAllButtons.set(id,button);
      }
      completed.add(id);
      if(element.nextElementSibling!==button)element.after(button);
    }
  }
  for(const [id,button] of viewAllButtons)button.hidden=!completed.has(id);
}

const canTrackLight=matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
let litCard, lightFrame, lightPoint, lightBounds;
function updateLight(){
  lightFrame=0;
  const next=canTrackLight.matches?lightPoint?.card:null;
  if(next){
    const {frame}=lightPoint;
    if(lightBounds?.card!==next||lightBounds.frame!==frame){
      const box=next.getBoundingClientRect();
      const frameBox=frame?.getBoundingClientRect();
      lightBounds={card:next,frame,x:(frameBox?.x??0)-box.x,y:(frameBox?.y??0)-box.y,
        style:next.querySelector('.ui-card-light').style};
    }
    const {style,x,y}=lightBounds;
    style.setProperty('--light-x',`${lightPoint.x+x}px`);
    style.setProperty('--light-y',`${lightPoint.y+y}px`);
  }
  if(litCard!==next){
    litCard?.removeAttribute('data-card-lit');
    litCard=next;
    litCard?.setAttribute('data-card-lit','');
  }
}
function queueLight(point){
  lightPoint=point;
  if(!lightFrame)lightFrame=requestAnimationFrame(updateLight);
}
grid.addEventListener('pointermove',event=>{
  if(!canTrackLight.matches||event.pointerType!=='mouse')return;
  const card=event.target.closest('.ui-item');
  queueLight(card?{card,x:event.clientX,y:event.clientY}:null);
},{passive:true});
grid.addEventListener('pointerleave',()=>queueLight(null));
canTrackLight.addEventListener('change',()=>queueLight(null));

function syncLoaderOrder(){
  // The overview moves loading states ahead of component previews.
  // Move the original loader cards so any mounted component iframes stay in place.
  for(const [index,{item,element}] of visibleCards.entries()){
    if(!item.loader)continue;
    const before=visibleCards[index-1]?.element;
    const after=visibleCards[index+1]?.element;
    if(after&&(element.compareDocumentPosition(after)&Node.DOCUMENT_POSITION_PRECEDING)){
      after.before(element);
    }else if(before&&(element.compareDocumentPosition(before)&Node.DOCUMENT_POSITION_FOLLOWING)){
      before.after(element);
    }
  }
}

function appendCards(){
  const batch=results.slice(visibleCards.length,visibleCards.length+initialCardCount);
  if(!batch.length)return;
  renderCards(batch.filter(item=>!cards.has(item.id)));
  for(const item of batch){
    const card=cards.get(item.id);
    visibleCards.push(card);
    setCardVisibility(card,true);
  }
  syncLoaderOrder();
  galleryEnd.hidden=visibleCards.length===results.length;
  if(!galleryEnd.hidden){
    galleryObserver.unobserve(galleryEnd);
    galleryObserver.observe(galleryEnd);
  }
  syncHeadings();
  fillWideRows();
}

function filter(){
  const query=search.value.trim();
  const needsOther=category==='other'||Boolean(query)||Boolean(otherHash)||
    (favorites.only&&favorites.some(mayBeOther));
  if(needsOther&&!otherState)void loadOther();
  updateOtherFeedback(needsOther);
  const unfiltered=!query&&!favorites.only;
  showHighlights=unfiltered&&category==='all';
  const inScope=unfiltered?featured:items.filter(item=>
    matches(item,{query})&&(!favorites.only||favorites.has(item.id)));
  const counts=new Map();
  for(const {category:id} of inScope)counts.set(id,(counts.get(id)||0)+1);
  for(const button of categoryButtons.querySelectorAll('[data-category]')){
    const id=button.dataset.category;
    setPressed(button,id===category);
    const label=button.querySelector('.category-count');
    const count=String(id==='all'?inScope.length:id==='other'&&unfiltered?otherCount:counts.get(id)||0);
    if(label.textContent!==count)label.textContent=count;
  }
  for(const button of shapeButtons.children)setPressed(button,button.dataset.shape===shape);
  if(showHighlights)results=highlights;
  else if(unfiltered&&category==='other')results=otherItems;
  else results=inScope.filter(item=>(category==='all'||item.category===category)&&(shape==='all'||item.shape===shape));
  const firstIds=new Set(results.slice(0,initialCardCount).map(item=>item.id));
  for(const card of cards.values())setCardVisibility(card,firstIds.has(card.item.id));
  visibleCards=[];
  resultCount=results.length;
  grid.toggleAttribute('data-wide-only',resultCount>0&&results.every(item=>item.previewSize));
  empty.hidden=resultCount!==0||!otherFeedback.hidden;
  galleryEnd.hidden=resultCount<=initialCardCount;
  localizeResults();
  appendCards();
  if(!resultCount){syncHeadings();fillWideRows();}
  root.dataset.ready='true';
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
grid.addEventListener('click',event=>{
  const button=event.target.closest('[data-view-all]');
  if(!button)return;
  selectCategory(button.dataset.viewAll);
  const first=visibleCards[0]?.element;
  if(first){
    first.tabIndex=-1;
    first.focus({preventScroll:true});
  }
  $('#works').scrollIntoView({block:'start',behavior:'instant'});
});
shapeButtons.addEventListener('click',event=>{
  const button=event.target.closest('[data-shape]');
  if(!button)return;
  shape=button.dataset.shape;
  filter();
});
function updateSearch(){
  filter();
  clearTimeout(browseUrlTimer);
  browseUrlTimer=setTimeout(updateBrowseUrl,250);
}
search.addEventListener('input',event=>{
  if(!event.isComposing)updateSearch();
});
search.addEventListener('compositionend',updateSearch);
$('#reset-filters').addEventListener('click',()=>{
  category=shape='all';
  search.value='';
  renderShapes();
  updateBrowseUrl();
  if(favorites.only)$('#gallery-favorites').click();
  else filter();
  search.focus({preventScroll:true});
});

function replaceLocation(url){
  try{history.replaceState(null,'',url);}catch{}
}

function updateBrowseUrl(){
  clearTimeout(browseUrlTimer);
  const url=new URL(location.href);
  url.searchParams.delete('view');
  url.searchParams.delete('source');
  url.searchParams.delete('task');
  const query=search.value.trim();
  if(query)url.searchParams.set('q',query);
  else url.searchParams.delete('q');
  if(url.href!==location.href)replaceLocation(url);
}

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
addEventListener('scroll',()=>{
  lightBounds=undefined;
  const now=performance.now(),y=scrollY;
  const elapsed=Math.max(8,Math.min(32,now-lastScrollTime));
  const fast=Math.abs(y-lastScrollY)/elapsed>.8;
  lastScrollY=y;
  lastScrollTime=now;
  if(!fast)return;
  const wasScrolling=Boolean(scrollTimer);
  clearTimeout(scrollTimer);
  scrollTimer=setTimeout(()=>{
    scrollTimer=0;
    syncMotion();
  },95);
  if(!wasScrolling)syncMotion();
},{passive:true});
root.addEventListener('ui-moments:theme',()=>{
  themeColor=foreground();
  for(const card of mounted){
    if(card.preview)renderPreview(card);
    else syncCard(card);
  }
  if(componentDialog.open)sendEmbed(componentFrame,canAnimate());
});
loaderDialog.addEventListener('close',syncMotion);

const componentCopy=$('#component-copy');
const componentReuse=$('#component-reuse'),componentDownload=$('#component-download');
function localizeComponent(){
  const {category,type}=component;
  const heading=workHeading(component);
  const title=$('#component-title');
  title.lang=heading.lang;
  title.textContent=heading.name;
  const summary=localizedText(component.summary,component.summaryZh);
  const description=$('#component-description');
  description.lang=summary.lang;
  description.textContent=summary.text;
  $('#component-kind').textContent=`${groupHeading(category)} / ${t(type)}`;
  componentFrame.title=t('{name} enlarged preview',heading);
  componentCopy.textContent=t(componentCopy.hasAttribute('data-error')?'Retry loading':'Copy HTML');
  setComponentPreviewState(componentPreviewState);
}

function setComponentPreviewState(state){
  componentPreviewState=state;
  componentPreviewFeedback.hidden=state==='ready'||!state;
  componentRetry.hidden=state!=='error';
  componentPreviewStatus.textContent=state==='error'?t('Preview could not load.'):state==='loading'?t('Loading preview…'):'';
}

function loadComponentPreview(){
  stopComponentPreview?.();
  const focusRetry=document.activeElement===componentRetry;
  delete componentFrame.dataset.loaded;
  setComponentPreviewState('loading');
  const url=embedUrl(component.demo,root.dataset.theme);
  url.searchParams.set('surface','detail');
  if(!canAnimate())url.searchParams.set('paused','1');
  stopComponentPreview=watchPreview(componentFrame,component,{
    ready(){
      stopComponentPreview=null;
      setComponentPreviewState('ready');
      sendEmbed(componentFrame,canAnimate());
      if(focusRetry&&document.activeElement===$('#component-close'))componentFrame.focus({preventScroll:true});
    },
    failed(){
      stopComponentPreview=null;
      componentFrame.src='about:blank';
      setComponentPreviewState('error');
      if(focusRetry&&document.activeElement===$('#component-close'))componentRetry.focus({preventScroll:true});
    },
  });
  componentFrame.src=url.href;
  // The retry button is hidden until the new attempt finishes.
  if(focusRetry)$('#component-close').focus({preventScroll:true});
}
componentRetry.addEventListener('click',loadComponentPreview);

function openComponent(item,button){
  component=item;
  componentTrigger=button;
  componentVisit++;
  $('#component-source').href=componentSourceHref(item);
  $('#component-open').href=item.demo;
  componentCopy.hidden=Boolean(item.multiFile)||item.demo.includes('/dist/');
  componentCopy.disabled=false;
  componentCopy.removeAttribute('data-error');
  const standalone=standaloneExamplePath(item);
  componentReuse.hidden=!standalone;
  if(standalone){
    componentDownload.href=standalone;
    componentDownload.download=`ui-moments-${item.id}.html`;
  }else{
    componentDownload.removeAttribute('href');
  }
  localizeComponent();
  refreshComponentPrompt();
  componentDialog.showModal();
  document.body.style.overflow='hidden';
  loadComponentPreview();
  replaceLocation('#'+item.id);
}

function localizeDetailButton({detail:button,item}){
  const state=button.dataset.detailState;
  const label=t(state==='loading'?'Loading details':state==='error'?'Retry details':'Details');
  button.querySelector('.ui-detail-label').textContent=label;
  button.setAttribute('aria-label',`${label} ${workHeading(item).name}`);
}

function setDetailState(card,state){
  const button=card.detail;
  if(!button)return;
  const label=button.querySelector('.ui-detail-label');
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
  localizeDetailButton(card);
}

function cancelOpening(){
  if(!opening)return;
  setDetailState(opening.card,'ready');
  opening=null;
}

async function openDetails(card){
  if(modalOpen()||closingForHash||opening?.card===card)return;
  cancelOpening();
  const {item,detail}=card;
  const attempt={card};
  opening=attempt;
  setDetailState(card,'loading');
  try{
    const [license]=await Promise.all([item.loader ? fetchText('LICENSE') : null,homeStylesReady,loadDetailModules()]);
    if(opening!==attempt)return;
    favorites.showFor(item.id);
    if(item.loader){
      loaderItemId=item.id;
      editor.open(item.loader,detail,license);
    }else{
      openComponent(item,detail);
    }
    setDetailState(card,'ready');
    syncMotion();
  }catch{
    if(opening===attempt){
      setDetailState(card,'error');
      editor?.notify(t('{name} details could not load. Try again.',workHeading(item)));
    }
  }finally{
    if(opening===attempt)opening=null;
  }
}

grid.addEventListener('click',event=>{
  const element=event.target.closest('[data-ui]');
  if(!element)return;
  const card=cards.get(element.dataset.ui);
  if(event.target.closest('.ui-caption')){
    void openDetails(card);
  }else if(event.target.closest('.ui-preview-retry')&&card.failed){
    card.failed=false;
    paintFrameRetry(card,true);
    updateCard(card);
    schedulePreviews();
  }else if(event.target.closest('.ui-playback')){
    if(card.failed){
      card.failed=false;
      delete card.stage.dataset.previewState;
      card.stage.replaceChildren();
      card.stage.setAttribute('aria-label',t('Pause {name} preview',workHeading(card.item)));
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
function clearComponentHash(){
  if(location.hash==='#'+component?.id)replaceLocation(location.pathname+location.search);
}

function closeComponent(){
  clearComponentHash();
  componentDialog.close();
}
$('#component-close').addEventListener('click',closeComponent);
addEventListener('message',event=>{
  if(componentDialog.open&&event.origin===location.origin&&event.source===componentFrame.contentWindow
    &&event.data?.type==='ui-moments:dismiss-detail')closeComponent();
});
componentDialog.addEventListener('cancel',clearComponentHash);
componentDialog.addEventListener('close',()=>{
  if(componentDialog.open)return;
  componentVisit++;
  stopComponentPreview?.();
  stopComponentPreview=null;
  delete componentFrame.dataset.loaded;
  setComponentPreviewState();
  componentFrame.src='about:blank';
  editor.clearFeedback();
  document.body.style.overflow='';
  clearComponentHash();
  const focused=document.activeElement;
  if(focused===document.body||focused===componentTrigger||componentDialog.contains(focused)){
    restoreDetailFocus(componentTrigger);
  }
  syncMotion();
});

componentCopy.addEventListener('click',async()=>{
  const button=componentCopy;
  const item=component;
  const visit=componentVisit;
  const isCurrent=()=>componentVisit===visit&&componentDialog.open;
  button.removeAttribute('data-error');
  button.textContent=t('Copy HTML');
  button.disabled=true;
  try{
    const standalone=standaloneExamplePath(item);
    if(standalone){
      const code=await fetchText(standalone);
      if(isCurrent())await editor.copy(code,{failure:'Download the HTML file to view or copy its code.',isCurrent});
      return;
    }
    const url=new URL(item.demo,location.href);
    const [page,license]=await Promise.all([fetchText(url.pathname),fetchText('LICENSE')]);
    let code=page.replace('<script src="../../assets/embed.js"></script>','')
      .replace('<link rel="icon" href="../../assets/icon.svg">','')
      .replace(/href="(\.\.?\/[^"]*)"/g,(_match,path)=>{
        const target=new URL(path,url);
        return `href="${target.pathname===url.pathname?target.hash||'#':target.href}"`;
      });
    if(page.includes('href="interaction.css"')){
      const css=await fetchText('gallery/originals/interaction.css');
      code=code.replace('<link rel="stylesheet" href="interaction.css">',()=>`<style>${css}</style>`);
    }
    if(page.includes('from "./interaction.mjs"')){
      const script=await fetchText('gallery/originals/interaction.mjs');
      code=code.replace(/^    import .* from "\.\/interaction\.mjs";$/m,()=>script);
    }
    const notices=[license.trim()];
    const font='assets/fonts/Geist-latin-wght.woff2';
    if(code.includes(`../../${font}`)){
      const [data,fontLicense]=await Promise.all([fetchFontData(font),fetchText('assets/fonts/OFL-Geist.txt')]);
      code=code.replaceAll(`../../${font}`,data);
      notices.push(fontLicense.trim());
    }
    if(url.hash)code=code.replace('<head>',`<head>\n<script>history.replaceState(null,'',${JSON.stringify(url.hash)})</script>`);
    const origin=item.credit
      ?`Reference: ${item.credit.name} ${item.credit.url}\n${item.credit.note||'Interaction reference, implemented by UI Moments.'}`
      :'Original design and implementation by UI Moments.';
    code+=`\n<!-- UI Moments\n${origin}\n${notices.join('\n\n')}\n-->\n`;
    if(isCurrent())await editor.copy(code,{isCurrent});
  }catch{
    if(isCurrent()){
      button.dataset.error='';
      button.textContent=t('Retry loading');
    }
  }finally{
    if(isCurrent())button.disabled=false;
  }
});

function fromHash(){
  if(closingForHash)return;
  const id=location.hash.slice(1);
  const current=loaderDialog.open?loaderDialog:componentDialog.open?componentDialog:null;
  if(current){
    if(id===(current===loaderDialog?loaderItemId:component.id))return;
    closingForHash=true;
    current.addEventListener('close',()=>{
      closingForHash=false;
      fromHash();
    },{once:true});
    current.close();
    return;
  }
  if(otherHash&&otherHash!==id){
    otherHash=null;
    filter();
  }
  if(id==='loaders'){
    cancelOpening();
    selectCategory('loading');
    return;
  }
  const item=itemsById.get(id);
  if(item){
    if(otherHash){
      otherHash=null;
      filter();
    }
    void openDetails(cards.get(id)??{item,detail:null});
    return;
  }
  cancelOpening();
  if(id.startsWith('astryx-variant-')){
    replaceLocation(location.pathname+location.search);
  }else if(id&&mayBeOther(id)){
    if(otherState==='ready'){
      otherHash=null;
      replaceLocation(location.pathname+location.search);
    }else{
      otherHash=id;
    }
    filter();
  }
}
addEventListener('hashchange',fromHash);

function localizeCard(card){
  const {item}=card;
  const heading=workHeading(item);
  const title=card.element.querySelector('.ui-caption h2');
  title.lang=heading.lang;
  title.textContent=heading.name;
  card.element.querySelector('.ui-caption p').textContent=kindLabel(item);
  localizeDetailButton(card);
  if(item.loader){
    card.stage.setAttribute('aria-label',t(card.failed?'Retry {name} preview':'Pause {name} preview',heading));
    if(card.failed)card.stage.firstElementChild.textContent=t('Preview failed. Click to retry.');
  }
  if(card.frame)card.frame.title=t('{name} interactive preview',heading);
  if(card.original)localizeOriginal(card);
  if(card.retry)paintFrameRetry(card,!card.failed);
}

onLanguageChange(()=>{
  localizeIntro();
  localizeCategories();
  renderShapes();
  localizeResults();
  localizeOtherFeedback();
  motionButton.textContent=t(playing?'Pause motion':'Play motion');
  for(const card of cards.values())localizeCard(card);
  if(componentDialog.open)localizeComponent();
});

renderShapes();
// Register the initial cards printed in the published HTML.
for(const element of grid.querySelectorAll(':scope > [data-ui]')){
  const card=registerCard(itemsById.get(element.dataset.ui),element);
  if(root.lang!=='en')localizeCard(card);
}
filter();
setPlaying(playing);
if(params.has('source'))updateBrowseUrl();
fromHash();
