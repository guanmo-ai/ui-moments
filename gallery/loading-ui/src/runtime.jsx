import React from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import css from '../dist/styles.css';
import {demos} from './demos.generated.jsx';

// 暂停时保留当前画面，并卸载原组件，避免Motion在离屏卡片里继续占用资源。
function snapshot(node) {
  const clone=node.cloneNode(true);
  const originals=[node,...node.querySelectorAll('*')];
  const copies=[clone,...clone.querySelectorAll('*')];
  const properties=['transform','translate','rotate','scale','opacity','color','filter','clip-path','background-image','background-position','stroke-dasharray','stroke-dashoffset','stroke-opacity','fill-opacity','r','cx','cy'];
  originals.forEach((source,index)=>{
    const target=copies[index],style=getComputedStyle(source);
    for(const name of properties){const value=style.getPropertyValue(name);if(value)target.style?.setProperty(name,value,'important');}
    target.style?.setProperty('animation','none','important');
    const transforms=source.transform?.animVal;
    if(transforms?.numberOfItems){
      const matrices=[];
      for(let i=0;i<transforms.numberOfItems;i++){const m=transforms.getItem(i).matrix;matrices.push(`matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`);}
      target.setAttribute('transform',matrices.join(' '));
    }
  });
  clone.querySelectorAll('animate,animateTransform').forEach(node=>node.remove());
  return clone;
}

class LoadingUIPreview extends HTMLElement {
  static observedAttributes=['size','color','surface'];
  constructor(){super();this.attachShadow({mode:'open'});this.active=true;}
  connectedCallback(){
    const style=document.createElement('style');style.textContent=css;
    this.mount=document.createElement('div');this.mount.className='canvas';
    this.shadowRoot.replaceChildren(style,this.mount);
    this.applyOptions();
    this.render();
    if(matchMedia('(prefers-reduced-motion:reduce)').matches)this.setPlaying(false);
  }
  disconnectedCallback(){this.reactRoot?.unmount();this.reactRoot=null;}
  attributeChangedCallback(name){
    if(!this.mount)return;
    this.applyOptions();
    if(!this.active&&name!=='size'){this.render();this.freeze();}
  }
  applyOptions(){
    const size=Math.min(160,Math.max(16,Number(this.getAttribute('size'))||96));
    const color=this.getAttribute('color')||'#17171a';
    const surface=this.getAttribute('surface')||'#fafafa';
    this.style.width=`${size*1.5}px`;this.style.height=`${size}px`;
    this.mount.style.cssText=`color:${color};--background:${surface};--mask-color:${surface};--muted:color-mix(in srgb,${color} 35%,transparent);--demo-scale:${size/96};`;
  }
  render(){
    const Demo=demos[this.constructor.slug];
    if(!this.reactRoot){this.mount.replaceChildren();this.reactRoot=createRoot(this.mount);}
    flushSync(()=>this.reactRoot.render(<div className="demo" data-slug={this.constructor.slug}><Demo/></div>));
  }
  freeze(){
    if(!this.reactRoot||!this.mount.firstElementChild)return;
    const frozen=snapshot(this.mount.firstElementChild);
    frozen.style.removeProperty('transform');
    this.reactRoot.unmount();this.reactRoot=null;this.mount.replaceChildren(frozen);
  }
  setPlaying(active){
    if(!this.mount)return;
    this.active=active===true;
    if(this.active){if(!this.reactRoot)this.render();}
    else this.freeze();
  }
}

for(const slug of Object.keys(demos)){
  const tag=`um-loading-ui-${slug}`;
  if(!customElements.get(tag))customElements.define(tag,class extends LoadingUIPreview{static slug=slug;});
}
