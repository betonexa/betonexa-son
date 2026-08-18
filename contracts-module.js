(function(){
'use strict';
const $=id=>document.getElementById(id);
const db=()=>typeof window.ensureDb==='function'?window.ensureDb():null;
const norm=v=>String(v||'').trim().toLocaleLowerCase('tr-TR').replace(/\s+/g,' ');
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const asciiKey=v=>norm(v).replace(/ı/g,'i').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
function titleTr(v){return String(v||'').split(/(\s+|-)/).map(p=>/^[\s-]+$/.test(p)?p:(p.charAt(0).toLocaleUpperCase('tr-TR')+p.slice(1).toLocaleLowerCase('tr-TR'))).join('')}
function canonicalLabel(v){let s=String(v||'').trim().replace(/\s+/g,' ');if(!s)return'';let k=asciiKey(s);const m=k.match(/^(.*?)(?:\s+)?ins[a-z]*$/i);if(m&&m[1].trim()){const base=m[1].trim().split(' ').filter(Boolean).map(w=>w.charAt(0).toLocaleUpperCase('tr-TR')+w.slice(1)).join(' ');return base+' İnşaat'}return titleTr(s)}
function canonicalKey(v){return asciiKey(canonicalLabel(v)).replace(/\bins[a-z]*\b$/,'insaat')}
function iso(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function trDate(v){return v?v.split('-').reverse().join('.'):''}
function monday(d){const x=new Date(d),day=(x.getDay()+6)%7;x.setDate(x.getDate()-day);x.setHours(0,0,0,0);return x}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function parseNumber(text){const raw=String(text||'').replace(/m³|ton/gi,'').replace(/\+/g,'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,'');const n=Number(raw);return Number.isFinite(n)?n:0}
function trNum(n){return Number(n||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})}

async function prepareTurkishPdfFont(doc){
  try{
    const fileName='NotoSans-Regular.ttf',fontName='BetonexaNotoSans';
    if(!doc.existsFileInVFS(fileName)){
      const response=await fetch('https://raw.githubusercontent.com/openmaptiles/fonts/master/noto-sans/NotoSans-Regular.ttf',{cache:'force-cache'});
      if(!response.ok)throw new Error('Font indirilemedi: '+response.status);
      const bytes=new Uint8Array(await response.arrayBuffer());let binary='';const chunk=0x8000;
      for(let i=0;i<bytes.length;i+=chunk)binary+=String.fromCharCode(...bytes.subarray(i,i+chunk));
      doc.addFileToVFS(fileName,btoa(binary));
    }
    doc.addFont(fileName,fontName,'normal');doc.setFont(fontName,'normal');return{name:fontName,text:v=>String(v??'')};
  }catch(error){console.warn('Türkçe PDF fontu yüklenemedi.',error);doc.setFont('helvetica','normal');return{name:'helvetica',text:v=>String(v??'')}}
}

function addStyles(){
  if(!$('contractListDeleteStyles')){const s=document.createElement('style');s.id='contractListDeleteStyles';s.textContent=`#contractsList .contract-card-wrap{position:relative;margin-bottom:10px}#contractsList .contract-card-wrap>.contract-card{width:100%;margin:0;padding-right:58px}#contractsList .contract-list-delete{position:absolute;right:10px;top:50%;transform:translateY(-50%);z-index:3;width:36px;height:36px;border:1px solid rgba(190,40,40,.18);border-radius:10px;background:#fff0f0;color:#b42318;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center}#contractsList .contract-list-delete:hover{background:#ffe3e3}`;document.head.appendChild(s)}
  if(!$('shipmentFilterStyles')){const s=document.createElement('style');s.id='shipmentFilterStyles';s.textContent=`
    #recordsCombinedView>.rc-title{display:none!important}
    #shipmentQuickFilters{margin:0 0 18px;padding:16px;border:1px solid rgba(103,52,189,.15);border-radius:18px;background:rgba(255,249,244,.52);box-shadow:0 8px 22px rgba(73,42,115,.06)}
    #shipmentQuickFilters .sqf-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px}
    #shipmentQuickFilters .sqf-head strong{font-size:18px;color:var(--purple-dark,#4d2393)}
    #shipmentQuickFilters .sqf-quick{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px}
    #shipmentQuickFilters .sqf-quick button{border:1px solid rgba(103,52,189,.18);background:rgba(255,255,255,.82);border-radius:10px;padding:8px 12px;font-weight:800;cursor:pointer;color:var(--ink,#202633)}
    #shipmentQuickFilters .sqf-quick button.active{background:var(--purple,#6734bd);color:white;border-color:transparent}
    #shipmentQuickFilters .sqf-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;align-items:end}
    #shipmentQuickFilters label{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:800;color:var(--muted,#687181)}
    #shipmentQuickFilters select,#shipmentQuickFilters input{box-sizing:border-box;width:100%;height:42px;border:1px solid rgba(103,52,189,.20);border-radius:10px;background:rgba(255,255,255,.90);padding:0 10px;font:inherit;color:var(--ink,#202633)}
    #shipmentQuickFilters .sqf-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;padding-top:12px;border-top:1px solid rgba(103,52,189,.12)}
    #shipmentFilterResult{font-size:12px;font-weight:850;color:var(--purple-dark,#4d2393)}
    #shipmentQuickFilters .sqf-hidden{display:none!important}
    #shipmentQuickFilters .sqf-clear{min-width:150px}
    @media(max-width:800px){#shipmentQuickFilters .sqf-grid{grid-template-columns:1fr 1fr}}
    @media(max-width:520px){#shipmentQuickFilters{padding:12px}#shipmentQuickFilters .sqf-grid{grid-template-columns:1fr}#shipmentQuickFilters .sqf-actions .btn{flex:1}}
  `;document.head.appendChild(s)}
}

function cardId(card){const m=(card?.getAttribute('onclick')||'').match(/selectContract\((\d+)\)/);return m?m[1]:null}
async function deleteContract(id,btn){if(!id||!confirm('Bu sözleşmeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.'))return;const client=db();if(!client){alert('Veritabanı bağlantısı yüklenemedi.');return}if(btn)btn.disabled=true;const{error}=await client.from('sozlesmeler').delete().eq('id',id);if(btn)btn.disabled=false;if(error){alert('Sözleşme silinemedi: '+error.message);return}if(typeof window.clearContractForm==='function')window.clearContractForm();if(typeof window.loadContracts==='function')await window.loadContracts();decorateCards()}
function decorateCards(){$('contractDeleteBtn')?.remove();const list=$('contractsList');if(!list)return;[...list.querySelectorAll('.contract-card')].forEach(card=>{if(card.closest('.contract-card-wrap'))return;const id=cardId(card);if(!id)return;const wrap=document.createElement('div');wrap.className='contract-card-wrap';card.parentNode.insertBefore(wrap,card);wrap.appendChild(card);const del=document.createElement('button');del.type='button';del.className='contract-list-delete';del.title='Sözleşmeyi Sil';del.textContent='🗑️';del.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();deleteContract(id,del)});wrap.appendChild(del)})}
function observeContracts(){const list=$('contractsList');if(!list||list.dataset.deleteObserver==='1')return;list.dataset.deleteObserver='1';new MutationObserver(()=>requestAnimationFrame(decorateCards)).observe(list,{childList:true,subtree:false})}

function blocks(){const box=$('recordsCombinedView');if(!box)return{};const all=[...box.querySelectorAll('.rc-block')];return{box,concrete:all.find(x=>/Beton Sevkiyatları/i.test(x.querySelector('h3')?.textContent||'')),cement:all.find(x=>/Çimento Sevkiyatları/i.test(x.querySelector('h3')?.textContent||''))}}
function concreteRows(){const b=blocks().concrete;return b?[...b.querySelectorAll('.rc-table tbody tr')].filter(r=>r.children.length>=9):[]}
function cementRows(){const b=blocks().cement;return b?[...b.querySelectorAll('.rc-table tbody tr')].filter(r=>r.children.length>=6):[]}
function rowIso(row){const t=(row.children[1]?.textContent||'').trim();let m=t.match(/(\d{2})\.(\d{2})\.(\d{4})/);if(m)return`${m[3]}-${m[2]}-${m[1]}`;m=t.match(/(\d{4})-(\d{2})-(\d{2})/);return m?m[0]:''}
function uniqueLabels(values){const map=new Map();values.forEach(raw=>{raw=String(raw||'').trim();if(!raw)return;const label=canonicalLabel(raw),key=canonicalKey(label);if(!map.has(key))map.set(key,label)});return[...map.values()].sort((a,b)=>a.localeCompare(b,'tr'))}
function fillSelect(id,values,allLabel,canonical=true){const el=$(id);if(!el)return;const old=el.value,key=canonical?canonicalKey(old):norm(old);el.innerHTML=`<option value="">${allLabel}</option>`+values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');const same=[...el.options].find(o=>(canonical?canonicalKey(o.value):norm(o.value))===key);el.value=same?same.value:''}

function forceLegacyAll(){const range=$('exportRange');if(range&&range.value!=='all'){range.value='all';range.dispatchEvent(new Event('change',{bubbles:true}))}['exportRange','exportDate','exportPdfBtn','exportExcelBtn','exportPrintBtn'].forEach(id=>{const el=$(id);if(!el)return;const wrap=(id==='exportRange'||id==='exportDate')?(el.closest('label')||el.parentElement):el;wrap.style.display='none'});const labels=[...document.querySelectorAll('#recordsPage label')];labels.forEach(l=>{const t=(l.textContent||'').trim();if(t==='Plan dönemi'||t==='Referans tarihi')l.style.display='none'})}

function updateFieldVisibility(){const type=$('shipmentFilterType')?.value||'all';document.querySelectorAll('#shipmentQuickFilters [data-only]').forEach(el=>{const only=el.dataset.only;el.classList.toggle('sqf-hidden',type==='all'||only!==type)})}
function refreshOptions(){
  const cr=concreteRows(),ce=cementRows();
  cr.forEach(r=>{if(r.children[4])r.children[4].textContent=canonicalLabel(r.children[4].textContent);if(r.children[5])r.children[5].textContent=canonicalLabel(r.children[5].textContent)});
  ce.forEach(r=>{if(r.children[2])r.children[2].textContent=canonicalLabel(r.children[2].textContent);if(r.children[3])r.children[3].textContent=canonicalLabel(r.children[3].textContent)});
  const type=$('shipmentFilterType')?.value||'all';
  const firms=type==='concrete'?cr.map(r=>r.children[4]?.textContent):type==='cement'?ce.map(r=>r.children[2]?.textContent):[...cr.map(r=>r.children[4]?.textContent),...ce.map(r=>r.children[2]?.textContent)];
  fillSelect('shipmentFilterCompany',uniqueLabels(firms),'Tüm Firmalar');
  const company=canonicalKey($('shipmentFilterCompany')?.value);
  const siteRows=company?cr.filter(r=>canonicalKey(r.children[4]?.textContent)===company):cr;
  const cementFirmRows=company?ce.filter(r=>canonicalKey(r.children[2]?.textContent)===company):ce;
  fillSelect('shipmentFilterSite',uniqueLabels(siteRows.map(r=>r.children[5]?.textContent)),'Tüm Şantiyeler');
  fillSelect('shipmentFilterPlant',[...new Set(siteRows.map(r=>(r.children[3]?.textContent||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr')),'Tüm Santraller',false);
  fillSelect('shipmentFilterConcrete',[...new Set(siteRows.map(r=>(r.children[6]?.textContent||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr')),'Tüm Beton Sınıfları',false);
  fillSelect('shipmentFilterDelivery',uniqueLabels(cementFirmRows.map(r=>r.children[3]?.textContent)),'Tüm Teslim Yerleri');
  updateFieldVisibility();
}

function matchesDate(row,start,end){const d=rowIso(row);return(!start||d>=start)&&(!end||d<=end)}
function applyFilters(){
  const type=$('shipmentFilterType')?.value||'all',company=canonicalKey($('shipmentFilterCompany')?.value),site=canonicalKey($('shipmentFilterSite')?.value),plant=norm($('shipmentFilterPlant')?.value),concrete=norm($('shipmentFilterConcrete')?.value),delivery=canonicalKey($('shipmentFilterDelivery')?.value),start=$('shipmentFilterStart')?.value||'',end=$('shipmentFilterEnd')?.value||'';
  const{concrete:cb,cement:ceb}=blocks();let cc=0,m3=0,zc=0,vehicles=0,tons=0;
  concreteRows().forEach(r=>{const ok=type!=='cement'&&(!company||canonicalKey(r.children[4]?.textContent)===company)&&(!site||canonicalKey(r.children[5]?.textContent)===site)&&(!plant||norm(r.children[3]?.textContent)===plant)&&(!concrete||norm(r.children[6]?.textContent)===concrete)&&matchesDate(r,start,end);r.style.display=ok?'':'none';if(ok){cc++;m3+=parseNumber(r.children[7]?.textContent)}});
  cementRows().forEach(r=>{const ok=type!=='concrete'&&(!company||canonicalKey(r.children[2]?.textContent)===company)&&(!delivery||canonicalKey(r.children[3]?.textContent)===delivery)&&matchesDate(r,start,end);r.style.display=ok?'':'none';if(ok){zc++;vehicles+=parseNumber(r.children[4]?.textContent);tons+=parseNumber(r.children[5]?.textContent)}});
  if(cb)cb.style.display=type==='cement'?'none':'';if(ceb)ceb.style.display=type==='concrete'?'none':'';
  const result=$('shipmentFilterResult');if(result){const parts=[];if(type!=='cement')parts.push(`${cc} beton · ${trNum(m3)} m³`);if(type!=='concrete')parts.push(`${zc} çimento · ${vehicles} araç · ${trNum(tons)} ton`);result.textContent=parts.join(' | ')}
  if(cb?.querySelector('.rc-total'))cb.querySelector('.rc-total').innerHTML=`<span>BETON SEVKİYATI: ${cc}</span><span>GENEL BETON: ${trNum(m3)} m³</span>`;
  if(ceb?.querySelector('.rc-total'))ceb.querySelector('.rc-total').innerHTML=`<span>ÇİMENTO SEVKİYATI: ${zc}</span><span>TOPLAM ARAÇ: ${vehicles}</span><span>TOPLAM TONAJ: ${trNum(tons)} ton</span>`;
}

function setQuick(kind,button){const today=new Date();let start='',end='';if(kind==='today'){start=end=iso(today)}else if(kind==='tomorrow'){start=end=iso(addDays(today,1))}else if(kind==='week'){const s=monday(today);start=iso(s);end=iso(addDays(s,6))}else if(kind==='month'){start=iso(new Date(today.getFullYear(),today.getMonth(),1));end=iso(new Date(today.getFullYear(),today.getMonth()+1,0))}$('shipmentFilterStart').value=start;$('shipmentFilterEnd').value=end;document.querySelectorAll('#shipmentQuickFilters .sqf-quick button').forEach(b=>b.classList.toggle('active',b===button));applyFilters()}
function clearFilters(){['shipmentFilterCompany','shipmentFilterSite','shipmentFilterPlant','shipmentFilterConcrete','shipmentFilterDelivery','shipmentFilterStart','shipmentFilterEnd'].forEach(id=>{if($(id))$(id).value=''});if($('shipmentFilterType'))$('shipmentFilterType').value='all';document.querySelectorAll('#shipmentQuickFilters .sqf-quick button').forEach(b=>b.classList.remove('active'));refreshOptions();applyFilters()}

function exportData(){
  const cr=concreteRows().filter(r=>r.style.display!=='none').map((r,i)=>({No:i+1,Tarih:(r.children[1]?.textContent||'').trim(),Saat:(r.children[2]?.textContent||'').trim(),Santral:(r.children[3]?.textContent||'').trim(),Firma:canonicalLabel(r.children[4]?.textContent||''),'Şantiye':canonicalLabel(r.children[5]?.textContent||''),Beton:(r.children[6]?.textContent||'').trim(),Metraj:(r.children[7]?.textContent||'').trim(),Pompa:(r.children[8]?.textContent||'').trim()}));
  const ce=cementRows().filter(r=>r.style.display!=='none').map((r,i)=>({No:i+1,Tarih:(r.children[1]?.textContent||'').trim(),Firma:canonicalLabel(r.children[2]?.textContent||''),'Teslim Yeri':canonicalLabel(r.children[3]?.textContent||''),Araç:(r.children[4]?.textContent||'').trim(),Tonaj:(r.children[5]?.textContent||'').trim()}));
  return{concrete:cr,cement:ce,m3:cr.reduce((s,r)=>s+parseNumber(r.Metraj),0),vehicles:ce.reduce((s,r)=>s+parseNumber(r.Araç),0),tons:ce.reduce((s,r)=>s+parseNumber(r.Tonaj),0)}
}
function exportTitle(){const type=$('shipmentFilterType')?.value||'all';return type==='concrete'?'Filtrelenmiş Beton Sevkiyatları':type==='cement'?'Filtrelenmiş Çimento Sevkiyatları':'Filtrelenmiş Sevkiyatlar'}
function exportSubline(){const company=$('shipmentFilterCompany')?.value||'Tüm Firmalar',start=$('shipmentFilterStart')?.value,end=$('shipmentFilterEnd')?.value;let date='';if(start&&end)date=`${trDate(start)} – ${trDate(end)}`;else if(start)date=`${trDate(start)} sonrası`;else if(end)date=`${trDate(end)} tarihine kadar`;return[company,date].filter(Boolean).join(' · ')}
async function pdf(){const p=exportData();if(!p.concrete.length&&!p.cement.length)return alert('Çıktı alınacak filtrelenmiş sevkiyat bulunmuyor.');if(!window.jspdf?.jsPDF)return alert('PDF modülü yüklenemedi.');const{jsPDF}=window.jspdf,doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'}),f=await prepareTurkishPdfFont(doc),font=f.name,text=f.text;doc.setFont(font,'normal');doc.setFontSize(14);doc.text(text(exportTitle()),14,14);doc.setFontSize(9);doc.text(text(exportSubline()),14,21);let y=28;if(p.concrete.length){doc.setFontSize(11);doc.text(text('Beton Sevkiyatları'),14,y);doc.autoTable({head:[['No','Tarih','Saat','Santral','Firma','Şantiye','Beton','Metraj','Pompa'].map(text)],body:p.concrete.map(x=>[x.No,x.Tarih,x.Saat,x.Santral,x.Firma,x['Şantiye'],x.Beton,x.Metraj,x.Pompa].map(text)),startY:y+3,styles:{font,fontSize:7},headStyles:{font,fillColor:[111,66,193]},margin:{left:14,right:14}});y=(doc.lastAutoTable?.finalY||y+20)+7;doc.setFontSize(9);doc.text(text(`BETON TOPLAM: ${p.concrete.length} sevkiyat · ${trNum(p.m3)} m³`),14,y);y+=9}if(p.cement.length){if(y>165){doc.addPage();y=16}doc.setFontSize(11);doc.text(text('Çimento Sevkiyatları'),14,y);doc.autoTable({head:[['No','Tarih','Firma','Teslim Yeri','Araç','Tonaj'].map(text)],body:p.cement.map(x=>[x.No,x.Tarih,x.Firma,x['Teslim Yeri'],x.Araç,x.Tonaj].map(text)),startY:y+3,styles:{font,fontSize:8},headStyles:{font,fillColor:[111,66,193]},margin:{left:14,right:14}});y=(doc.lastAutoTable?.finalY||y+20)+7;doc.setFontSize(9);doc.text(text(`ÇİMENTO TOPLAM: ${p.cement.length} sevkiyat · ${p.vehicles} araç · ${trNum(p.tons)} ton`),14,y)}doc.save('Filtrelenmis-Sevkiyatlar.pdf')}
function excel(){const p=exportData();if(!p.concrete.length&&!p.cement.length)return alert('Çıktı alınacak filtrelenmiş sevkiyat bulunmuyor.');if(!window.XLSX)return alert('Excel modülü yüklenemedi.');const wb=XLSX.utils.book_new();if(p.concrete.length){const rows=p.concrete.map(x=>({...x,Metraj:parseNumber(x.Metraj)}));rows.push({Firma:'TOPLAM',Metraj:p.m3});XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),'Beton')}if(p.cement.length){const rows=p.cement.map(x=>({...x,Araç:parseNumber(x.Araç),Tonaj:parseNumber(x.Tonaj)}));rows.push({Firma:'TOPLAM',Araç:p.vehicles,Tonaj:p.tons});XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),'Çimento')}XLSX.writeFile(wb,'Filtrelenmis-Sevkiyatlar.xlsx')}
function printRows(){const p=exportData();if(!p.concrete.length&&!p.cement.length)return alert('Yazdırılacak filtrelenmiş sevkiyat bulunmuyor.');const w=window.open('','_blank');if(!w)return;const table=(heads,rows)=>`<table><tr>${heads.map(h=>`<th>${esc(h)}</th>`).join('')}</tr>${rows.map(row=>`<tr>${row.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</table>`;let html=`<!doctype html><meta charset="utf-8"><title>${esc(exportTitle())}</title><style>body{font-family:Arial;padding:22px}table{width:100%;border-collapse:collapse;font-size:10px;margin-bottom:10px}th,td{border:1px solid #bbb;padding:6px}th{background:#6f42c1;color:#fff}h3{margin-top:20px}</style><h2>${esc(exportTitle())}</h2><p>${esc(exportSubline())}</p>`;if(p.concrete.length)html+=`<h3>Beton Sevkiyatları</h3>${table(['No','Tarih','Saat','Santral','Firma','Şantiye','Beton','Metraj','Pompa'],p.concrete.map(x=>[x.No,x.Tarih,x.Saat,x.Santral,x.Firma,x['Şantiye'],x.Beton,x.Metraj,x.Pompa]))}<b>BETON TOPLAM: ${p.concrete.length} sevkiyat · ${trNum(p.m3)} m³</b>`;if(p.cement.length)html+=`<h3>Çimento Sevkiyatları</h3>${table(['No','Tarih','Firma','Teslim Yeri','Araç','Tonaj'],p.cement.map(x=>[x.No,x.Tarih,x.Firma,x['Teslim Yeri'],x.Araç,x.Tonaj]))}<b>ÇİMENTO TOPLAM: ${p.cement.length} sevkiyat · ${p.vehicles} araç · ${trNum(p.tons)} ton</b>`;w.document.write(html);w.document.close();setTimeout(()=>w.print(),250)}

function ensureFilters(){
  forceLegacyAll();const{box}=blocks();if(!box)return false;let p=$('shipmentQuickFilters');if(!p){p=document.createElement('div');p.id='shipmentQuickFilters';p.innerHTML=`
    <div class="sqf-head"><strong>🔎 Sevkiyat Filtreleri</strong><span id="shipmentFilterResult"></span></div>
    <div class="sqf-quick"><button type="button" data-quick="today">Bugün</button><button type="button" data-quick="tomorrow">Yarın</button><button type="button" data-quick="week">Bu Hafta</button><button type="button" data-quick="month">Bu Ay</button><button type="button" data-quick="all">Tümü</button></div>
    <div class="sqf-grid">
      <label>Sevkiyat Türü<select id="shipmentFilterType"><option value="all">Tümü</option><option value="concrete">Beton</option><option value="cement">Çimento</option></select></label>
      <label>Firma<select id="shipmentFilterCompany"></select></label>
      <label data-only="concrete">Şantiye<select id="shipmentFilterSite"></select></label>
      <label data-only="concrete">Santral<select id="shipmentFilterPlant"></select></label>
      <label data-only="concrete">Beton Sınıfı<select id="shipmentFilterConcrete"></select></label>
      <label data-only="cement">Teslim Yeri<select id="shipmentFilterDelivery"></select></label>
      <label>Başlangıç Tarihi<input id="shipmentFilterStart" type="date"></label>
      <label>Bitiş Tarihi<input id="shipmentFilterEnd" type="date"></label>
      <button id="shipmentFilterClear" class="btn btn-light sqf-clear" type="button">Filtreleri Temizle</button>
    </div>
    <div class="sqf-actions"><button id="shipmentFilterPdf" class="btn btn-light" type="button">PDF İndir</button><button id="shipmentFilterExcel" class="btn btn-light" type="button">Excel İndir</button><button id="shipmentFilterPrint" class="btn btn-light" type="button">Yazdır</button></div>`;
    box.insertBefore(p,box.querySelector('.rc-block')||box.firstChild);
    p.querySelectorAll('[data-quick]').forEach(btn=>btn.addEventListener('click',()=>setQuick(btn.dataset.quick,btn)));
    $('shipmentFilterType').addEventListener('change',()=>{['shipmentFilterSite','shipmentFilterPlant','shipmentFilterConcrete','shipmentFilterDelivery'].forEach(id=>{if($(id))$(id).value=''});refreshOptions();applyFilters()});
    $('shipmentFilterCompany').addEventListener('change',()=>{refreshOptions();applyFilters()});
    ['shipmentFilterSite','shipmentFilterPlant','shipmentFilterConcrete','shipmentFilterDelivery','shipmentFilterStart','shipmentFilterEnd'].forEach(id=>$(id)?.addEventListener('change',()=>{document.querySelectorAll('#shipmentQuickFilters .sqf-quick button').forEach(b=>b.classList.remove('active'));applyFilters()}));
    $('shipmentFilterClear').onclick=clearFilters;$('shipmentFilterPdf').onclick=pdf;$('shipmentFilterExcel').onclick=excel;$('shipmentFilterPrint').onclick=printRows;
  }else if(p.parentElement!==box)box.insertBefore(p,box.querySelector('.rc-block')||box.firstChild);
  refreshOptions();applyFilters();return true;
}
function observeRecords(){const host=$('recordsPage');if(!host||host.dataset.unifiedFilterObserver==='1')return;host.dataset.unifiedFilterObserver='1';let timer;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(ensureFilters,120)}).observe(host,{childList:true,subtree:true})}
function init(){addStyles();if($('contractsPage')){decorateCards();observeContracts()}forceLegacyAll();observeRecords();ensureFilters();document.querySelector('[data-page="records"]')?.addEventListener('click',()=>setTimeout(ensureFilters,180))}
let tries=0,t=setInterval(()=>{init();if(++tries>80)clearInterval(t)},250);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();