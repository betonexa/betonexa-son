(function(){
'use strict';
const $=id=>document.getElementById(id);
const db=()=>typeof window.ensureDb==='function'?window.ensureDb():null;
const norm=v=>String(v||'').trim().toLocaleLowerCase('tr-TR').replace(/\s+/g,' ');
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const asciiKey=v=>norm(v).replace(/ı/g,'i').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
function titleTr(v){return String(v||'').split(/(\s+|-)/).map(p=>/^[\s-]+$/.test(p)?p:(p.charAt(0).toLocaleUpperCase('tr-TR')+p.slice(1).toLocaleLowerCase('tr-TR'))).join('')}
function canonicalParts(value){
  const raw=String(value??'').trim().replace(/\s+/g,' ');
  const lowered=raw.toLocaleLowerCase('tr-TR');
  const expanded=lowered.replace(/(^|[\s\-/])(?:inş|ins)(?=[^\p{L}\p{N}]|$)[^\p{L}\p{N}]*/gu,'$1inşaat ' ).trim();
  const label=titleTr(expanded);
  const key=asciiKey(raw).replace(/(^|\s)ins(?=\s|$)/g,'$1insaat');
  return{label,key};
}
function canonicalLabel(value){return canonicalParts(value).label}
function canonicalKey(value){return canonicalParts(value).key}
window.BetonexaShipmentFilterNames=Object.freeze({parts:canonicalParts,label:canonicalLabel,key:canonicalKey});
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
  if(!$('contractListDeleteStyles')){const s=document.createElement('style');s.id='contractListDeleteStyles';s.textContent=`
    #contractsList .contract-card-wrap{position:relative;margin-bottom:10px;border:1px solid transparent;border-radius:14px;transition:.18s ease}
    #contractsList .contract-card-wrap>.contract-card{width:100%;margin:0;padding-right:58px}
    #contractsList .contract-list-delete{position:absolute;right:10px;top:19px;z-index:3;width:36px;height:36px;border:1px solid rgba(190,40,40,.18);border-radius:10px;background:#fff0f0;color:#b42318;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center}
    #contractsList .contract-list-delete:hover{background:#ffe3e3}
    #contractsList .contract-card-wrap.is-open{border-color:rgba(103,52,189,.24);background:rgba(255,255,255,.72);box-shadow:0 10px 26px rgba(73,42,115,.10)}
    #contractsList .contract-card-wrap.is-open>.contract-card{border-color:transparent;border-bottom-left-radius:0;border-bottom-right-radius:0;background:rgba(244,238,255,.62);box-shadow:none;transform:none}
    #contractsList .contract-card-wrap.is-open .contract-card-arrow{transform:translateY(-50%) rotate(90deg);opacity:1}
    #contractsList .contract-inline-detail{display:none;padding:4px 16px 16px;border-top:1px solid rgba(103,52,189,.10)}
    #contractsList .contract-card-wrap.is-open .contract-inline-detail{display:block}
    #contractsList .contract-detail-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:12px 0}
    #contractsList .contract-detail-cell{min-width:0;padding:10px 11px;border:1px solid rgba(103,52,189,.10);border-radius:11px;background:rgba(255,255,255,.72)}
    #contractsList .contract-detail-cell small{display:block;margin-bottom:4px;color:#7a7187;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.03em}
    #contractsList .contract-detail-cell strong{display:block;color:#24202c;font-size:13px;line-height:1.3;overflow-wrap:anywhere}
    #contractsList .contract-detail-cell.wide{grid-column:span 3}
    #contractsList .contract-progress-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:10px 0}
    #contractsList .contract-progress-grid>div{padding:10px;border-radius:11px;background:rgba(103,52,189,.07);color:#5d5570;font-size:11px}
    #contractsList .contract-progress-grid strong{display:block;margin-top:3px;color:#282330;font-size:14px}
    #contractsList .contract-inline-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:14px 0 8px}
    #contractsList .contract-inline-head h4{margin:0;color:var(--purple-dark,#4d2393);font-size:14px}
    #contractsList .contract-inline-add{border:1px solid rgba(103,52,189,.18);border-radius:9px;background:#fff;color:#4d2393;padding:7px 10px;font-weight:800;cursor:pointer}
    #contractsList .contract-history-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 10px;border-top:1px solid rgba(103,52,189,.09);font-size:12px}
    #contractsList .contract-history-row:first-child{border-top:0}
    #contractsList .contract-history-meta{margin-left:auto;text-align:right}
    #contractsList .contract-history-actions{display:flex;gap:6px;margin-left:8px}
    #contractsList .contract-history-action{border:1px solid rgba(103,52,189,.16);border-radius:8px;background:#fff;color:#4d2393;padding:6px 8px;font-size:11px;font-weight:800;cursor:pointer}
    #contractsList .contract-history-action.delete{border-color:rgba(190,40,40,.18);color:#b42318;background:#fff5f5}
    #contractsList .contract-history-edit-form{width:100%;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;align-items:end}
    #contractsList .contract-history-edit-form label{display:flex;flex-direction:column;gap:4px;color:#6f667b;font-size:10px;font-weight:800}
    #contractsList .contract-history-edit-form input{box-sizing:border-box;width:100%;height:36px;border:1px solid rgba(103,52,189,.18);border-radius:8px;background:#fff;padding:0 8px;color:#202633}
    #contractsList .contract-history-edit-actions{display:flex;gap:6px;grid-column:1/-1;justify-content:flex-end}
    #contractsList .contract-history-empty{padding:9px 0;color:#7a7187;font-size:12px}
    #contractsList .contract-inline-loading{padding:15px 0;color:#7a7187;font-size:12px}
    #contractsPage .settings-grid{grid-template-columns:minmax(0,1fr)!important}
    #contractsPage .contract-list-box{width:100%;max-width:none}
    #contractsPage .contract-editor-box{display:none}
    #contractsPage .contract-editor-box.is-visible{display:block}
    #contractsPage .contract-editor-box .contract-legacy-history,
    #contractsPage .contract-editor-box .contract-legacy-progress{display:none!important}
    #contractsPage .contract-editor-toolbar{display:flex;justify-content:flex-end;margin:-4px 0 14px}
    #contractsPage .contract-editor-close{border:1px solid rgba(103,52,189,.18);border-radius:10px;background:#fff;color:#4d2393;padding:8px 13px;font-weight:800;cursor:pointer}
    @media(max-width:700px){
      #contractsList .contract-detail-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      #contractsList .contract-detail-cell.wide{grid-column:span 2}
      #contractsList .contract-progress-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      #contractsList .contract-inline-detail{padding:4px 12px 14px}
      #contractsList .contract-history-row{align-items:flex-start;flex-wrap:wrap}
      #contractsList .contract-history-meta{margin-left:0;text-align:left}
      #contractsList .contract-history-actions{margin-left:auto}
      #contractsList .contract-history-edit-form{grid-template-columns:repeat(2,minmax(0,1fr))}
    }
  `;document.head.appendChild(s)}
  if(!$('shipmentFilterStyles')){const s=document.createElement('style');s.id='shipmentFilterStyles';s.textContent=`
    #recordsCombinedView>.rc-title{display:none!important}
    #shipmentQuickFilters{margin:0 0 18px;padding:16px;border:1px solid rgba(103,52,189,.15);border-radius:18px;background:rgba(255,249,244,.52);box-shadow:0 8px 22px rgba(73,42,115,.06)}
    #shipmentQuickFilters .sqf-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px}
    #shipmentQuickFilters .sqf-head strong{font-size:18px;color:var(--purple-dark,#4d2393)}
    #shipmentQuickFilters .sqf-quick{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px}
    #shipmentQuickFilters .sqf-quick button{border:1px solid rgba(103,52,189,.18);background:rgba(255,255,255,.82);border-radius:10px;padding:8px 12px;font-weight:800;cursor:pointer;color:var(--ink,#202633)}
    #shipmentQuickFilters .sqf-quick button.active{background:var(--purple,#6734bd);color:white;border-color:transparent;box-shadow:0 5px 12px rgba(103,52,189,.18)}
    #shipmentQuickFilters .sqf-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;align-items:end}
    #shipmentQuickFilters label{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:800;color:var(--muted,#687181)}
    #shipmentQuickFilters select,#shipmentQuickFilters input{box-sizing:border-box;width:100%;height:42px;border:1px solid rgba(103,52,189,.20);border-radius:10px;background:rgba(255,255,255,.90);padding:0 10px;font:inherit;color:var(--ink,#202633)}
    #shipmentQuickFilters .sqf-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px;padding-top:12px;border-top:1px solid rgba(103,52,189,.12)}
    #shipmentQuickFilters .sqf-clear{min-width:0;width:auto;padding-left:14px;padding-right:14px;margin-left:auto}
    #shipmentFilterResult{display:flex;align-items:center;justify-content:flex-end;gap:7px;flex-wrap:wrap;font-size:12px;font-weight:850;color:var(--purple-dark,#4d2393)}
    #shipmentFilterResult .sqf-badge{display:inline-flex;align-items:center;gap:5px;padding:6px 9px;border-radius:999px;background:rgba(103,52,189,.10);border:1px solid rgba(103,52,189,.13);white-space:nowrap}
    #shipmentFilterResult .sqf-badge-cement{background:rgba(184,119,33,.10);border-color:rgba(184,119,33,.16);color:#765015}
    #shipmentQuickFilters .sqf-hidden{display:none!important}
    @media(max-width:1100px){#shipmentQuickFilters .sqf-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:700px){#shipmentQuickFilters{padding:12px;max-width:100%;overflow:hidden;box-sizing:border-box}#shipmentQuickFilters .sqf-grid{grid-template-columns:minmax(0,1fr);width:100%;max-width:100%;min-width:0;box-sizing:border-box}#shipmentQuickFilters .sqf-grid>label{min-width:0!important;max-width:100%!important;width:100%!important;overflow:hidden;box-sizing:border-box}#shipmentFilterStart,#shipmentFilterEnd{display:block!important;width:100%!important;max-width:100%!important;min-width:0!important;inline-size:100%!important;max-inline-size:100%!important;min-inline-size:0!important;margin-left:0!important;margin-right:0!important;box-sizing:border-box!important;-webkit-appearance:none!important;appearance:none!important}#shipmentFilterStart::-webkit-date-and-time-value,#shipmentFilterEnd::-webkit-date-and-time-value{width:100%!important;min-width:0!important}#shipmentQuickFilters .sqf-actions .btn{flex:1}#shipmentQuickFilters .sqf-clear{margin-left:0}#shipmentFilterResult{justify-content:flex-start}}
  `;document.head.appendChild(s)}
}

function cardId(card){const m=(card?.getAttribute('onclick')||'').match(/selectContract\((\d+)\)/);return m?m[1]:null}
async function deleteContract(id,btn){if(!id||!confirm('Bu sözleşmeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.'))return;const client=db();if(!client){alert('Veritabanı bağlantısı yüklenemedi.');return}if(btn)btn.disabled=true;const{error}=await client.from('sozlesmeler').delete().eq('id',id);if(btn)btn.disabled=false;if(error){alert('Sözleşme silinemedi: '+error.message);return}if(typeof window.clearContractForm==='function')window.clearContractForm();if(typeof window.loadContracts==='function')await window.loadContracts();decorateCards()}
function inlineMoney(v){return Number(v||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})+' TL'}
function inlineM3(v){return Number(v||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})+' m³'}
function detailCell(label,value,wide=false){return `<div class="contract-detail-cell${wide?' wide':''}"><small>${esc(label)}</small><strong>${esc(value||'-')}</strong></div>`}
function reloadInlineContract(id,detail){detail.dataset.loading='';detail.innerHTML='';return loadInlineContract(id,detail)}
function editHistoryRow(row,item,contractId,detail){
  row.innerHTML=`<div class="contract-history-edit-form">
    <label>Başlangıç Tarihi<input class="history-edit-start" type="date" value="${esc(item.gecerlilik_baslangic_tarihi||'')}"></label>
    <label>Bitiş Tarihi<input class="history-edit-end" type="date" value="${esc(item.gecerlilik_bitis_tarihi||'')}"></label>
    <label>Alış Fiyatı<input class="history-edit-buy" type="number" step="0.01" value="${Number(item.alis_fiyati||0)}"></label>
    <label>Satış Fiyatı<input class="history-edit-sale" type="number" step="0.01" value="${Number(item.satis_fiyati||0)}"></label>
    <div class="contract-history-edit-actions"><button type="button" class="contract-history-action history-edit-cancel">Vazgeç</button><button type="button" class="contract-history-action history-edit-save">Kaydet</button></div>
  </div>`;
  row.querySelector('.history-edit-cancel').onclick=()=>reloadInlineContract(contractId,detail);
  row.querySelector('.history-edit-save').onclick=async()=>{const start=row.querySelector('.history-edit-start').value,end=row.querySelector('.history-edit-end').value,buy=Number(row.querySelector('.history-edit-buy').value||0),sale=Number(row.querySelector('.history-edit-sale').value||0);if(!start)return alert('Başlangıç tarihi zorunludur.');if(end&&end<start)return alert('Bitiş tarihi başlangıç tarihinden önce olamaz.');if(buy<=0&&sale<=0)return alert('Alış veya satış fiyatından en az birini gir.');const{error}=await db().from('sozlesme_fiyat_gecmisi').update({gecerlilik_baslangic_tarihi:start,gecerlilik_bitis_tarihi:end||null,alis_fiyati:buy,satis_fiyati:sale}).eq('id',item.id);if(error)return alert('Fiyat geçmişi güncellenemedi: '+error.message);await reloadInlineContract(contractId,detail)};
}
async function deleteHistoryRow(item,contractId,detail){if(!confirm('Bu eski fiyat kaydını silmek istediğinize emin misiniz?'))return;const{error}=await db().from('sozlesme_fiyat_gecmisi').delete().eq('id',item.id);if(error)return alert('Fiyat geçmişi silinemedi: '+error.message);await reloadInlineContract(contractId,detail)}
async function loadInlineContract(id,detail){
  if(!detail||detail.dataset.loading==='1')return;detail.dataset.loading='1';detail.innerHTML='<div class="contract-inline-loading">Sözleşme bilgileri yükleniyor…</div>';
  const client=db();if(!client){detail.innerHTML='<div class="contract-history-empty">Veritabanı bağlantısı yüklenemedi.</div>';detail.dataset.loading='';return}
  const [{data:contract,error},{data:history,error:historyError}]=await Promise.all([
    client.from('sozlesmeler').select('*').eq('id',id).single(),
    client.from('sozlesme_fiyat_gecmisi').select('*').eq('sozlesme_id',id).order('created_at',{ascending:false})
  ]);
  detail.dataset.loading='';if(error||!contract){detail.innerHTML='<div class="contract-history-empty">Sözleşme bilgileri yüklenemedi.</div>';return}
  const progress=$('contractProgress');
  const progressValues=[...progress?.querySelectorAll(':scope>div')||[]].filter(x=>!/Adres:/i.test(x.textContent||'')).map(x=>{const parts=(x.textContent||'').split(':');return{label:(parts.shift()||'').trim(),value:parts.join(':').trim()}});
  const historyHtml=!historyError&&history?.length?history.map(x=>`<div class="contract-history-row" data-history-id="${Number(x.id)}"><div><strong>${esc(inlineMoney(x.satis_fiyati))} satış</strong><div>${esc(inlineMoney(x.alis_fiyati))} alış</div></div><div class="contract-history-meta">${esc(x.gecerlilik_baslangic_tarihi?trDate(x.gecerlilik_baslangic_tarihi):'-')}${x.gecerlilik_bitis_tarihi?' → '+esc(trDate(x.gecerlilik_bitis_tarihi)):''}</div><div class="contract-history-actions"><button type="button" class="contract-history-action edit">Düzenle</button><button type="button" class="contract-history-action delete">Sil</button></div></div>`).join(''):'<div class="contract-history-empty">Henüz fiyat değişikliği bulunmuyor.</div>';
  detail.innerHTML=`
    <div class="contract-detail-grid">
      ${detailCell('Firma',canonicalLabel(contract.firma))}${detailCell('Şantiye',canonicalLabel(contract.santiye))}${detailCell('Sözleşme Tarihi',trDate(contract.sozlesme_tarihi))}
      ${detailCell('Alış Fiyatı',inlineMoney(contract.alis_fiyati)+' / m³')}${detailCell('Satış Fiyatı',inlineMoney(contract.satis_fiyati)+' / m³')}${detailCell('Vade',Number(contract.vade_gunu||0)+' gün')}
      ${detailCell('Fiyat Sabitlik Bitişi',trDate(contract.sabitlik_bitis_tarihi))}${detailCell('Toplam Sözleşme',inlineM3(contract.toplam_sozlesme_m3))}${detailCell('Devir',inlineM3(contract.devir_m3)+(contract.devir_tarihi?' · '+trDate(contract.devir_tarihi):''))}
      ${contract.santiye_adresi?detailCell('Şantiye Adresi',contract.santiye_adresi,true):''}
    </div>
    <div class="contract-progress-grid">${progressValues.map(x=>`<div>${esc(x.label)}<strong>${esc(x.value)}</strong></div>`).join('')}</div>
    <div class="contract-inline-head"><h4>💰 Fiyat Geçmişi</h4><div><button type="button" class="contract-inline-add contract-inline-edit">Düzenle</button> <button type="button" class="contract-inline-add contract-inline-history-add">+ Eski Fiyat Ekle</button></div></div>
    <div class="contract-inline-history">${historyHtml}</div>`;
  detail.querySelector('.contract-inline-edit')?.addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();if(typeof window.selectContract==='function')await window.selectContract(Number(id));showContractEditor('Sözleşmeyi Düzenle')});
  detail.querySelector('.contract-inline-history-add')?.addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();if(typeof window.selectContract==='function')await window.selectContract(Number(id));const form=$('contractHistoryForm');if(!form)return;detail.appendChild(form);form.style.display=form.style.display==='none'?'block':'none';if(form.style.display==='block')form.scrollIntoView({behavior:'smooth',block:'nearest'})});
  detail.querySelectorAll('[data-history-id]').forEach(row=>{const item=history.find(x=>String(x.id)===row.dataset.historyId);if(!item)return;row.querySelector('.edit').onclick=()=>editHistoryRow(row,item,id,detail);row.querySelector('.delete').onclick=()=>deleteHistoryRow(item,id,detail)});
}
function toggleInlineCard(wrap,id,detail){
  const opening=!wrap.classList.contains('is-open');document.querySelectorAll('#contractsList .contract-card-wrap.is-open').forEach(x=>{if(x!==wrap)x.classList.remove('is-open')});wrap.classList.toggle('is-open',opening);if(opening)setTimeout(()=>loadInlineContract(id,detail),0)
}
function decorateCards(){$('contractDeleteBtn')?.remove();const list=$('contractsList');if(!list)return;[...list.querySelectorAll('.contract-card')].forEach(card=>{if(card.closest('.contract-card-wrap'))return;const id=cardId(card);if(!id)return;const wrap=document.createElement('div');wrap.className='contract-card-wrap';card.parentNode.insertBefore(wrap,card);wrap.appendChild(card);const detail=document.createElement('div');detail.className='contract-inline-detail';wrap.appendChild(detail);card.addEventListener('click',()=>toggleInlineCard(wrap,id,detail));detail.addEventListener('click',e=>{if(e.target.closest('button,input,select,textarea,label,a,.contract-history-edit-form'))return;toggleInlineCard(wrap,id,detail)});const del=document.createElement('button');del.type='button';del.className='contract-list-delete';del.title='Sözleşmeyi Sil';del.textContent='🗑️';del.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();deleteContract(id,del)});wrap.appendChild(del)})}
function observeContracts(){const list=$('contractsList');if(!list||list.dataset.deleteObserver==='1')return;list.dataset.deleteObserver='1';new MutationObserver(()=>requestAnimationFrame(decorateCards)).observe(list,{childList:true,subtree:false})}
function showContractEditor(title){const editor=document.querySelector('#contractsPage .contract-editor-box');if(!editor)return;editor.classList.add('is-visible');const heading=editor.querySelector(':scope>h3');if(heading)heading.textContent='🏗️ '+title;editor.scrollIntoView({behavior:'smooth',block:'start'})}
function hideContractEditor(){document.querySelector('#contractsPage .contract-editor-box')?.classList.remove('is-visible')}
function setupContractLayout(){
  const boxes=document.querySelectorAll('#contractsPage .settings-grid>.settings-box');if(boxes.length<2)return;const listBox=boxes[0],editor=boxes[1];listBox.classList.add('contract-list-box');editor.classList.add('contract-editor-box');
  const body=editor.querySelector('.settings-body');if(body&&!body.querySelector('.contract-editor-toolbar')){const toolbar=document.createElement('div');toolbar.className='contract-editor-toolbar';toolbar.innerHTML='<button type="button" class="contract-editor-close">✕ Formu Kapat</button>';toolbar.querySelector('button').onclick=hideContractEditor;body.prepend(toolbar)}
  const history=$('contractPriceHistory')?.parentElement;const progress=$('contractProgress')?.parentElement;if(history)history.classList.add('contract-legacy-history');if(progress)progress.classList.add('contract-legacy-progress');
  const newBtn=$('contractNewBtn');if(newBtn&&newBtn.dataset.inlineEditor!=='1'){newBtn.dataset.inlineEditor='1';newBtn.addEventListener('click',()=>setTimeout(()=>showContractEditor('Yeni Sözleşme'),0))}
}

