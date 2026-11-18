import {foreground,background} from '../../assets/site.mjs';
import {previewProps} from './catalog.mjs';
import {escapeHtml as esc,htmlExample,reactExample} from './snippets.mjs';
import {loaderPrompt,mountPrompt} from '../../assets/prompt.mjs';

export function createLoaderEditor({license,isPlaying=()=>true}){
const $=selector=>document.querySelector(selector);
const root=document.documentElement,detail=$('#detail'),toast=$('#toast');
let selected=null,props={},format='html',trigger=null,toastTimer;
function effect(item,values){const element=document.createElement(item.tag);for(const [name,value] of Object.entries(values))element.setAttribute(name,String(value));element.setAttribute('aria-hidden','true');return element;}
function syncMotion(){for(const animation of $('#selected-preview').firstElementChild?.shadowRoot?.getAnimations()||[])isPlaying()&&detail.open?animation.play():animation.pause();}
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
  paintCode();refreshPrompt();requestAnimationFrame(syncMotion);
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
  history.replaceState(null,'',location.pathname+location.search);clearFeedback();trigger?.focus({preventScroll:true});
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
async function copyWithFeedback(text,{success='已复制，署名与许可证一并保留',failure='复制受限，请在代码框内全选复制'}={}){
  const ok=await copy(text);notify(ok?success:failure);return ok;
}
const refreshPrompt=mountPrompt(detail,()=>loaderPrompt(selected,props,$('#selected-preview').firstElementChild.shadowRoot.innerHTML,license,background()),copyWithFeedback);
$('#copy').addEventListener('click',()=>copyWithFeedback(currentCode()));
$('#download').addEventListener('click',()=>{
  const url=URL.createObjectURL(new Blob([currentCode()],{type:format==='html'?'text/html;charset=utf-8':'text/plain;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=`ui-moments-${selected.key}.${format==='html'?'html':'jsx'}`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
root.addEventListener('ui-moments:theme',event=>{if(detail.open&&props.color===event.detail.previousForeground){props.color=foreground();controls();paintSelected();}});
return {open,syncMotion,copy:copyWithFeedback,clearFeedback,isOpen:()=>detail.open};
}
