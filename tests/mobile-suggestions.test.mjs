import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../cimento-enhancements.js',import.meta.url),'utf8');
const dedupe=source.slice(source.indexOf('  function dedupeRenderedMenus('),source.indexOf('  function addStyles('));

function button(value){
  let text=value;
  return {writes:0,removed:false,get textContent(){return text},set textContent(value){this.writes++;text=value},remove(){this.removed=true}};
}
function run(buttons){
  const root={querySelectorAll:()=>[{querySelectorAll:()=>buttons.filter(b=>!b.removed)}]};
  const context={document:root,title:v=>v.trim(),canonical:v=>v.trim().toLowerCase(),prettier:(a,b)=>a.length>=b.length?a:b};
  vm.runInNewContext(dedupe+';dedupeRenderedMenus();',context);
}

test('normalleşmiş öneriler tekrar gözlendiğinde DOM değişmez',()=>{
  const buttons=[button('Firma 1'),button('Firma 2')];
  for(let i=0;i<10;i++)run(buttons);
  assert.deepEqual(buttons.map(b=>b.writes),[0,0]);
});

test('tekrar eden öneriler bir kez düzeltilir, sonraki gözlem sabittir',()=>{
  const buttons=[button(' Firma 1 '),button('firma 1'),button('Firma 2')];
  run(buttons);
  assert.equal(buttons[0].textContent,'Firma 1');
  assert.equal(buttons[1].removed,true);
  const writes=buttons.map(b=>b.writes);
  run(buttons);
  assert.deepEqual(buttons.map(b=>b.writes),writes);
});

test('öneriler 12 ile kesilmez; basma seçmez, tıklama seçer',async()=>{
  const options=[];
  const menu={classList:{hidden:true,add(){this.hidden=true},remove(){this.hidden=false}},set innerHTML(html){options.length=0;for(const match of html.matchAll(/<button[^>]*>(.*?)<\/button>/g)){const handlers={};options.push({textContent:match[1],addEventListener:(type,handler)=>handlers[type]=handler,handlers})}},querySelectorAll:()=>options};
  const inputHandlers={};
  const input={value:'Test',dataset:{},parentElement:{style:{},contains:()=>true},removeAttribute(){},setAttribute(){},addEventListener:(type,handler)=>inputHandlers[type]=handler};
  const values=Array.from({length:30},(_,i)=>'Test '+i);
  const create=source.slice(source.indexOf('  function createMenuForInput('),source.indexOf('  function fillLists('));
  vm.runInNewContext(create+';createMenuForInput(input,"menu",()=>values);',{input,values,$:()=>menu,canonical:v=>v.toLowerCase(),uniqueSuggestionValues:v=>v,dedupeRenderedMenus(){},document:{addEventListener(){}}});
  await inputHandlers.input();
  assert.equal(options.length,30);
  let prevented=false;
  options[20].handlers.mousedown({preventDefault(){prevented=true}});
  assert.equal(prevented,true);
  assert.equal(input.value,'Test');
  assert.equal(menu.classList.hidden,false);
  options[20].handlers.click();
  assert.equal(input.value,'Test 20');
  assert.equal(menu.classList.hidden,true);
});