function blocks(){const box=$('recordsCombinedView');if(!box)return{};const all=[...box.querySelectorAll('.rc-block')];return{box,concrete:all.find(x=>/Beton Sevkiyatları/i.test(x.querySelector('h3')?.textContent||'')),cement:all.find(x=>/Çimento Sevkiyatları/i.test(x.querySelector('h3')?.textContent||''))}}
function concreteRows(){const b=blocks().concrete;return b?[...b.querySelectorAll('.rc-table tbody tr')].filter(r=>r.children.length>=9):[]}
function cementRows(){const b=blocks().cement;return b?[...b.querySelectorAll('.rc-table tbody tr')].filter(r=>r.children.length>=6):[]}
function rowIso(row){const t=(row.children[1]?.textContent||'').trim();let m=t.match(/(\d{2})\.(\d{2})\.(\d{4})/);if(m)return`${m[3]}-${m[2]}-${m[1]}`;m=t.match(/(\d{4})-(\d{2})-(\d{2})/);return m?m[0]:''}
function uniqueLabels(values){
  const unique=new Map();
  for(const value of values){
    const item=canonicalParts(value);
    if(item.key&&!unique.has(item.key))unique.set(item.key,item.label);
  }
  return [...unique.values()].sort((a,b)=>a.localeCompare(b,'tr'));
}
function fillSelect(id,values,allLabel,canonical=true){
  const select=$(id);if(!select)return;
  const selectedKey=canonical?canonicalKey(select.value):norm(select.value);
  select.replaceChildren(new Option(allLabel,''),...values.map(value=>new Option(value,value)));
  const selected=[...select.options].find(option=>(canonical?canonicalKey(option.value):norm(option.value))===selectedKey);
  select.value=selected?.value||'';
}

