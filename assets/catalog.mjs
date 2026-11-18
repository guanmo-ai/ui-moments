import {loaders} from '../gallery/loaders/catalog.mjs';
import {originalLoaders} from '../gallery/loaders/originals.mjs';
import {loadingUILoaders} from '../gallery/loading-ui/catalog.mjs';
import {svgSpinners} from '../gallery/svg-spinners/catalog.mjs';
import {micronWorks} from '../gallery/micron/catalog.mjs';

// 依据组件用途分类；库名和实现技术不作为信息层级。
export const categories=[
  {id:'all',name:'全部 UI'},
  {id:'feedback',name:'反馈与状态'},
  {id:'input',name:'选择与输入'},
  {id:'navigation',name:'导航'},
];
const kinds={
  'day-night-toggle':['input','开关'],
  'elastic-ruler':['input','滑块'],'alignment-switch':['input','分段控件'],'bookmark-press':['input','收藏按钮'],
};
export function buildCatalog(works=[]){
  const effects=[...originalLoaders,...loaders,...loadingUILoaders,...svgSpinners].map(loader=>({
    id:loader.key,title:loader.name,en:loader.name,category:'feedback',type:'加载指示器',
    shape:loader.group,summary:loader.description,
    tags:loader.original?['原创','loading',loader.collection]:[loader.origin?.name||'LDRS',loader.origin?.author||'UI Ball','开源集成'],
    loader,
  }));
  const components=works.filter(work=>!['ldrs','loaders'].includes(work.id)).map(work=>{
    const [category,type]=kinds[work.id]||['input','交互控件'];
    return {...work,category,type};
  });
  // 同级混排，先展示原创动效和不同用途的互动作品。
  const byId=new Map([...components,...effects,...micronWorks].map(item=>[item.id,item]));
  const start=['shutter-steps','paper-fold','day-night-toggle','signal-return','elastic-ruler','alignment-switch','bookmark-press','micron-jelly','svg-spinner-gooey-balls-1'];
  const result=[];
  for(const id of start){if(byId.has(id)){result.push(byId.get(id));byId.delete(id);}}
  return [...result,...byId.values()];
}
export function matches(item,{category='all',shape='all',query=''}={}){
  return (category==='all'||item.category===category)
    &&(shape==='all'||item.shape===shape)
    &&[item.title,item.en,item.type,item.shape,item.summary,...(item.tags||[])].filter(Boolean).join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
}
