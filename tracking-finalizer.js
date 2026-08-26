(function(){
  'use strict';
  let queued=false;
  function text(el){return (el?.textContent||'').replace(/\s+/g,' ').trim();}
  function findButton(root,label,id){return document.getElementById(id)||[...root.querySelectorAll('button')].find(b=>text(b)===label);}
  function directBadge(page,re){const nodes=[...page.querySelectorAll('div,span,strong')].filter(el=>re.test(text(el)));return nodes.filter(el=>![...el.children].some(ch=>re.test(text(ch)))).sort((a,b)=>text(a).length-text(b).length)[0]||null;}
  function badgeBox(leaf,page){if(!leaf)return null;let cur=leaf;while(cur.parentElement&&cur.parentElement!==page){const p=cur.parentElement,t=text(p);if(/Sevkiyat Filtreleri/i.test(t)||(/Bugün/.test(t)&&/Yarın/.test(t)&&/Bu Hafta/.test(t)))break;if(p.children.length>3)break;cur=p;}return cur;}
  function place(){
    const page=document.getElementById('recordsPage');if(!page)return;const report=page.querySelector('.records-report')||page;
    const pdf=findButton(report,'PDF İndir','pdfBtn'),excel=findButton(report,'Excel İndir','excelBtn'),print=findButton(report,'Yazdır','printBtn');if(!pdf||!excel||!print)return;
    let host=report.querySelector('#trackingExportFinalHost');
    if(!host){const betonLeaf=directBadge(report,/\b\d+\s*beton\b/i),cimentoLeaf=directBadge(report,/\b\d+\s*çimento\b/i);if(!betonLeaf||!cimentoLeaf)return;const betonBox=badgeBox(betonLeaf,report),cimentoBox=badgeBox(cimentoLeaf,report);if(!betonBox||!cimentoBox)return;let parent=betonBox.parentElement;if(parent!==cimentoBox.parentElement){const common=[...report.querySelectorAll('*')].find(el=>el.children&&[...el.children].includes(betonBox)&&[...el.children].includes(cimentoBox));if(common)parent=common;}if(!parent)return;host=document.createElement('div');host.id='trackingExportFinalHost';parent.insertBefore(host,betonBox);if(betonBox.isConnected)betonBox.remove();if(cimentoBox.isConnected)cimentoBox.remove();}
    const oldParents=new Set([pdf.parentElement,excel.parentElement,print.parentElement]);[pdf,excel,print].forEach(btn=>{if(btn.parentElement!==host)host.appendChild(btn);});oldParents.forEach(p=>{if(p&&p!==host&&!p.querySelector('button'))p.style.setProperty('display','none','important');});
    host.className='tomorrow-actions';Object.assign(host.style,{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:'8px',flexWrap:'nowrap',width:'auto',margin:'0',padding:'0',position:'static',background:'transparent',border:'0'});
    pdf.className='btn btn-primary';excel.className='btn btn-light';print.className='btn btn-light';pdf.style.setProperty('background','#6f42c1','important');pdf.style.setProperty('border-color','#6f42c1','important');pdf.style.setProperty('color','#fff','important');[excel,print].forEach(btn=>{btn.style.removeProperty('background');btn.style.removeProperty('border-color');btn.style.removeProperty('color');});[pdf,excel,print].forEach(btn=>{btn.style.setProperty('width','auto','important');btn.style.setProperty('min-width','0','important');btn.style.setProperty('margin','0','important');btn.style.setProperty('white-space','nowrap','important');});
  }
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;place();});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  const page=document.getElementById('recordsPage');if(page)new MutationObserver(schedule).observe(page,{childList:true,subtree:true});else new MutationObserver(()=>{const p=document.getElementById('recordsPage');if(p){schedule();new MutationObserver(schedule).observe(p,{childList:true,subtree:true});}}).observe(document.documentElement,{childList:true,subtree:true});
})();

