import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const helpers=html.slice(html.indexOf('function iso(d)'),html.indexOf('function phoneFormat(v)'));
const renderStart=html.indexOf('function renderKpis(){');
const render=html.slice(renderStart,html.indexOf('const monthNames=',renderStart));
const selection=html.slice(html.indexOf('function updateKpiMonthPickerLabel(){'),html.indexOf('$("cancelEdit").addEventListener'));

function harness(records,now='2026-10-13T12:00:00'){
  class FixedDate extends Date{
    constructor(...args){super(...(args.length?args:[now]));}
  }
  const ids=['kpiCount','kpiToday','kpiWeek','kpiMonth','kpiMonthPicker','kpiMonthPickerLabel'];
  const elements=Object.fromEntries(ids.map(id=>[id,{textContent:'',value:'',handlers:{},addEventListener(type,handler){this.handlers[type]=handler;}}]));
  const context={records,Date:FixedDate,document:{getElementById:id=>elements[id]},$:id=>elements[id]};
  vm.createContext(context);
  vm.runInContext(helpers+render+selection,context);
  const select=(month,event='change')=>{
    elements.kpiMonthPicker.value=month;
    elements.kpiMonthPicker.handlers[event]();
    return ['kpiCount','kpiToday','kpiWeek','kpiMonth'].map(id=>elements[id].textContent);
  };
  return {select,elements};
}

test('ay değişimi sevkiyat adedini ve dört kartın toplamlarını günceller',()=>{
  const {select,elements}=harness([
    {tarih:'2026-09-15',metraj:12},
    {tarih:'2026-09-16',metraj:8.5},
    {tarih:'2026-10-13',metraj:30},
    {tarih:'2026-10-14',metraj:20},
    {tarih:'2026-10-20',metraj:7}
  ]);
  assert.deepEqual(select('2026-10'),['3','30,00 m³','50,00 m³','57,00 m³']);
  assert.deepEqual(select('2026-09'),['2','0,00 m³','0,00 m³','20,50 m³']);
  assert.equal(elements.kpiMonthPickerLabel.textContent,'EYLÜL 2026');
  assert.deepEqual(select('2026-10','input'),['3','30,00 m³','50,00 m³','57,00 m³']);
  assert.equal(elements.kpiMonthPickerLabel.textContent,'EKİM 2026');
});

test('kayıt bulunmayan ay önceki ayın sayılarını bırakmaz',()=>{
  const {select}=harness([{tarih:'2026-10-13',metraj:45}]);
  select('2026-10');
  assert.deepEqual(select('2026-11'),['0','0,00 m³','0,00 m³','0,00 m³']);
});

test('aynı haftadaki sevkler seçilen ayın sınırlarında hesaplanır',()=>{
  const {select}=harness([
    {tarih:'2026-09-28',metraj:10},
    {tarih:'2026-09-30',metraj:20},
    {tarih:'2026-10-01',metraj:30},
    {tarih:'2026-10-04',metraj:40},
    {tarih:'2026-10-05',metraj:50}
  ],'2026-10-01T12:00:00');
  assert.deepEqual(select('2026-09'),['2','0,00 m³','30,00 m³','30,00 m³']);
  assert.deepEqual(select('2026-10'),['3','30,00 m³','70,00 m³','120,00 m³']);
});

test('yıl sınırında aynı ay adına sahip farklı yıllar karışmaz',()=>{
  const {select}=harness([
    {tarih:'2025-12-31',metraj:10},
    {tarih:'2026-01-01',metraj:20},
    {tarih:'2026-01-04',metraj:30},
    {tarih:'2025-01-01',metraj:40}
  ],'2026-01-01T12:00:00');
  assert.deepEqual(select('2025-12'),['1','0,00 m³','10,00 m³','10,00 m³']);
  assert.deepEqual(select('2026-01'),['2','20,00 m³','50,00 m³','50,00 m³']);
  assert.deepEqual(select('2025-01'),['1','0,00 m³','0,00 m³','40,00 m³']);
});

test('iptal ve geçersiz tarih dışlanır, farklı tarih biçimleri ile metraj işlenir',()=>{
  const {select}=harness([
    {tarih:'2026-10-13',metraj:100,durum:'iptal'},
    {tarih:'13.10.2026',metraj:'12.5'},
    {tarih:'2026-10-14T08:00:00',metraj:'7.5'},
    {tarih:'2026-10-15',metraj:'geçersiz'},
    {tarih:'geçersiz',metraj:900},
    {tarih:null,metraj:500}
  ]);
  assert.deepEqual(select('2026-10'),['3','12,50 m³','20,00 m³','20,00 m³']);
});

test('tekrarlanan input ve change olayları aynı değerleri korur',()=>{
  const {select,elements}=harness([{tarih:'2026-10-13',metraj:45}]);
  select('2026-10','input');
  let writes=0;
  for(const element of Object.values(elements)){
    let text=element.textContent;
    Object.defineProperty(element,'textContent',{get(){return text;},set(value){writes++;text=value;}});
  }
  for(let i=0;i<5;i++)select('2026-10','change');
  assert.equal(writes,0);
});
