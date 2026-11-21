import {foreground,background} from '../../assets/site.mjs';
import {onLanguageChange,translate as t} from '../../assets/locale.mjs';
import {previewProps} from './catalog.mjs';
import {escapeHtml as esc,htmlExample,reactExample} from './snippets.mjs';
import {loaderPrompt,mountPrompt} from '../../assets/prompt.mjs';
import {originalMarkup} from './originals.mjs';

export function createLoaderPreview(item,values,providers={}){
  const customPreview=providers[item.provider]?.preview;
  if(customPreview){
    const element=customPreview(item,values);
    element.setAttribute('aria-hidden','true');
    return element;
  }
  const element=document.createElement(item.original?'span':item.tag);
  if(item.original)element.attachShadow({mode:'open'}).innerHTML=originalMarkup(item,values);
  else for(const [name,value] of Object.entries(values))element.setAttribute(name,String(value));
  if(item.provider==='loading-ui')element.setAttribute('surface',getComputedStyle(document.documentElement).getPropertyValue('--c-surface').trim()||background());
  element.setAttribute('aria-hidden','true');
  return element;
}

export function setPreviewPlaying(preview,playing){
  if(preview?.setPlaying)preview.setPlaying(playing);
  else for(const animation of preview?.shadowRoot?.getAnimations()||[])playing?animation.play():animation.pause();
}

