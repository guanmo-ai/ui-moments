import {setupSite,foreground,background} from '../../assets/site.mjs';
import * as ldrs from './vendor/ldrs/dist/index.js';
import {loaders,groups,previewProps} from './catalog.mjs';
import {escapeHtml as esc,htmlExample,reactExample} from './snippets.mjs';

const $=selector=>document.querySelector(selector);
const root=document.documentElement,grid=$('#grid'),detail=$('#detail'),toast=$('#toast');
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
let playing=!reduced.matches,group='全部',selected=null,props={},format='html',trigger=null,toastTimer;
const visible=new Set();
setupSite();

let license;
try{
  const response=await fetch('./vendor/ldrs/LICENSE');
  if(!response.ok)throw new Error('许可证载入失败');
  license=await response.text();
}catch(error){$('#load-error').hidden=false;throw error;}

for(const item of loaders)ldrs[item.key].register(item.tag);
function effect(item,values){
  const element=document.createElement(item.tag);
  for(const [name,value] of Object.entries(values))element.setAttribute(name,String(value));
  element.setAttribute('aria-hidden','true');
  return element;
}
function setMotion(element,run){
  for(const animation of element?.shadowRoot?.getAnimations()||[])run?animation.play():animation.pause();
}
function syncMotion(){
  for(const card of grid.children)setMotion(card.querySelector('.sample > *'),playing&&!card.hidden&&visible.has(card));
  setMotion($('#selected-preview').firstElementChild,playing&&detail.open);
  $('#motion').textContent=playing?'暂停动效':'播放动效';
  $('#motion').setAttribute('aria-pressed',String(!playing));
}

for(const [index,item] of loaders.entries()){
  const card=document.createElement('article');card.className='loader-card';card.dataset.key=item.key;
  card.innerHTML=`<button class="open-loader" type="button" aria-label="${esc(item.name)}：预览与代码"><div class="sample"></div><div class="card-info"><span class="card-number">${String(index+1).padStart(2,'0')}</span><strong>${esc(item.name)}</strong><small>${esc(item.group)}</small></div></button><button class="card-copy" type="button" aria-label="复制 ${esc(item.name)} 的HTML代码">复制代码</button>`;
  card.querySelector('.sample').append(effect(item,previewProps(item,foreground())));
  grid.append(card);
}
$('#groups').innerHTML=['全部',...groups].map(name=>`<button type="button" data-group="${esc(name)}" aria-pressed="${name===group}">${esc(name)}</button>`).join('');
const observer=new IntersectionObserver(entries=>{
  for(const entry of entries)entry.isIntersecting?visible.add(entry.target):visible.delete(entry.target);
  syncMotion();
},{rootMargin:'80px'});
for(const card of grid.children)observer.observe(card);

function filter(){
  const query=$('#search').value.trim().toLocaleLowerCase();let count=0;
  for(const [index,card] of [...grid.children].entries()){
    const item=loaders[index];
    card.hidden=(group!=='全部'&&item.group!==group)||![item.key,item.name,item.description,item.group].join(' ').toLocaleLowerCase().includes(query);
    if(!card.hidden)count++;
  }
  $('#count').textContent=`${count} / 44`;$('#empty').hidden=count!==0;syncMotion();
}
$('#search').addEventListener('input',filter);
$('#groups').addEventListener('click',event=>{
  const button=event.target.closest('[data-group]');if(!button)return;group=button.dataset.group;
  for(const other of $('#groups').children)other.setAttribute('aria-pressed',String(other===button));filter();
});
$('#motion').addEventListener('click',()=>{playing=!playing;syncMotion();});
reduced.addEventListener('change',event=>{playing=!event.matches;syncMotion();});

