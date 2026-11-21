import {setupSite,foreground,background} from '../../assets/site.mjs';
import {onLanguageChange,translate as t} from '../../assets/locale.mjs';
import {loaders,groups,previewProps} from './catalog.mjs';
import {escapeHtml as esc,htmlExample} from './snippets.mjs';
import {createLoaderEditor,createLoaderPreview,setPreviewPlaying} from './editor.mjs';

const $=selector=>document.querySelector(selector);
const root=document.documentElement,grid=$('#grid'),detail=$('#detail');
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
let playing=!reduced.matches,group='All';
const visible=new Set();
const cards=new Map();
const definitions=new Map();
setupSite();

let licenseRequest;
function getLicense(){
  licenseRequest??=fetch('./vendor/ldrs/LICENSE').then(response=>{
    if(!response.ok)throw new Error('Could not load the license');
    return response.text();
  }).catch(error=>{
    licenseRequest=null;
    throw error;
  });
  return licenseRequest;
}

function register(item){
  if(!definitions.has(item.key)){
    definitions.set(item.key,import(`./vendor/ldrs/dist/elements/${item.key}.js`).then(({default:definition})=>{
      if(!customElements.get(item.tag))definition.register(item.tag);
    }));
  }
  return definitions.get(item.key);
}

const isPlaying=()=>playing&&!document.hidden;
const editor=createLoaderEditor({isPlaying});
const valuesFor=item=>previewProps(item,foreground(),root.dataset.theme);
function syncCard(card){
  setPreviewPlaying(card.querySelector('.sample > *'),isPlaying()&&!detail.open&&!card.hidden&&visible.has(card));
}
async function mountCard(card){
  const sample=card.querySelector('.sample');
  if(sample.firstElementChild)return;
  const item=cards.get(card);
  try{
    await register(item);
    if(visible.has(card)&&!sample.firstElementChild){
      sample.replaceChildren(createLoaderPreview(item,valuesFor(item)));
      syncCard(card);
    }
  }catch{
    sample.dataset.error='';
    sample.textContent=t('Preview unavailable');
  }
}
function localizeMotion(){
  $('#motion').textContent=t(playing?'Pause motion':'Play motion');
  $('#motion').setAttribute('aria-pressed',String(!playing));
}
function syncMotion(){
  for(const card of cards.keys())syncCard(card);
  editor.syncMotion();
  localizeMotion();
}

for(const [index,item] of loaders.entries()){
  const card=document.createElement('article');card.className='loader-card';card.dataset.key=item.key;
  card.innerHTML=`<button class="open-loader" type="button"><div class="sample"></div><div class="card-info"><span class="card-number">${String(index+1).padStart(2,'0')}</span><strong lang="en">${esc(item.name)}</strong><small></small></div></button><button class="card-copy" type="button"></button>`;
  cards.set(card,item);
  grid.append(card);
}
$('#groups').innerHTML=['All',...groups].map(name=>`<button type="button" data-group="${esc(name)}" aria-pressed="${name===group}"></button>`).join('');
function localizeCards(){
  for(const button of $('#groups').children)button.textContent=t(button.dataset.group);
  for(const [card,item] of cards){
    card.querySelector('small').textContent=t(item.group);
    card.querySelector('.open-loader').setAttribute('aria-label',t('{name} preview and code',{name:item.name}));
    const copy=card.querySelector('.card-copy');
    copy.textContent=t('Copy code');
    copy.setAttribute('aria-label',t('Copy HTML for {name}',{name:item.name}));
    const error=card.querySelector('.sample[data-error]');
    if(error)error.textContent=t('Preview unavailable');
  }
  localizeMotion();
}
localizeCards();
onLanguageChange(localizeCards);
const observer=new IntersectionObserver(entries=>{
  for(const {target,isIntersecting} of entries){
    if(isIntersecting){
      visible.add(target);
      void mountCard(target);
    }else visible.delete(target);
    syncCard(target);
  }
});
for(const card of grid.children)observer.observe(card);

function filter(){
  const query=$('#search').value.trim().toLocaleLowerCase();let count=0;
  for(const [index,card] of [...grid.children].entries()){
    const item=loaders[index];
    card.hidden=(group!=='All'&&item.group!==group)||![item.key,item.name,item.description,item.group,t(item.group,undefined,'zh-CN')].join(' ').toLocaleLowerCase().includes(query);
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
document.addEventListener('visibilitychange',syncMotion);
detail.addEventListener('close',syncMotion);

let opening=0;
async function useLoader(item,button,copy=false){
  const attempt=++opening;
  try{
    const [,license]=await Promise.all([register(item),getLicense()]);
    if(attempt!==opening||detail.open)return;
    if(copy){
      // Build the exact upstream markup before reading its shadow root.
      const values=valuesFor(item);
      const preview=createLoaderPreview(item,values);
      const host=document.createElement('div');
      host.hidden=true;
      host.append(preview);
      document.body.append(host);
      const markup=preview.shadowRoot.innerHTML;
      host.remove();
      if(await editor.copy(htmlExample(item,values,markup,license,background())))return;
      if(attempt!==opening||detail.open)return;
    }
    editor.open(item,button,license);
    if(copy){$('#code').focus();$('#code').select();}
    syncMotion();
  }catch{
    if(attempt===opening)editor.notify(t('{name} could not load. Try again.',{name:item.name}));
  }
}
grid.addEventListener('click',event=>{
  const card=event.target.closest('.loader-card'),button=event.target.closest('button');
  if(card&&button)void useLoader(cards.get(card),button,button.classList.contains('card-copy'));
});
root.addEventListener('ui-moments:theme',()=>{
  for(const [card,item] of cards){
    const sample=card.querySelector('.sample');
    if(sample.firstElementChild)sample.replaceChildren(createLoaderPreview(item,valuesFor(item)));
  }
  syncMotion();
});
filter();
const fromHash=()=>{
  const item=loaders.find(item=>item.key===location.hash.slice(1));
  if(item&&!detail.open)void useLoader(item,grid.querySelector(`[data-key="${item.key}"] .open-loader`));
  else opening++;
};
addEventListener('hashchange',fromHash);fromHash();
document.documentElement.dataset.ready='true';
