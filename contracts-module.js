(function(){
'use strict';
const $=id=>document.getElementById(id);
const TABLE='sozlesmeler';
let selectedId=null;
function db(){return typeof window.ensureDb==='function'?window.ensureDb():null}
function status(msg,error=false){let el=$('contractDeleteStatus');if(!el){el=document.createElement('div');el.id='contractDeleteStatus';el.style.cssText='margin-top:8px;font-size:13px;font-weight:700';$('contractSaveBtn')?.parentElement?.appendChild(el)}if(el){el.textContent=msg||'';el.style.color=error?'var(--danger,#b42318)':'var(--ok,#18794e)'}}
function ensureDeleteButton(){const save=$('contractSaveBtn');if(!save||$('contractDeleteBtn'))return;const del=document.createElement('button');del.id='contractDeleteBtn';del.type='button';del.className='btn btn-danger';del.textContent='🗑️ Sözleşmeyi Sil';del.style.marginLeft='8px';del.style.display='none';save.insertAdjacentElement('afterend',del);del.addEventListener('click',removeSelected)}
function showDeleteButton(){ensureDeleteButton();const del=$('contractDeleteBtn');if(del)del.style.display=selectedId?'inline-flex':'none'}
function captureIdFromCard(card){if(!card)return null;const onclick=card.getAttribute('onclick')||'';const m=onclick.match(/selectContract\((\d+)\)/);return m?m[1]:null}
async function removeSelected(){if(!selectedId){status('Silmek için önce soldaki listeden bir sözleşme seç.',true);return}if(!confirm('Bu sözleşmeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.'))return;const client=db();if(!client){status('Veritabanı bağlantısı yüklenemedi.',true);return}const del=$('contractDeleteBtn');if(del)del.disabled=true;status('Sözleşme siliniyor…');const{error}=await client.from(TABLE).delete().eq('id',selectedId);if(del)del.disabled=false;if(error){status('Sözleşme silinemedi: '+error.message,true);return}selectedId=null;status('Sözleşme silindi.');showDeleteButton();if(typeof window.clearContractForm==='function')window.clearContractForm();if(typeof window.loadContracts==='function')await window.loadContracts();else location.reload()}
function watchSelection(){const list=$('contractsList');if(!list||list.dataset.deleteBound==='1')return;list.dataset.deleteBound='1';list.addEventListener('click',e=>{const card=e.target.closest('.contract-card');if(!card)return;const id=captureIdFromCard(card);if(id){selectedId=id;setTimeout(()=>{showDeleteButton();status('')},50)}},true)}
function wrapSelectContract(){if(typeof window.selectContract!=='function'||window.selectContract.__deleteAddonWrapped)return;const original=window.selectContract;const wrapped=async function(id){selectedId=String(id);const result=await original.apply(this,arguments);showDeleteButton();status('');return result};wrapped.__deleteAddonWrapped=true;window.selectContract=wrapped}
function bindNew(){const newBtn=$('contractNewBtn');if(!newBtn||newBtn.dataset.deleteBound==='1')return;newBtn.dataset.deleteBound='1';newBtn.addEventListener('click',()=>{selectedId=null;showDeleteButton();status('')})}
function init(){if(!$('contractsPage'))return;ensureDeleteButton();watchSelection();wrapSelectContract();bindNew();showDeleteButton()}
let tries=0;const timer=setInterval(()=>{tries++;init();if(tries>40)clearInterval(timer)},250);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();