function forceLegacyAll(){
  const range=$('exportRange');if(range&&range.value!=='all'){range.value='all';range.dispatchEvent(new Event('change',{bubbles:true}))}
  ['exportRange','exportDate','exportPdfBtn','exportExcelBtn','exportPrintBtn'].forEach(id=>{const el=$(id);if(!el)return;const wrap=(id==='exportRange'||id==='exportDate')?(el.closest('label')||el.parentElement):el;wrap.style.display='none'});
  [...document.querySelectorAll('#recordsPage label')].forEach(l=>{const t=(l.textContent||'').trim();if(t==='Plan dönemi'||t==='Referans tarihi')l.style.display='none'});
  [...document.querySelectorAll('#recordsPage button')].forEach(btn=>{if(btn.closest('#shipmentQuickFilters'))return;const t=(btn.textContent||'').trim();if(t==='PDF İndir'||t==='Excel İndir'||t==='Yazdır')btn.style.display='none'});
}

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
  const result=$('shipmentFilterResult');if(result){const parts=[];if(type!=='cement')parts.push(`<span class="sqf-badge">🚚 ${cc} beton · ${trNum(m3)} m³</span>`);if(type!=='concrete')parts.push(`<span class="sqf-badge sqf-badge-cement">🏗️ ${zc} çimento · ${vehicles} araç · ${trNum(tons)} ton</span>`);result.innerHTML=parts.join('')}
  if(cb?.querySelector('.rc-total'))cb.querySelector('.rc-total').innerHTML=`<span>BETON SEVKİYATI: ${cc}</span><span>GENEL BETON: ${trNum(m3)} m³</span>`;
  if(ceb?.querySelector('.rc-total'))ceb.querySelector('.rc-total').innerHTML=`<span>ÇİMENTO SEVKİYATI: ${zc}</span><span>TOPLAM ARAÇ: ${vehicles}</span><span>TOPLAM TONAJ: ${trNum(tons)} ton</span>`;
}

