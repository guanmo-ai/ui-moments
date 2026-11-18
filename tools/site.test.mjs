import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import vm from 'node:vm';
import {buildCatalog,categories,matches} from '../assets/catalog.mjs';
import {componentPrompt,loaderPrompt} from '../assets/prompt.mjs';
const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');

test('主站与加载动效页统一品牌，原作只在来源与许可处署名',async()=>{
  for(const path of ['index.html','gallery/loaders/index.html']){
    const html=await read(path);
    assert.match(html.match(/<title>(.*?)<\/title>/s)[1],/UI Moments/);
    assert.doesNotMatch(html.match(/<title>(.*?)<\/title>/s)[1],/LDRS/i);
    assert.doesNotMatch(html.match(/<header.*?<\/header>/s)[0],/LDRS/i);
    assert.doesNotMatch(html.match(/<section class="(?:intro|(?:wrap )?hero)".*?<\/section>/s)[0],/LDRS/i);
    assert.doesNotMatch(html,/fonts\.googleapis\.com|fonts\.gstatic\.com/);
  }
  const page=await read('gallery/loaders/index.html');
  assert.match(page,/<details class="sources">[\s\S]*Griffin Johnston/);
  assert.match(await read('assets/gallery.mjs'),/credit\.note/);
  assert.match(await read('gallery/loaders/vendor/ldrs/LICENSE'),/Copyright \(c\) 2022 Griffin Johnston/);
});

test('新入口和旧链接兼容，画廊指向可用的代码与展示资源',async()=>{
  const context={window:{}};vm.runInNewContext(await read('gallery/works.js'),context);
  const items=buildCatalog(context.window.WORKS);
  assert.equal(items.filter(item=>item.loader).length,44);
  assert.equal(items.length,44+context.window.WORKS.filter(item=>!['ldrs','loaders'].includes(item.id)).length);
  assert.equal(new Set(items.map(item=>item.id)).size,items.length);
  assert.ok(!items.some(item=>['ldrs','loaders'].includes(item.id)));
  for(const item of items){
    assert.ok(categories.some(category=>category.id===item.category),item.id);
    if(!item.loader)await access(new URL(item.demo.split('#')[0],root));
  }
  const redirect=await read('gallery/ldrs/index.html');
  assert.match(redirect,/location\.replace\('\.\.\/loaders\/'\+location\.search\+location\.hash\)/);
  for(const path of ['assets/fonts/OFL-Geist.txt','assets/fonts/OFL-GeistMono.txt'])assert.match(await read(path),/SIL OPEN FONT LICENSE/);
});

test('用途分类与形态筛选独立，加载指示器和交互控件保持同级',()=>{
  const items=buildCatalog([{id:'day-night-toggle',title:'开关'},{id:'dimmer',title:'旋钮'},{id:'neon',title:'状态'}]);
  assert.equal(items.filter(item=>matches(item,{category:'input'})).length,2);
  assert.equal(items.filter(item=>matches(item,{category:'feedback'})).length,45);
  assert.equal(items.filter(item=>matches(item,{query:'Waveform'})).length,1);
  assert.ok(items.filter(item=>matches(item,{category:'feedback',shape:'环形'})).every(item=>item.loader.group==='环形'));
  assert.equal(items.filter(item=>matches(item,{category:'input',shape:'环形'})).length,0);
});

test('复制提示词带上当前加载参数和许可，并指向对应的交互场景源码',async()=>{
  const loader=buildCatalog().find(item=>item.id==='ring').loader;
  const license=await read('gallery/loaders/vendor/ldrs/LICENSE');
  const prompt=loaderPrompt(loader,{size:120,color:'#fcfcfc',speed:1.5},'<svg></svg>',license,'#050506');
  assert.match(prompt,/size: 120.*speed: 1\.5/);
  assert.match(prompt,/size=\{120\}/);
  assert.match(prompt,/import 'ldrs\/react\/Ring\.css'/);
  assert.ok(prompt.includes(license.trim()));

  const context={window:{}};vm.runInNewContext(await read('gallery/works.js'),context);
  const horizon=buildCatalog(context.window.WORKS).find(item=>item.id==='horizon');
  const component=componentPrompt(horizon);
  assert.match(component,/blob\/main\/gallery\/light-scenes\/index\.html/);
  assert.match(component,/localhost:5173\/#horizon/);
  assert.match(component,/金色时刻和蓝调时刻/);
});
