import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=html.slice(html.indexOf('function renderAnalysis(){'),html.indexOf('\nfunction renderPlantAnalysis'));
function run(mode,scope){
 const nodes=new Map();const $=id=>{if(!nodes.has(id))nodes.set(id,{value:scope,classList:{toggle(){}},textContent:''});return nodes.get(id);};
 const rows=[{id:1,pompa_var_mi:true,pompa_tipi:'Pompa alpaslan (kiralık)',metraj:20},{id:2,pompa_var_mi:true,pompa_tipi:"42’lik",metraj:70},{id:3,pompa_var_mi:false,metraj:10}];
 let received;
 const ctx={$,analysisMode:mode,analysisRecords:()=>rows,m3:String,document:{querySelectorAll:()=>[]},renderPumpAnalysis:items=>received=items,renderPlantAnalysis:items=>received=items};
 vm.createContext(ctx);vm.runInContext(source,ctx);ctx.renderAnalysis();
 return {ids:Array.from(received,r=>r.id),total:$('analysisTotalM3').textContent,count:$('analysisShipmentCount').textContent};
}
test('kiralık pompa filtresi yalnız kiralık metraj ve kayıtları toplar',()=>{assert.deepEqual(run('pump','rental'),{ids:[1],total:'20 m³',count:1});});
test('kendi pompaları ve tüm pompalar pompasız kayıtları dışlar',()=>{assert.deepEqual(run('pump','own').ids,[2]);assert.deepEqual(run('pump','all').ids,[1,2]);});
test('pompa filtresi diğer analizlerin toplamını daraltmaz',()=>{assert.deepEqual(run('plant','rental').ids,[1,2,3]);});