function setQuick(kind,button){const today=new Date();let start='',end='';if(kind==='today'){start=end=iso(today)}else if(kind==='tomorrow'){start=end=iso(addDays(today,1))}else if(kind==='week'){const s=monday(today);start=iso(s);end=iso(addDays(s,6))}else if(kind==='month'){start=iso(new Date(today.getFullYear(),today.getMonth(),1));end=iso(new Date(today.getFullYear(),today.getMonth()+1,0))}$('shipmentFilterStart').value=start;$('shipmentFilterEnd').value=end;document.querySelectorAll('#shipmentQuickFilters .sqf-quick button').forEach(b=>b.classList.toggle('active',b===button));applyFilters()}
function clearFilters(){['shipmentFilterCompany','shipmentFilterSite','shipmentFilterPlant','shipmentFilterConcrete','shipmentFilterDelivery','shipmentFilterStart','shipmentFilterEnd'].forEach(id=>{if($(id))$(id).value=''});if($('shipmentFilterType'))$('shipmentFilterType').value='all';document.querySelectorAll('#shipmentQuickFilters .sqf-quick button').forEach(b=>b.classList.toggle('active',b.dataset.quick==='all'));refreshOptions();applyFilters()}

function exportData(){
  const cr=concreteRows().filter(r=>r.style.display!=='none').map((r,i)=>({No:i+1,Tarih:(r.children[1]?.textContent||'').trim(),Saat:(r.children[2]?.textContent||'').trim(),Santral:(r.children[3]?.textContent||'').trim(),Firma:canonicalLabel(r.children[4]?.textContent||''),'Şantiye':canonicalLabel(r.children[5]?.textContent||''),Beton:(r.children[6]?.textContent||'').trim(),Metraj:(r.children[7]?.textContent||'').trim(),Pompa:(r.children[8]?.textContent||'').trim(),Sorumlu:(r.children[9]?.textContent||'').trim(),Telefon:(r.children[10]?.textContent||'').trim()}));
  const ce=cementRows().filter(r=>r.style.display!=='none').map((r,i)=>({No:i+1,Tarih:(r.children[1]?.textContent||'').trim(),Firma:canonicalLabel(r.children[2]?.textContent||''),'Teslim Yeri':canonicalLabel(r.children[3]?.textContent||''),Araç:(r.children[4]?.textContent||'').trim(),Tonaj:(r.children[5]?.textContent||'').trim()}));
  return{concrete:cr,cement:ce,m3:cr.reduce((s,r)=>s+parseNumber(r.Metraj),0),vehicles:ce.reduce((s,r)=>s+parseNumber(r.Araç),0),tons:ce.reduce((s,r)=>s+parseNumber(r.Tonaj),0)}
}
function exportTitle(){const type=$('shipmentFilterType')?.value||'all';return type==='concrete'?'Beton Sevkiyatları':type==='cement'?'Çimento Sevkiyatları':'Sevkiyatlar'}
function exportSubline(){const company=$('shipmentFilterCompany')?.value||'Tüm Firmalar',start=$('shipmentFilterStart')?.value,end=$('shipmentFilterEnd')?.value;let date='';if(start&&end)date=`${trDate(start)} – ${trDate(end)}`;else if(start)date=`${trDate(start)} sonrası`;else if(end)date=`${trDate(end)} tarihine kadar`;return[company,date].filter(Boolean).join(' · ')}
function pdfIso(value){const parts=String(value||'').trim().split('.');return parts.length===3?`${parts[2]}-${parts[1]}-${parts[0]}`:value}
async function pdf(){
  const p=exportData();if(!p.concrete.length&&!p.cement.length)return alert('Çıktı alınacak sevkiyat bulunmuyor.');
  if(!window.BetonexaProfessionalPdf?.savePrepared)return alert('PDF modülü yüklenemedi. Sayfayı yenileyip tekrar deneyin.');
  const start=$('shipmentFilterStart')?.value||'',end=$('shipmentFilterEnd')?.value||'',type=$('shipmentFilterType')?.value||'all',company=$('shipmentFilterCompany')?.value||'';
  let dateLabel='Tüm kayıtlar';if(start&&end)dateLabel=`${trDate(start)} - ${trDate(end)}`;else if(start)dateLabel=`${trDate(start)} sonrası`;else if(end)dateLabel=`${trDate(end)} tarihine kadar`;
  const typeLabel=type==='concrete'?'Beton Sevkiyatları':type==='cement'?'Çimento Sevkiyatları':'Tüm Sevkiyatlar';
  const splitConcrete=value=>{const match=String(value||'').trim().match(/^(C\s*\d+)\s*(.*)$/i);return{sinif:match?.[1]||value||'',ozellik:match?.[2]||''}};
  const data={concrete:p.concrete.map(row=>{const beton=splitConcrete(row.Beton);return{tarih:pdfIso(row.Tarih),saat:row.Saat,santral:row.Santral,firma:row.Firma,santiye:row['Şantiye'],beton_sinifi:beton.sinif,beton_ozelligi:beton.ozellik,metraj:parseNumber(row.Metraj),metraj_plus:/\+/.test(row.Metraj),pompa_var_mi:!/^pompasız$/i.test(row.Pompa),pompa_tipi:row.Pompa,sorumlu_kisi:row.Sorumlu,telefon:row.Telefon}}),cement:p.cement.map(row=>({tarih:pdfIso(row.Tarih),firma:row.Firma,teslim_yeri:row['Teslim Yeri'],arac_sayisi:parseNumber(row.Araç),toplam_tonaj:row.Tonaj==='-'?null:parseNumber(row.Tonaj)}))};
  const suffix=company?`-${asciiKey(company).replace(/\s+/g,'-')}`:'';
  await window.BetonexaProfessionalPdf.savePrepared({mode:'selection',start:start||null,end:end||null,dateLabel,typeLabel},data,`Betonexa-Sevkiyat-Raporu${suffix}.pdf`);
}
function excel(){const p=exportData();if(!p.concrete.length&&!p.cement.length)return alert('Çıktı alınacak sevkiyat bulunmuyor.');if(!window.XLSX)return alert('Excel modülü yüklenemedi.');const wb=XLSX.utils.book_new();if(p.concrete.length){const rows=p.concrete.map(x=>({...x,Metraj:parseNumber(x.Metraj)}));rows.push({Firma:'TOPLAM',Metraj:p.m3});XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),'Beton')}if(p.cement.length){const rows=p.cement.map(x=>({...x,Araç:parseNumber(x.Araç),Tonaj:parseNumber(x.Tonaj)}));rows.push({Firma:'TOPLAM',Araç:p.vehicles,Tonaj:p.tons});XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),'Çimento')}XLSX.writeFile(wb,'Betonexa-Sevkiyatlar.xlsx')}
function printRows(){const p=exportData();if(!p.concrete.length&&!p.cement.length)return alert('Yazdırılacak filtrelenmiş sevkiyat bulunmuyor.');const w=window.open('','_blank');if(!w)return;const table=(heads,rows)=>`<table><tr>${heads.map(h=>`<th>${esc(h)}</th>`).join('')}</tr>${rows.map(row=>`<tr>${row.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</table>`;let html=`<!doctype html><meta charset="utf-8"><title>${esc(exportTitle())}</title><style>body{font-family:Arial;padding:22px}table{width:100%;border-collapse:collapse;font-size:10px;margin-bottom:10px}th,td{border:1px solid #bbb;padding:6px}th{background:#6f42c1;color:#fff}h3{margin-top:20px}</style><h2>${esc(exportTitle())}</h2><p>${esc(exportSubline())}</p>`;if(p.concrete.length)html+=`<h3>Beton Sevkiyatları</h3>${table(['No','Tarih','Saat','Santral','Firma','Şantiye','Beton','Metraj','Pompa'],p.concrete.map(x=>[x.No,x.Tarih,x.Saat,x.Santral,x.Firma,x['Şantiye'],x.Beton,x.Metraj,x.Pompa]))}<b>BETON TOPLAM: ${p.concrete.length} sevkiyat · ${trNum(p.m3)} m³</b>`;if(p.cement.length)html+=`<h3>Çimento Sevkiyatları</h3>${table(['No','Tarih','Firma','Teslim Yeri','Araç','Tonaj'],p.cement.map(x=>[x.No,x.Tarih,x.Firma,x['Teslim Yeri'],x.Araç,x.Tonaj]))}<b>ÇİMENTO TOPLAM: ${p.cement.length} sevkiyat · ${p.vehicles} araç · ${trNum(p.tons)} ton</b>`;w.document.write(html);w.document.close();setTimeout(()=>w.print(),250)}

function ensureFilters(){
  forceLegacyAll();const{box}=blocks();if(!box)return false;let p=$('shipmentQuickFilters');if(!p){p=document.createElement('div');p.id='shipmentQuickFilters';p.innerHTML=`
    <div class="sqf-head"><strong>🔎 Sevkiyat Filtreleri</strong><span id="shipmentFilterResult"></span></div>
    <div class="sqf-quick"><button type="button" data-quick="today">Bugün</button><button type="button" data-quick="tomorrow">Yarın</button><button type="button" data-quick="week">Bu Hafta</button><button type="button" data-quick="month">Bu Ay</button><button type="button" data-quick="all" class="active">Tümü</button></div>
    <div class="sqf-grid">
      <label>Sevkiyat Türü<select id="shipmentFilterType"><option value="all">Tümü</option><option value="concrete">Beton</option><option value="cement">Çimento</option></select></label>
      <label>Firma<select id="shipmentFilterCompany"></select></label>
      <label data-only="concrete">Şantiye<select id="shipmentFilterSite"></select></label>
      <label data-only="concrete">Santral<select id="shipmentFilterPlant"></select></label>
      <label data-only="concrete">Beton Sınıfı<select id="shipmentFilterConcrete"></select></label>
      <label data-only="cement">Teslim Yeri<select id="shipmentFilterDelivery"></select></label>
      <label>Başlangıç Tarihi<input id="shipmentFilterStart" type="date"></label>
      <label>Bitiş Tarihi<input id="shipmentFilterEnd" type="date"></label>
    </div>
    <div class="sqf-actions"><button id="shipmentFilterPdf" class="btn btn-light" type="button">PDF İndir</button><button id="shipmentFilterExcel" class="btn btn-light" type="button">Excel İndir</button><button id="shipmentFilterPrint" class="btn btn-light" type="button">Yazdır</button><button id="shipmentFilterClear" class="btn btn-light sqf-clear" type="button">Filtreleri Temizle</button></div>`;
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
function init(){addStyles();if($('contractsPage')){setupContractLayout();decorateCards();observeContracts()}forceLegacyAll();observeRecords();ensureFilters();document.querySelector('[data-page="records"]')?.addEventListener('click',()=>setTimeout(ensureFilters,180))}
let tries=0,t=setInterval(()=>{init();if(++tries>80)clearInterval(t)},250);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
