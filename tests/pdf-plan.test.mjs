import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const professional=await readFile(new URL('../professional-pdf-reports.js',import.meta.url),'utf8');
const adapter=await readFile(new URL('../cement-pallet-export-fix.js',import.meta.url),'utf8');
const legacy=await readFile(new URL('../cement-pallet-exports.js',import.meta.url),'utf8');

function harness(concrete=[{tarih:'2026-10-14',firma:'Örnek Firma',metraj:25}],cement=[]){
  class FixedDate extends Date{constructor(...args){super(...(args.length?args:['2026-10-13T12:00:00Z']));}}
  const saved=[],opened=[],listeners={},timers=[];
  class Pdf{
    constructor(){this.texts=[];this.pages=1;this.internal={pageSize:{getWidth:()=>297,getHeight:()=>210}};}
    setFont(){}setTextColor(){}setFontSize(){}setDrawColor(){}setLineWidth(){}line(){}setFillColor(){}roundedRect(){}circle(){}
    setProperties(value){this.properties=value;}
    text(value){this.texts.push(String(value));}
    getTextWidth(value){return String(value).length;}
    autoTable(options){this.lastAutoTable={finalY:options.startY+20};}
    getNumberOfPages(){return this.pages;}setPage(){}addPage(){this.pages++;}
    save(file){saved.push({file,doc:this});}
  }
  const elements={exportRange:{value:'daily'},exportDate:{value:'2026-10-14'}};
  const document={readyState:'complete',getElementById:id=>elements[id]||null,querySelectorAll:()=>[],addEventListener(type,handler){(listeners[type]??=[]).push(handler);}};
  const query=table=>({select(){return this;},order(){return this;},then(resolve){return Promise.resolve({data:table==='sevkiyatlar'?concrete:cement,error:null}).then(resolve);}});
  const root={document,jspdf:{jsPDF:Pdf},ensureDb:()=>({from:query}),BetonexaNoteText:value=>String(value??''),preparePdfFont:async()=>({name:'test-font',text:value=>String(value??'')}),open(){const output={html:''};opened.push(output);return {document:{write:html=>output.html=html,close(){}},focus(){},print(){}};}};
  const context=vm.createContext({window:root,document,Date:FixedDate,Intl,console,setInterval:callback=>{timers.push(callback);return timers.length;},clearInterval(){},setTimeout:callback=>callback(),alert:message=>{throw new Error(message);}});
  vm.runInContext(professional,context);
  const click=async id=>{
    const button={id,closest(selector){return selector==='button'||selector==='#'+id?this:null;}};
    let stopped=false;
    const event={target:button,preventDefault(){},stopImmediatePropagation(){stopped=true;}};
    for(const handler of listeners.click||[]){handler(event);if(stopped)break;}
    await new Promise(resolve=>setImmediate(resolve));
  };
  return {root,context,saved,opened,click,elements};
}

test('yarınki PDF ilk dokunuşta ve düğme yeniden oluşturulsa da plan üretir',async()=>{
  const {click,saved}=harness();
  await click('tomorrowPdfBtn');
  await click('tomorrowPdfBtn');
  assert.equal(saved.length,2);
  for(const {file,doc} of saved){
    assert.equal(file,'Betonexa-Yarinki-Sevkiyat-Plani-2026-10-14.pdf');
    assert.equal(doc.texts[0],'SEVKİYAT PLANI');
    assert.equal(doc.properties.title,'SEVKİYAT PLANI');
    assert.ok(doc.texts.some(text=>text.startsWith('Plan Tarihi:')));
    assert.ok(!doc.texts.some(text=>text.includes('SEVKİYAT RAPORU')));
  }
});

test('çimento içeren yarınki PDF de plan başlığını ve dosya adını kullanır',async()=>{
  const {root,saved}=harness([],[{tarih:'2026-10-14',firma:'Örnek Firma',arac_sayisi:1,toplam_tonaj:20}]);
  await root.BetonexaProfessionalPdf.save('tomorrow');
  assert.equal(saved[0].doc.texts[0],'SEVKİYAT PLANI');
  assert.match(saved[0].file,/Sevkiyat-Plani/);
});

test('gelecek sevklerin dosya adı tüm PDF çağrı yollarında plan olarak kaydedilir',async()=>{
  const {root,context,saved}=harness();
  vm.runInContext(adapter.replace('  function bindOne(', '  window.testRun=run;\n  function bindOne('),context);
  await root.testRun('main','pdf');
  assert.equal(saved[0].file,'Betonexa-Sevkiyat-Plani-daily.pdf');
  assert.equal(saved[0].doc.texts[0],'SEVKİYAT PLANI');
});

test('yazdır üzerinden PDF kaydetme gelecek sevklerde plan başlığını kullanır',async()=>{
  const {root,context,opened}=harness();
  vm.runInContext(adapter.replace('  function bindOne(', '  window.testRun=run;\n  function bindOne('),context);
  await root.testRun('tomorrow','print');
  await root.testRun('main','print');
  assert.equal(opened.length,2);
  for(const {html} of opened){assert.match(html,/<title>Sevkiyat Planı<\/title>/);assert.match(html,/<h2>Sevkiyat Planı<\/h2>/);}
});

test('eski yazdırma yolu da aynı gelecek tarih kuralını kullanır',async()=>{
  const {root,context,opened}=harness();
  vm.runInContext(legacy.replace('  function hook(){','  window.testPrint=printReport;\n  function hook(){'),context);
  await root.testPrint(false);
  assert.match(opened[0].html,/<title>Sevkiyat Planı<\/title>/);
  assert.match(opened[0].html,/<h2>Sevkiyat Planı<\/h2>/);
});

test('bugün ve geçmiş kayıtların PDF başlığı rapor olarak kalır',async()=>{
  const {root,saved}=harness();
  await root.BetonexaProfessionalPdf.savePrepared({mode:'selection'},{concrete:[{tarih:'2026-10-13',metraj:10}],cement:[]});
  assert.equal(saved[0].doc.texts[0],'SEVKİYAT RAPORU');
  assert.equal(saved[0].doc.properties.title,'SEVKİYAT RAPORU');
  assert.equal(saved[0].file,'Betonexa-Sevkiyat-Raporu.pdf');
});
