(function(){
'use strict';
const $=id=>document.getElementById(id);
const db=()=>typeof window.ensureDb==='function'?window.ensureDb():null;
const norm=v=>String(v||'').trim().toLocaleLowerCase('tr-TR').replace(/\s+/g,' ');
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const asciiKey=v=>norm(v).replace(/ı/g,'i').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
function titleTr(v){return String(v||'').split(/(\s+|-)/).map(p=>/^[\s-]+$/.test(p)?p:(p.charAt(0).toLocaleUpperCase('tr-TR')+p.slice(1).toLocaleLowerCase('tr-TR'))).join('')}
function canonicalLabel(v){let s=String(v||'').trim().replace(/\s+/g,' ');if(!s)return'';const m=s.match(/^(.*?)(?:[\s.,-]+)?(?:inş(?:a+t+)?|ins(?:a+t+)?)\.?$/iu);if(m&&m[1].trim())s=m[1].trim()+' İnşaat';return titleTr(s)}
function canonicalKey(v){return asciiKey(canonicalLabel(v)).replace(/\bins(?:aat)?\b$/,'insaat')}

async function prepareTurkishPdfFont(doc){
  try{
    const fileName='NotoSans-Regular.ttf';
    const fontName='BetonexaNotoSans';
    if(!doc.existsFileInVFS(fileName)){
      const response=await fetch('https://raw.githubusercontent.com/openmaptiles/fonts/master/noto-sans/NotoSans-Regular.ttf',{cache:'force-cache'});
      if(!response.ok)throw new Error('Font indirilemedi: '+response.status);
      const bytes=new Uint8Array(await response.arrayBuffer());
      let binary='';
      const chunk=0x8000;
      for(let i=0;i<bytes.length;i+=chunk)binary+=String.fromCharCode(...bytes.subarray(i,i+chunk));
      doc.addFileToVFS(fileName,btoa(binary));
    }
    doc.addFont(fileName,fontName,'normal');
    doc.setFont(fontName,'normal');
    return {name:fontName,text:v=>String(v??'')};
  }catch(error){
    console.warn('Türkçe PDF fontu yüklenemedi.',error);
    doc.setFont('helvetica','normal');
    return {name:'helvetica',text:v=>String(v??'')};
  }
}

function addStyles(){
  if(!$('contractListDeleteStyles')){
    const s=document.createElement('style');s.id='contractListDeleteStyles';s.textContent=`
      #contractsList .contract-card-wrap{position:relative;margin-bottom:10px}
      #contractsList .contract-card-wrap>.contract-card{width:100%;margin:0;padding-right:58px}
      #contractsList .contract-list-delete{position:absolute;right:10px;top:50%;transform:translateY(-50%);z-index:3;width:36px;height:36px;border:1px solid rgba(190,40,40,.18);border-radius:10px;background:#fff0f0;color:#b42318;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center}
      #contractsList .contract-list-delete:hover{background:#ffe3e3}`;document.head.appendChild(s);
  }
  if(!$('shipmentFilterStyles')){
    const s=document.createElement('style');s.id='shipmentFilterStyles';s.textContent=`
      .beton-filter-block{padding:16px!important;border:1px solid rgba(103,52,189,.15)!important;border-radius:18px!important;background:rgba(255,249,244,.48)!important;box-shadow:0 8px 22px rgba(73,42,115,.06)}
      .beton-filter-block>h3{margin:0 0 14px!important}
      .beton-filter-block #shipmentQuickFilters{margin:0 0 14px!important;padding:0 0 14px!important;border:0!important;border-radius:0!important;background:transparent!important}
      .beton-filter-block>.rc-table{margin-top:0!important;border-radius:12px!important;overflow:auto!important}
      .beton-filter-block>.rc-total{margin:10px 0 0!important}
      #shipmentQuickFilters .sqf-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;flex-wrap:wrap}
      #shipmentQuickFilters .sqf-head strong{font-size:15px;color:var(--purple-dark,#4d2393)}
      #shipmentQuickFilters .sqf-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;align-items:end}
      #shipmentQuickFilters label{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:800;color:var(--muted,#687181)}
      #shipmentQuickFilters select,#shipmentQuickFilters input{box-sizing:border-box;width:100%;height:42px;border:1px solid rgba(103,52,189,.20);border-radius:10px;background:rgba(255,255,255,.86);padding:0 10px;font:inherit;color:var(--ink,#202633)}
      #shipmentFilterResult{font-size:12px;font-weight:800;color:var(--purple-dark,#4d2393)}
      #shipmentQuickFilters .sqf-clear{justify-self:start;min-width:150px}
      #shipmentFilterExports{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;padding-top:12px;border-top:1px solid rgba(103,52,189,.12)}
      @media(max-width:800px){#shipmentQuickFilters .sqf-grid{grid-template-columns:1fr 1fr}}
      @media(max-width:520px){.beton-filter-block{padding:12px!important}#shipmentQuickFilters .sqf-grid{grid-template-columns:1fr}#shipmentFilterExports .btn{flex:1}}
    `;document.head.appendChild(s);
  }
}

function cardId(card){const m=(card?.getAttribute('onclick')||'').match(/selectContract\((\d+)\)/);return m?m[1]:null}
async function deleteContract(id,btn){
  if(!id||!confirm('Bu sözleşmeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.'))return;
  const client=db();if(!client){alert('Veritabanı bağlantısı yüklenemedi.');return}
  if(btn)btn.disabled=true;const {error}=await client.from('sozlesmeler').delete().eq('id',id);if(btn)btn.disabled=false;
  if(error){alert('Sözleşme silinemedi: '+error.message);return}
  if(typeof window.clearContractForm==='function')window.clearContractForm();
  if(typeof window.loadContracts==='function')await window.loadContracts();
  decorateCards();
}
function decorateCards(){
  $('contractDeleteBtn')?.remove();const list=$('contractsList');if(!list)return;
  [...list.querySelectorAll('.contract-card')].forEach(card=>{
    if(card.closest('.contract-card-wrap'))return;const id=cardId(card);if(!id)return;
    const wrap=document.createElement('div');wrap.className='contract-card-wrap';card.parentNode.insertBefore(wrap,card);wrap.appendChild(card);
    const del=document.createElement('button');del.type='button';del.className='contract-list-delete';del.title='Sözleşmeyi Sil';del.textContent='🗑️';del.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();deleteContract(id,del)});wrap.appendChild(del);
  });
}
function observeContracts(){const list=$('contractsList');if(!list||list.dataset.deleteObserver==='1')return;list.dataset.deleteObserver='1';new MutationObserver(()=>requestAnimationFrame(decorateCards)).observe(list,{childList:true,subtree:false})}