const ranges={
  size:{label:'尺寸',min:16,max:160,step:1,suffix:' px'},
  speed:{label:'周期',min:.2,max:5,step:.05,suffix:' 秒'},
  stroke:{label:'线条粗细',min:.5,max:12,step:.5,suffix:' px'},
  'stroke-length':{label:'线段长度',min:.05,max:.9,step:.01,suffix:''},
  'bg-opacity':{label:'轨道透明度',min:0,max:1,step:.05,suffix:''},
};
function controls(){
  $('#controls').innerHTML=Object.entries(props).map(([key,value])=>{
    if(key==='color')return `<div class="control"><label for="prop-color">颜色 <input class="color-input" id="prop-color" type="color" data-prop="color" value="${esc(value)}"></label></div>`;
    const range=ranges[key];if(!range)return '';
    return `<div class="control"><label for="prop-${key}">${range.label}<output for="prop-${key}">${value}${range.suffix}</output></label><input id="prop-${key}" data-prop="${key}" type="range" min="${range.min}" max="${range.max}" step="${range.step}" value="${value}"></div>`;
  }).join('');
}
function currentCode(){
  return format==='react'?reactExample(selected,props,license):htmlExample(selected,props,$('#selected-preview').firstElementChild.shadowRoot.innerHTML,license,background());
}
function paintCode(){
  $('#code').value=currentCode();
  $('#code-help').textContent=format==='html'?'独立 HTML 页面，无需安装依赖。保存为 .html 文件后即可打开。':'React 示例包含组件、样式导入及依赖安装说明。';
  $('#download').textContent=format==='html'?'下载 HTML':'下载 JSX';
  $('#code-panel').setAttribute('aria-labelledby','tab-'+format);
  for(const tab of document.querySelectorAll('[data-format]')){const active=tab.dataset.format===format;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;}
}
function paintSelected(){
  $('#selected-preview').replaceChildren(effect(selected,props));
  paintCode();requestAnimationFrame(syncMotion);
}
function open(item,button){
  selected=item;props=previewProps(item,foreground());format='html';trigger=button;
  $('#detail-title').textContent=item.name;$('#detail-group').textContent='加载动效 / '+item.group;$('#detail-description').textContent=item.description;
  controls();paintSelected();detail.showModal();document.body.style.overflow='hidden';
  history.replaceState(null,'','#'+item.key);
}
$('#close').addEventListener('click',()=>detail.close());
detail.addEventListener('click',event=>{if(event.target===detail){const r=detail.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)detail.close();}});
detail.addEventListener('close',()=>{
  $('#selected-preview').replaceChildren();document.body.style.overflow='';
  history.replaceState(null,'',location.pathname+location.search);document.body.append(toast);trigger?.focus({preventScroll:true});
});
$('#controls').addEventListener('input',event=>{
  const input=event.target,key=input.dataset.prop;if(!key)return;
  props[key]=key==='color'?input.value:Number(input.value);
  const output=input.parentElement.querySelector('output');if(output)output.textContent=props[key]+ranges[key].suffix;
  // 上游部分组件更改属性时会重建SVG；创建新实例可保持44款的预览与导出一致。
  paintSelected();
});
$('#reset').addEventListener('click',()=>{props=previewProps(selected,foreground());controls();paintSelected();});
for(const tab of document.querySelectorAll('[data-format]')){
  tab.addEventListener('click',()=>{format=tab.dataset.format;paintCode();});
  tab.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();format=event.key==='Home'?'html':event.key==='End'?'react':format==='html'?'react':'html';paintCode();$('#tab-'+format).focus();}});
}
function notify(message){
  clearTimeout(toastTimer);(detail.open?detail:document.body).append(toast);toast.textContent=message;toast.hidden=false;toastTimer=setTimeout(()=>{toast.hidden=true;},3200);
}
async function copy(text){
  try{await navigator.clipboard.writeText(text);return true;}catch{
    const field=document.createElement('textarea');field.value=text;field.style.cssText='position:fixed;opacity:0;top:0;left:0';
    (detail.open?detail:document.body).append(field);field.select();let copied=false;
    try{copied=document.execCommand('copy');}catch{}field.remove();return copied;
  }
}
async function copyWithFeedback(text){
  const ok=await copy(text);notify(ok?'已复制，署名与许可证一并保留':'复制受限，请在代码框内全选复制');return ok;
}
$('#copy').addEventListener('click',()=>copyWithFeedback(currentCode()));
$('#download').addEventListener('click',()=>{
  const url=URL.createObjectURL(new Blob([currentCode()],{type:format==='html'?'text/html;charset=utf-8':'text/plain;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=`ui-moments-${selected.key}.${format==='html'?'html':'jsx'}`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
grid.addEventListener('click',async event=>{
  const card=event.target.closest('.loader-card');if(!card)return;const item=loaders.find(item=>item.key===card.dataset.key);
  if(event.target.closest('.card-copy')){
    const node=card.querySelector('.sample > *');const values=previewProps(item,foreground());
    if(!await copyWithFeedback(htmlExample(item,values,node.shadowRoot.innerHTML,license,background()))){open(item,card.querySelector('.card-copy'));$('#code').focus();$('#code').select();}
  }else if(event.target.closest('.open-loader'))open(item,card.querySelector('.open-loader'));
});
root.addEventListener('ui-moments:theme',event=>{
  for(const [index,card] of [...grid.children].entries())card.querySelector('.sample').replaceChildren(effect(loaders[index],previewProps(loaders[index],foreground())));
  if(detail.open&&props.color===event.detail.previousForeground){props.color=foreground();controls();paintSelected();}
  requestAnimationFrame(syncMotion);
});
filter();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));syncMotion();
const fromHash=()=>{const item=loaders.find(item=>item.key===location.hash.slice(1));if(item&&!detail.open)open(item,grid.querySelector(`[data-key="${item.key}"] .open-loader`));};
addEventListener('hashchange',fromHash);fromHash();
document.documentElement.dataset.ready='true';