export function createLoaderEditor({license,providers={},isPlaying=()=>true,restoreFocus=button=>button?.focus({preventScroll:true})}){
const $=selector=>document.querySelector(selector);
const root=document.documentElement,detail=$('#detail'),toast=$('#toast');
let selected=null,props={},format='html',trigger=null,toastTimer,itemLicense;
const provider=()=>providers[selected?.provider];
const selectedLicense=()=>provider()?.license||itemLicense;
const defaults=()=>previewProps(selected,foreground(),root.dataset.theme);
function syncMotion(){setPreviewPlaying($('#selected-preview').firstElementChild,isPlaying()&&detail.open);}
const ranges={
  size:{label:'Size',min:16,max:160,step:1,suffix:' px'},
  speed:{label:'Duration',min:.2,max:5,step:.05,suffix:' s'},
  stroke:{label:'Stroke width',min:.5,max:12,step:.5,suffix:' px'},
  'stroke-length':{label:'Arc length',min:.05,max:.9,step:.01,suffix:''},
  'bg-opacity':{label:'Track opacity',min:0,max:1,step:.05,suffix:''},
};
function controls(){
  $('#controls').innerHTML=Object.entries(props).map(([key,value])=>{
    if(key==='color')return `<div class="control"><label for="prop-color"><span data-parameter="Color">${t('Color')}</span> <input class="color-input" id="prop-color" type="color" data-prop="color" value="${esc(value)}"></label></div>`;
    const range=ranges[key];if(!range)return '';
    return `<div class="control"><label for="prop-${key}"><span data-parameter="${range.label}">${t(range.label)}</span><output for="prop-${key}">${value}${range.suffix}</output></label><input id="prop-${key}" data-prop="${key}" type="range" min="${range.min}" max="${range.max}" step="${range.step}" value="${value}"></div>`;
  }).join('');
}
function currentCode(){
  if(provider())return format==='react'?provider().react(selected,props,background()):provider().html(selected,props,background());
  return format==='react'?reactExample(selected,props,selectedLicense()):htmlExample(selected,props,$('#selected-preview').firstElementChild.shadowRoot.innerHTML,selectedLicense(),background());
}
function localizeCode(){
  $('#tab-html').textContent=t(provider()?'Standalone HTML':'HTML + CSS');
  $('#code-help').textContent=t(provider()?(format==='html'?provider().htmlHelp:provider().reactHelp):format==='html'
    ?'Save as an .html file and open it in a browser.'
    :selected.original?'Use this JSX in a React project.':'Install the specified version of LDRS in your React project.');
  $('#download').textContent=t(format==='html'?'Download HTML':provider()?'Download TSX':'Download JSX');
}
function paintCode(){
  localizeCode();
  $('#code').value=currentCode();
  $('#code-panel').setAttribute('aria-labelledby','tab-'+format);
  for(const tab of document.querySelectorAll('[data-format]')){const active=tab.dataset.format===format;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;}
}
function paintSelected(){
  $('#selected-preview').replaceChildren(createLoaderPreview(selected,props,providers));
  paintCode();refreshPrompt();requestAnimationFrame(syncMotion);
}
const credit=detail.querySelector('.code-credit');
function localizeDetail(){
  const item=selected;
  $('#detail-group').textContent=`${t('Loading')} / ${t(item.group)}`;
  const creditText=credit.querySelector('span');
  if(creditText){
    creditText.textContent=item.origin?`${item.origin.name} · ${item.origin.author} · ${item.origin.license}. ${t('Integration and preview by UI Moments.')}`:t(item.original?'MIT license.':'The example includes the original LDRS attribution and MIT license.');
    const source=credit.querySelector('[data-upstream]');
    if(source)source.textContent=t(item.reference?'Inspiration ↗':'Upstream repository ↗');
  }
}
function open(item,button,sourceLicense=license){
  itemLicense=sourceLicense;
  selected=item;props=defaults();format='html';trigger=button;
  $('#detail-title').textContent=item.name;$('#detail-description').textContent=item.description;
  if(credit.querySelector('span')){
    credit.querySelector('a').href=item.origin?.licensePath||(item.original?'LICENSE':'gallery/loaders/vendor/ldrs/LICENSE');
    let source=credit.querySelector('[data-upstream]');
    if(!source){source=document.createElement('a');source.dataset.upstream='';source.target='_blank';source.rel='noopener';credit.append(source);}
    source.hidden=!(item.origin||item.reference);
    source.href=item.reference||item.origin?.repository||'#';
  }
  localizeDetail();
  controls();paintSelected();detail.showModal();document.body.style.overflow='hidden';
  history.replaceState(null,'','#'+item.key);
}
function clearDetailHash(){
  if(location.hash==='#'+selected?.key)history.replaceState(null,'',location.pathname+location.search);
}
function closeDetail(){clearDetailHash();detail.close();}
$('#close').addEventListener('click',closeDetail);
detail.addEventListener('cancel',clearDetailHash);
detail.addEventListener('click',event=>{if(event.target===detail){const r=detail.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeDetail();}});
detail.addEventListener('close',()=>{
  $('#selected-preview').replaceChildren();document.body.style.overflow='';
  clearDetailHash();clearFeedback();restoreFocus(trigger);
});
$('#controls').addEventListener('input',event=>{
  const input=event.target,key=input.dataset.prop;if(!key)return;
  props[key]=key==='color'?input.value:Number(input.value);
  const output=input.parentElement.querySelector('output');if(output)output.textContent=props[key]+ranges[key].suffix;
  // 上游部分组件更改属性时会重建SVG；创建新实例可保持44款的预览与导出一致。
  paintSelected();
});
$('#reset').addEventListener('click',()=>{props=defaults();controls();paintSelected();});
for(const tab of document.querySelectorAll('[data-format]')){
  tab.addEventListener('click',()=>{format=tab.dataset.format;paintCode();});
  tab.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();format=event.key==='Home'?'html':event.key==='End'?'react':format==='html'?'react':'html';paintCode();$('#tab-'+format).focus();}});
}
function notify(message){
  clearTimeout(toastTimer);(document.querySelector('dialog[open]')||document.body).append(toast);toast.textContent=message;toast.hidden=false;toastTimer=setTimeout(()=>{toast.hidden=true;},3200);
}
function clearFeedback(){clearTimeout(toastTimer);toast.hidden=true;document.body.append(toast);}
async function copy(text){
  try{await navigator.clipboard.writeText(text);return true;}catch{
    const field=document.createElement('textarea');field.value=text;field.style.cssText='position:fixed;opacity:0;top:0;left:0';
    (document.querySelector('dialog[open]')||document.body).append(field);field.select();let copied=false;
    try{copied=document.execCommand('copy');}catch{}field.remove();return copied;
  }
}
async function copyWithFeedback(text,{success='Copied with attribution and license',failure='Select and copy the code manually'}={}){
  const ok=await copy(text);notify(t(ok?success:failure));return ok;
}
const refreshPrompt=mountPrompt(detail,()=>provider()?provider().prompt(selected,props,background()):loaderPrompt(selected,props,$('#selected-preview').firstElementChild.shadowRoot.innerHTML,selectedLicense(),background()),copyWithFeedback);
$('#copy').addEventListener('click',()=>copyWithFeedback(currentCode()));
$('#download').addEventListener('click',()=>{
  const url=URL.createObjectURL(new Blob([currentCode()],{type:format==='html'?'text/html;charset=utf-8':'text/plain;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=`ui-moments-${selected.key}.${format==='html'?'html':provider()?'tsx':'jsx'}`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
root.addEventListener('ui-moments:theme',event=>{
  if(!detail.open)return;
  const previousTheme=root.dataset.theme==='light'?'dark':'light';
  if(props.color===previewProps(selected,event.detail.previousForeground,previousTheme).color){
    props.color=defaults().color;controls();paintSelected();
  }else if(provider())paintSelected();
});
onLanguageChange(()=>{
  if(!detail.open)return;
  localizeDetail();
  localizeCode();
  for(const label of detail.querySelectorAll('[data-parameter]'))label.textContent=t(label.dataset.parameter);
});
return {open,syncMotion,copy:copyWithFeedback,notify,clearFeedback,isOpen:()=>detail.open};
}
