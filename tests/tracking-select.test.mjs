import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../contracts-module.js',import.meta.url),'utf8');
const fill=source.slice(source.indexOf('function fillSelect('),source.indexOf('function forceLegacyAll('));
function setup(){
  const select={value:'B',options:[{text:'Tümü',value:''},{text:'A',value:'A'},{text:'B',value:'B'}],writes:0,replaceChildren(...options){this.writes++;this.options=options}};
  const ctx={select,$:()=>select,canonicalKey:v=>String(v).toLowerCase(),norm:v=>String(v).toLowerCase(),Option:function(text,value){this.text=text;this.value=value}};
  vm.createContext(ctx);vm.runInContext(fill,ctx);return {select,run:values=>vm.runInContext(`fillSelect('filter',${JSON.stringify(values)},'Tümü')`,ctx)};
}
test('aynı seçenekler açık listenin düğümlerini ve seçimi korur',()=>{
  const {select,run}=setup(),options=select.options;
  for(let i=0;i<20;i++)run(['A','B']);
  assert.equal(select.writes,0);assert.equal(select.options,options);assert.equal(select.value,'B');
});
test('yeni seçenekler bir kez güncellenir ve seçim korunur',()=>{
  const {select,run}=setup();run(['A','B','C']);run(['A','B','C']);
  assert.equal(select.writes,1);assert.equal(select.value,'B');assert.equal(select.options.length,4);
});
test('firma değişince mevcut olmayan şantiye seçimi temizlenir',()=>{
  const {select,run}=setup();run(['C']);assert.equal(select.value,'');
});
test('aynı firma veya şantiye etiketi tekrar yazılmaz',()=>{
  const fn=source.slice(source.indexOf('function normalizeFilterCell('),source.indexOf('function refreshOptions('));
  let value='Firma A',writes=0;const cell={get textContent(){return value},set textContent(v){value=v;writes++}};
  const ctx={cell,canonicalLabel:v=>v.trim()};vm.createContext(ctx);vm.runInContext(fn,ctx);
  vm.runInContext('normalizeFilterCell(cell);normalizeFilterCell(cell)',ctx);assert.equal(writes,0);
});
