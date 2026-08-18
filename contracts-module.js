(function(){
'use strict';
const $=id=>document.getElementById(id);
const TABLE='sozlesmeler';
const db=()=>typeof window.ensureDb==='function'?window.ensureDb():null;

function addStyles(){
  if(!$('contractListDeleteStyles')){
    const s=document.createElement('style');
    s.id='contractListDeleteStyles';
    s.textContent=`
      #contractsList .contract-card-wrap{position:relative;margin-bottom:10px}
      #contractsList .contract-card-wrap>.contract-card{width:100%;margin:0;padding-right:58px}
      #contractsList .contract-list-delete{position:absolute;right:10px;top:50%;transform:translateY(-50%);z-index:3;width:36px;height:36px;border:1px solid rgba(190,40,40,.18);border-radius:10px;background:#fff0f0;color:#b42318;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center}
      #contractsList .contract-list-delete:hover{background:#ffe3e3}
    `;
    document.head.appendChild(s);
  }
  if(!$('shipmentFilterStyles')){
    const s=document.createElement('style');
    s.id='shipmentFilterStyles';
    s.textContent=`
      #shipmentQuickFilters{margin:14px 0 16px;padding:14px;border:1px solid rgba(103,52,189,.14);border-radius:14px;background:rgba(255,255,255,.48)}
      #shipmentQuickFilters .sqf-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;flex-wrap:wrap}
      #shipmentQuickFilters .sqf-head strong{font-size:15px;color:var(--purple-dark,#4d2393)}
      #shipmentQuickFilters .sqf-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) auto;gap:10px;align-items:end}
      #shipmentQuickFilters label{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:800;color:var(--muted,#687181)}
      #shipmentQuickFilters select{width:100%;height:42px;border:1px solid rgba(103,52,189,.20);border-radius:10px;background:rgba(255,255,255,.86);padding:0 10px;font:inherit;color:var(--ink,#202633)}
      #shipmentFilterResult{font-size:12px;font-weight:800;color:var(--purple-dark,#4d2393)}
      @media(max-width:800px){#shipmentQuickFilters .sqf-grid{grid-template-columns:1fr 1fr}#shipmentQuickFilters .sqf-clear{grid-column:1/-1}}
      @media(max-width:520px){#shipmentQuickFilters .sqf-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }
}

function hideDetailDelete(){const old=$('contractDeleteBtn');if(old)old.remove()}
function cardId(card){const onclick=card?.getAttribute('onclick')||'';const m=onclick.match(/selectContract\((\d+)\)/);return m?m[1]:null}
async function deleteContract(id,btn){
  if(!id)return;
  if(!confirm('Bu sözleşmeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.'))return;
  const client=db();if(!client){alert('Veritabanı bağlantısı yüklenemedi.');return}
  if(btn)btn.disabled=true;
  const {error}=await client.from(TABLE).delete().eq('id',id);
  if(btn)btn.disabled=false;
  if(error){alert('Sözleşme silinemedi: '+error.message);return}
  if(typeof window.clearContractForm==='function')window.clearContractForm();
  if(typeof window.loadContracts==='function')await window.loadContracts();
  decorateCards();
}
function decorateCards(){
  hideDetailDelete();
  const list=$('contractsList');if(!list)return;
  [...list.querySelectorAll('.contract-card')].forEach(card=>{
    if(card.closest('.contract-card-wrap'))return;
    const id=cardId(card);if(!id)return;
    const wrap=document.createElement('div');wrap.className='contract-card-wrap';
    card.parentNode.insertBefore(wrap,card);wrap.appendChild(card);
    const del=document.createElement('button');del.type='button';del.className='contract-list-delete';del.title='Sözleşmeyi Sil';del.setAttribute('aria-label','Sözleşmeyi Sil');del.textContent='🗑️';
    del.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();deleteContract(id,del)});wrap.appendChild(del);
  });
}
function observeList(){const list=$('contractsList');if(!list||list.dataset.deleteObserver==='1')return;list.dataset.deleteObserver='1';new MutationObserver(()=>requestAnimationFrame(decorateCards)).observe(list,{childList:true,subtree:false})}

const norm=v=>String(v||'').trim().toLocaleLowerCase('tr-TR').replace(/\s+/g,' ');
function betonBlock(){const box=$('recordsCombinedView');if(!box)return null;return [...box.querySelectorAll('.rc-block')].find(x=>/Beton Sevkiyatları/i.test(x.querySelector('h3')?.textContent||''))||null}
function uniqueFromRows(rows,index){return [...new Set(rows.map(r=>(r.children[index]?.textContent||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr'))}
function fillSelect(select,values,label){if(!select)return;const current=select.value;select.innerHTML=`<option value="">Tüm ${label}</option>`+values.map(v=>`<option value="${v.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}">${v}</option>`).join('');if([...select.options].some(o=>o.value===current))select.value=current}
function ensureShipmentFilters(){
  const block=betonBlock();if(!block)return false;
  let panel=$('shipmentQuickFilters');
  if(!panel){
    panel=document.createElement('div');panel.id='shipmentQuickFilters';panel.innerHTML=`
      <div class="sqf-head"><strong>🔎 Sevkiyat Filtreleri</strong><span id="shipmentFilterResult"></span></div>
      <div class="sqf-grid">
        <label>Firma<select id="shipmentFilterCompany"><option value="">Tüm Firmalar</option></select></label>
        <label>Şantiye<select id="shipmentFilterSite"><option value="">Tüm Şantiyeler</option></select></label>
        <label>Santral<select id="shipmentFilterPlant"><option value="">Tüm Santraller</option></select></label>
        <button id="shipmentFilterClear" type="button" class="btn btn-light sqf-clear">Filtreleri Temizle</button>
      </div>`;
    block.insertBefore(panel,block.querySelector('.rc-table')||block.firstChild);
    ['shipmentFilterCompany','shipmentFilterSite','shipmentFilterPlant'].forEach(id=>$(id)?.addEventListener('change',applyShipmentFilters));
    $('shipmentFilterClear')?.addEventListener('click',()=>{['shipmentFilterCompany','shipmentFilterSite','shipmentFilterPlant'].forEach(id=>{if($(id))$(id).value=''});applyShipmentFilters()});
  }
  refreshShipmentFilterOptions();applyShipmentFilters();return true;
}
function refreshShipmentFilterOptions(){
  const block=betonBlock();if(!block)return;
  const rows=[...block.querySelectorAll('.rc-table tbody tr')].filter(r=>r.children.length>=9);
  fillSelect($('shipmentFilterCompany'),uniqueFromRows(rows,4),'Firmalar');
  fillSelect($('shipmentFilterSite'),uniqueFromRows(rows,5),'Şantiyeler');
  fillSelect($('shipmentFilterPlant'),uniqueFromRows(rows,3),'Santraller');
}
function parseM3(text){const raw=String(text||'').replace(/m³/gi,'').replace(/\+/g,'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,'');const n=Number(raw);return Number.isFinite(n)?n:0}
function trNum(n){return Number(n||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})}
function applyShipmentFilters(){
  const block=betonBlock();if(!block)return;
  const company=norm($('shipmentFilterCompany')?.value),site=norm($('shipmentFilterSite')?.value),plant=norm($('shipmentFilterPlant')?.value);
  const rows=[...block.querySelectorAll('.rc-table tbody tr')].filter(r=>r.children.length>=9);
  let count=0,total=0;
  rows.forEach(r=>{
    const ok=(!company||norm(r.children[4]?.textContent)===company)&&(!site||norm(r.children[5]?.textContent)===site)&&(!plant||norm(r.children[3]?.textContent)===plant);
    r.style.display=ok?'':'none';if(ok){count++;total+=parseM3(r.children[7]?.textContent)}
  });
  const result=$('shipmentFilterResult');if(result)result.textContent=`${count} sevkiyat · ${trNum(total)} m³`;
  const totalBox=block.querySelector('.rc-total');
  if(totalBox){totalBox.dataset.originalHtml=totalBox.dataset.originalHtml||totalBox.innerHTML;const active=company||site||plant;if(active)totalBox.innerHTML=`<span>FİLTRELENEN SEVKİYAT: ${count}</span><span>FİLTRELENEN BETON: ${trNum(total)} m³</span>`;else if(totalBox.dataset.originalHtml)totalBox.innerHTML=totalBox.dataset.originalHtml}
}
function observeRecords(){
  const host=$('recordsPage');if(!host||host.dataset.shipmentFilterObserver==='1')return;
  host.dataset.shipmentFilterObserver='1';let timer=null;
  new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>{ensureShipmentFilters()},80)}).observe(host,{childList:true,subtree:true});
}
function initFilters(){addStyles();observeRecords();ensureShipmentFilters();document.querySelector('[data-page="records"]')?.addEventListener('click',()=>setTimeout(ensureShipmentFilters,120))}

function init(){if($('contractsPage')){addStyles();hideDetailDelete();decorateCards();observeList()}initFilters()}
let tries=0;const timer=setInterval(()=>{tries++;init();if(tries>60)clearInterval(timer)},250);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();