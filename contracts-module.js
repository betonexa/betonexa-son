(function(){
'use strict';
const $=id=>document.getElementById(id);
const TABLE='sozlesmeler';
const db=()=>typeof window.ensureDb==='function'?window.ensureDb():null;

function addStyles(){
  if($('contractListDeleteStyles'))return;
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

function hideDetailDelete(){
  const old=$('contractDeleteBtn');
  if(old)old.remove();
}

function cardId(card){
  const onclick=card?.getAttribute('onclick')||'';
  const m=onclick.match(/selectContract\((\d+)\)/);
  return m?m[1]:null;
}

async function deleteContract(id,btn){
  if(!id)return;
  if(!confirm('Bu sözleşmeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.'))return;
  const client=db();
  if(!client){alert('Veritabanı bağlantısı yüklenemedi.');return}
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
  const list=$('contractsList');
  if(!list)return;
  [...list.querySelectorAll('.contract-card')].forEach(card=>{
    if(card.closest('.contract-card-wrap'))return;
    const id=cardId(card);
    if(!id)return;
    const wrap=document.createElement('div');
    wrap.className='contract-card-wrap';
    card.parentNode.insertBefore(wrap,card);
    wrap.appendChild(card);
    const del=document.createElement('button');
    del.type='button';
    del.className='contract-list-delete';
    del.title='Sözleşmeyi Sil';
    del.setAttribute('aria-label','Sözleşmeyi Sil');
    del.textContent='🗑️';
    del.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();deleteContract(id,del)});
    wrap.appendChild(del);
  });
}

function observeList(){
  const list=$('contractsList');
  if(!list||list.dataset.deleteObserver==='1')return;
  list.dataset.deleteObserver='1';
  const obs=new MutationObserver(()=>requestAnimationFrame(decorateCards));
  obs.observe(list,{childList:true,subtree:false});
}

function init(){
  if(!$('contractsPage'))return;
  addStyles();
  hideDetailDelete();
  decorateCards();
  observeList();
}

let tries=0;
const timer=setInterval(()=>{tries++;init();if(tries>40)clearInterval(timer)},250);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();