(function(){
  'use strict';
  const TABLE='cimento_sevkiyatlar';
  const $=id=>document.getElementById(id);
  let editingId=null;
  function db(){return typeof window.ensureDb==='function'?window.ensureDb():null;}
  function cementIdFromButton(btn){
    const row=btn?.closest?.('tr');if(!row)return null;
    const status=row.querySelector('.shipment-status-select[data-shipment-type="cement"][data-shipment-id]');
    if(status?.dataset.shipmentId)return status.dataset.shipmentId;
    const code=btn.getAttribute('onclick')||'';
    const m=code.match(/editCement(?:FromCombined|Shipment)\(['"]?([^'"\)]+)['"]?\)/i);if(m)return m[1];
    const data=btn.dataset?.cementEdit;if(data)return data;
    return null;
  }
  function isCementPencil(btn){
    if(!btn)return false;
    const id=cementIdFromButton(btn);if(!id)return false;
    const label=(btn.textContent||'')+' '+(btn.title||'');
    return /✏|düzenle/i.test(label)||btn.classList.contains('edit')||btn.classList.contains('rc-edit');
  }
  function showPage(){
    const page=$('cementPage');if(!page)return false;
    document.querySelectorAll('main.content > section.panel').forEach(s=>s.classList.add('hidden'));
    document.querySelectorAll('.tabs button').forEach(b=>b.classList.remove('active'));
    page.classList.remove('hidden');($('cementTabBtn')||document.querySelector('.tabs [data-page="cement"]'))?.classList.add('active');return true;
  }
  function fill(r){
    editingId=String(r.id);window.__cementPendingEditId=editingId;
    if($('cementDate'))$('cementDate').value=r.tarih||'';
    if($('cementCompany'))$('cementCompany').value=r.firma||'';
    if($('cementDelivery'))$('cementDelivery').value=r.teslim_yeri||'Şantiye';
    if($('cementVehicleCount'))$('cementVehicleCount').value=r.arac_sayisi??'';
    if($('cementTonnage'))$('cementTonnage').value=r.toplam_tonaj==null?'0':r.toplam_tonaj;
    if($('cementSaveBtn'))$('cementSaveBtn').textContent='Değişiklikleri Kaydet';
    $('cementCancelBtn')?.classList.remove('hidden');
    const h=document.querySelector('#cementPage .cement-head h2');if(h)h.textContent='🏗️ Çimento Sevkiyatını Düzenle';
    if($('cementStatus'))$('cementStatus').textContent='Kayıt düzenleniyor.';
  }
  async function openEdit(id){
    const c=db();if(!c)return;const {data,error}=await c.from(TABLE).select('*').eq('id',String(id)).limit(1);
    if(error||!data?.[0]){alert('Çimento sevkiyatı bulunamadı'+(error?.message?': '+error.message:'.'));return;}
    if(!showPage())return;fill(data[0]);
    [0,80,250,600].forEach(ms=>setTimeout(()=>{if(editingId===String(id))fill(data[0]);},ms));
  }
  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('button');if(!isCementPencil(btn))return;
    const id=cementIdFromButton(btn);if(!id)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openEdit(id);
  },true);
  document.addEventListener('click',async e=>{
    if(!editingId||!e.target.closest?.('#cementSaveBtn'))return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    const tarih=$('cementDate')?.value||'',firma=String($('cementCompany')?.value||'').trim(),teslim=String($('cementDelivery')?.value||'').trim()||'Şantiye',arac=Number($('cementVehicleCount')?.value),raw=String($('cementTonnage')?.value??'').trim().replace(',','.'),ton=(raw===''||Number(raw)===0)?null:Number(raw);
    if(!tarih||!firma||!Number.isInteger(arac)||arac<1||(ton!==null&&!Number.isFinite(ton))){alert('Çimento sevkiyat bilgilerini kontrol et.');return;}
    const c=db();if(!c)return;const save=$('cementSaveBtn');if(save)save.disabled=true;
    const {error}=await c.from(TABLE).update({tarih,firma,teslim_yeri:teslim,arac_sayisi:arac,toplam_tonaj:ton}).eq('id',editingId);
    if(save)save.disabled=false;if(error){alert('Çimento sevkiyatı güncellenemedi: '+error.message);return;}
    editingId=null;window.__cementPendingEditId=null;if(save)save.textContent='Sevkiyatı Kaydet';$('cementCancelBtn')?.classList.add('hidden');if($('cementStatus'))$('cementStatus').textContent='Çimento sevkiyatı güncellendi.';
    try{if(typeof window.refreshRecordsCombined==='function')await window.refreshRecordsCombined();}catch(_){}
  },true);
  document.addEventListener('click',e=>{if(!e.target.closest?.('#cementCancelBtn'))return;editingId=null;window.__cementPendingEditId=null;},true);
})();