function betonBlock(){const box=$('recordsCombinedView');if(!box)return null;return [...box.querySelectorAll('.rc-block')].find(x=>/Beton Sevkiyatları/i.test(x.querySelector('h3')?.textContent||''))||null}
function rowDate(row){const t=(row.children[1]?.textContent||'').trim();let m=t.match(/(\d{2})\.(\d{2})\.(\d{4})/);if(m)return `${m[3]}-${m[2]}-${m[1]}`;m=t.match(/(\d{4})-(\d{2})-(\d{2})/);return m?m[0]:''}
function parseM3(text){const n=Number(String(text||'').replace(/m³/gi,'').replace(/\+/g,'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:0}
function trNum(n){return Number(n||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})}
function unique(rows,i){const map=new Map();rows.forEach(r=>{const raw=(r.children[i]?.textContent||'').trim();if(!raw)return;const label=canonicalLabel(raw),k=canonicalKey(label);if(!map.has(k))map.set(k,label)});return [...map.values()].sort((a,b)=>a.localeCompare(b,'tr'))}
function fill(id,values,label){const el=$(id);if(!el)return;const curKey=canonicalKey(el.value);el.innerHTML=`<option value="">Tüm ${label}</option>`+values.map(v=>`<option value="${esc(v)}">${v}</option>`).join('');const same=[...el.options].find(o=>canonicalKey(o.value)===curKey);el.value=same?same.value:''}
function visibleRows(){const b=betonBlock();return b?[...b.querySelectorAll('.rc-table tbody tr')].filter(r=>r.children.length>=9&&r.style.display!=='none'):[]}
function pdfSubline(){
  const company=$('shipmentFilterCompany')?.value||'Tüm Firmalar';
  const start=$('shipmentFilterStart')?.value;
  const end=$('shipmentFilterEnd')?.value;
  const fmtDate=v=>v?v.split('-').reverse().join('.'):'';
  let dateText='';
  if(start&&end)dateText=`${fmtDate(start)} – ${fmtDate(end)}`;
  else if(start)dateText=`${fmtDate(start)} sonrası`;
  else if(end)dateText=`${fmtDate(end)} tarihine kadar`;
  return [company,dateText].filter(Boolean).join(' · ');
}
function filterSummary(){const p=[];[['Firma','shipmentFilterCompany'],['Şantiye','shipmentFilterSite'],['Santral','shipmentFilterPlant'],['Beton','shipmentFilterConcrete']].forEach(([a,b])=>{if($(b)?.value)p.push(`${a}: ${$(b).value}`)});if($('shipmentFilterStart')?.value)p.push(`Başlangıç: ${$('shipmentFilterStart').value.split('-').reverse().join('.')}`);if($('shipmentFilterEnd')?.value)p.push(`Bitiş: ${$('shipmentFilterEnd').value.split('-').reverse().join('.')}`);return p.length?p.join(' · '):'Tüm Sevkiyatlar'}
function exportData(){const rows=visibleRows(),data=rows.map((r,i)=>({No:i+1,Tarih:r.children[1]?.textContent.trim()||'',Saat:r.children[2]?.textContent.trim()||'',Santral:r.children[3]?.textContent.trim()||'',Firma:r.children[4]?.textContent.trim()||'','Şantiye':r.children[5]?.textContent.trim()||'',Beton:r.children[6]?.textContent.trim()||'',Metraj:r.children[7]?.textContent.trim()||'',Pompa:r.children[8]?.textContent.trim()||''}));return{rows,data,total:rows.reduce((s,r)=>s+parseM3(r.children[7]?.textContent),0)}}
function refreshOptions(){
  const b=betonBlock();if(!b)return;const rows=[...b.querySelectorAll('.rc-table tbody tr')].filter(r=>r.children.length>=9);
  rows.forEach(r=>{if(r.children[4])r.children[4].textContent=canonicalLabel(r.children[4].textContent);if(r.children[5])r.children[5].textContent=canonicalLabel(r.children[5].textContent)});
  fill('shipmentFilterCompany',unique(rows,4),'Firmalar');
  const selectedCompany=canonicalKey($('shipmentFilterCompany')?.value);
  const siteRows=selectedCompany?rows.filter(r=>canonicalKey(r.children[4]?.textContent)===selectedCompany):rows;
  fill('shipmentFilterSite',unique(siteRows,5),'Şantiyeler');
  fill('shipmentFilterPlant',[...new Set(rows.map(r=>(r.children[3]?.textContent||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr')),'Santraller');
  fill('shipmentFilterConcrete',[...new Set(rows.map(r=>(r.children[6]?.textContent||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr')),'Beton Sınıfları');
}
function applyFilters(){
  const b=betonBlock();if(!b)return;const company=canonicalKey($('shipmentFilterCompany')?.value),site=canonicalKey($('shipmentFilterSite')?.value),plant=norm($('shipmentFilterPlant')?.value),concrete=norm($('shipmentFilterConcrete')?.value),start=$('shipmentFilterStart')?.value||'',end=$('shipmentFilterEnd')?.value||'';
  const rows=[...b.querySelectorAll('.rc-table tbody tr')].filter(r=>r.children.length>=9);let count=0,total=0;
  rows.forEach(r=>{const d=rowDate(r),ok=(!company||canonicalKey(r.children[4]?.textContent)===company)&&(!site||canonicalKey(r.children[5]?.textContent)===site)&&(!plant||norm(r.children[3]?.textContent)===plant)&&(!concrete||norm(r.children[6]?.textContent)===concrete)&&(!start||d>=start)&&(!end||d<=end);r.style.display=ok?'':'none';if(ok){count++;total+=parseM3(r.children[7]?.textContent)}});
  if($('shipmentFilterResult'))$('shipmentFilterResult').textContent=`${count} sevkiyat · ${trNum(total)} m³`;
  const t=b.querySelector('.rc-total');if(t){t.dataset.originalHtml=t.dataset.originalHtml||t.innerHTML;const active=company||site||plant||concrete||start||end;t.innerHTML=active?`<span>FİLTRELENEN SEVKİYAT: ${count}</span><span>FİLTRELENEN BETON: ${trNum(total)} m³</span>`:t.dataset.originalHtml}
}
async function pdf(){
  const p=exportData();if(!p.rows.length)return alert('Çıktı alınacak filtrelenmiş sevkiyat bulunmuyor.');if(!window.jspdf?.jsPDF)return alert('PDF modülü yüklenemedi.');
  const{jsPDF}=window.jspdf,doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
  const font=await prepareTurkishPdfFont(doc),fontName=font.name,text=font.text;
  doc.setFont(fontName,'normal');doc.setFontSize(14);doc.text(text('Filtrelenmiş Beton Sevkiyatları'),14,14);
  doc.setFontSize(9);doc.text(text(pdfSubline()),14,21);
  doc.autoTable({head:[['No','Tarih','Saat','Santral','Firma','Şantiye','Beton','Metraj','Pompa'].map(text)],body:p.data.map(x=>[x.No,x.Tarih,x.Saat,x.Santral,x.Firma,x['Şantiye'],x.Beton,x.Metraj,x.Pompa].map(text)),startY:27,styles:{font:fontName,fontSize:7},headStyles:{font:fontName,fillColor:[111,66,193]},margin:{left:14,right:14}});
  doc.setFont(fontName,'normal');doc.setFontSize(9);doc.text(text(`TOPLAM: ${p.rows.length} sevkiyat · ${trNum(p.total)} m³`),14,(doc.lastAutoTable?.finalY||32)+8);
  doc.save('Filtrelenmis-Beton-Sevkiyatlari.pdf');
}
function excel(){const p=exportData();if(!p.rows.length)return alert('Çıktı alınacak filtrelenmiş sevkiyat bulunmuyor.');if(!window.XLSX)return alert('Excel modülü yüklenemedi.');const rows=p.data.map(x=>({...x,Metraj:parseM3(x.Metraj)}));rows.push({Firma:'TOPLAM',Metraj:p.total});const wb=XLSX.utils.book_new(),ws=XLSX.utils.json_to_sheet(rows);XLSX.utils.book_append_sheet(wb,ws,'Filtrelenmiş Sevkiyatlar');XLSX.writeFile(wb,'Filtrelenmis-Beton-Sevkiyatlari.xlsx')}
function printRows(){const p=exportData();if(!p.rows.length)return alert('Yazdırılacak filtrelenmiş sevkiyat bulunmuyor.');const w=window.open('','_blank');if(!w)return;w.document.write(`<!doctype html><meta charset="utf-8"><title>Filtrelenmiş Beton Sevkiyatları</title><style>body{font-family:Arial;padding:22px}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #bbb;padding:6px}th{background:#6f42c1;color:#fff}</style><h2>Filtrelenmiş Beton Sevkiyatları</h2><p>${esc(pdfSubline())}</p><table><tr><th>No</th><th>Tarih</th><th>Saat</th><th>Santral</th><th>Firma</th><th>Şantiye</th><th>Beton</th><th>Metraj</th><th>Pompa</th></tr>${p.data.map(x=>`<tr><td>${x.No}</td><td>${esc(x.Tarih)}</td><td>${esc(x.Saat)}</td><td>${esc(x.Santral)}</td><td>${esc(x.Firma)}</td><td>${esc(x['Şantiye'])}</td><td>${esc(x.Beton)}</td><td>${esc(x.Metraj)}</td><td>${esc(x.Pompa)}</td></tr>`).join('')}</table><p><b>TOPLAM: ${p.rows.length} sevkiyat · ${trNum(p.total)} m³</b></p>`);w.document.close();setTimeout(()=>w.print(),250)}
function ensureFilters(){
  const b=betonBlock();if(!b)return false;b.classList.add('beton-filter-block');let p=$('shipmentQuickFilters');
  if(!p){p=document.createElement('div');p.id='shipmentQuickFilters';p.innerHTML=`<div class="sqf-head"><strong>🔎 Sevkiyat Filtreleri</strong><span id="shipmentFilterResult"></span></div><div class="sqf-grid"><label>Firma<select id="shipmentFilterCompany"></select></label><label>Şantiye<select id="shipmentFilterSite"></select></label><label>Santral<select id="shipmentFilterPlant"></select></label><label>Beton Sınıfı<select id="shipmentFilterConcrete"></select></label><label>Başlangıç Tarihi<input id="shipmentFilterStart" type="date"></label><label>Bitiş Tarihi<input id="shipmentFilterEnd" type="date"></label><button id="shipmentFilterClear" class="btn btn-light sqf-clear" type="button">Filtreleri Temizle</button></div><div id="shipmentFilterExports"><button id="shipmentFilterPdf" class="btn btn-light" type="button">PDF İndir</button><button id="shipmentFilterExcel" class="btn btn-light" type="button">Excel İndir</button><button id="shipmentFilterPrint" class="btn btn-light" type="button">Yazdır</button></div>`;b.insertBefore(p,b.querySelector('.rc-table')||b.firstChild);
    $('shipmentFilterCompany').addEventListener('change',()=>{refreshOptions();applyFilters()});
    ['shipmentFilterSite','shipmentFilterPlant','shipmentFilterConcrete','shipmentFilterStart','shipmentFilterEnd'].forEach(id=>$(id).addEventListener('change',applyFilters));
    $('shipmentFilterClear').onclick=()=>{['shipmentFilterCompany','shipmentFilterSite','shipmentFilterPlant','shipmentFilterConcrete','shipmentFilterStart','shipmentFilterEnd'].forEach(id=>$(id).value='');refreshOptions();applyFilters()};$('shipmentFilterPdf').onclick=pdf;$('shipmentFilterExcel').onclick=excel;$('shipmentFilterPrint').onclick=printRows
  }
  refreshOptions();applyFilters();return true;
}
function observeRecords(){const host=$('recordsPage');if(!host||host.dataset.shipmentFilterObserver==='1')return;host.dataset.shipmentFilterObserver='1';let timer;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(ensureFilters,80)}).observe(host,{childList:true,subtree:true})}
function init(){addStyles();if($('contractsPage')){decorateCards();observeContracts()}observeRecords();ensureFilters();document.querySelector('[data-page="records"]')?.addEventListener('click',()=>setTimeout(ensureFilters,120))}
let tries=0,t=setInterval(()=>{init();if(++tries>60)clearInterval(t)},250);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();