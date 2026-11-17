import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');

test('主站与加载动效页统一品牌，原作只在来源与许可处署名',async()=>{
  for(const path of ['index.html','gallery/loaders/index.html']){
    const html=await read(path);
    assert.match(html.match(/<title>(.*?)<\/title>/s)[1],/UI Moments/);
    assert.doesNotMatch(html.match(/<title>(.*?)<\/title>/s)[1],/LDRS/i);
    assert.doesNotMatch(html.match(/<header.*?<\/header>/s)[0],/LDRS/i);
    assert.doesNotMatch(html.match(/<section class="(?:intro|wrap hero)".*?<\/section>/s)[0],/LDRS/i);
    assert.doesNotMatch(html,/fonts\.googleapis\.com|fonts\.gstatic\.com/);
  }
  const page=await read('gallery/loaders/index.html');
  assert.match(page,/<details class="sources">[\s\S]*Griffin Johnston/);
  assert.match(await read('index.html'),/esc\(w\.credit\.note \|\|/);
  assert.match(await read('gallery/loaders/vendor/ldrs/LICENSE'),/Copyright \(c\) 2022 Griffin Johnston/);
});

test('新入口和旧链接兼容，画廊指向可用的代码与展示资源',async()=>{
  const context={window:{}};vm.runInNewContext(await read('gallery/works.js'),context);
  const item=context.window.WORKS.find(item=>item.id==='loaders');assert.ok(item);
  assert.equal(item.en,'Loading Animations');assert.match(item.credit.note,/LDRS 1.1.9/);
  for(const path of [item.demo,item.video,item.full,item.poster])await access(new URL(path,root));
  const redirect=await read('gallery/ldrs/index.html');
  assert.match(redirect,/location\.replace\('\.\.\/loaders\/'\+location\.search\+location\.hash\)/);
  for(const path of ['assets/fonts/OFL-Geist.txt','assets/fonts/OFL-GeistMono.txt'])assert.match(await read(path),/SIL OPEN FONT LICENSE/);
});
