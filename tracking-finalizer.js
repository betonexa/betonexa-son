(function(){
  'use strict';

  let queued=false;

  function text(el){
    return (el?.textContent||'').replace(/\s+/g,' ').trim();
  }

  function findButton(root,label,id){
    return document.getElementById(id) || [...root.querySelectorAll('button')].find(b=>text(b)===label);
  }

  function directBadge(page,re){
    const nodes=[...page.querySelectorAll('div,span,strong')].filter(el=>re.test(text(el)));
    return nodes.filter(el=>![...el.children].some(ch=>re.test(text(ch)))).sort((a,b)=>text(a).length-text(b).length)[0]||null;
  }

  function badgeBox(leaf,page){
    if(!leaf)return null;
    let cur=leaf;
    while(cur.parentElement && cur.parentElement!==page){
      const p=cur.parentElement;
      const t=text(p);
      if(/Sevkiyat Filtreleri/i.test(t) || (/Bugün/.test(t)&&/Yarın/.test(t)&&/Bu Hafta/.test(t))) break;
      if(p.children.length>3) break;
      cur=p;
    }
    return cur;
  }

  function place(){
    const page=document.getElementById('recordsPage');
    if(!page)return;
    const report=page.querySelector('.records-report')||page;
    const pdf=findButton(report,'PDF İndir','pdfBtn');
    const excel=findButton(report,'Excel İndir','excelBtn');
    const print=findButton(report,'Yazdır','printBtn');
    if(!pdf||!excel||!print)return;
    let host=report.querySelector('#trackingExportFinalHost');
    if(!host){
      const betonLeaf=directBadge(report,/\b\d+\s*beton\b/i);
      const cimentoLeaf=directBadge(report,/\b\d+\s*çimento\b/i);
      if(!betonLeaf||!cimentoLeaf)return;
      const betonBox=badgeBox(betonLeaf,report),cimentoBox=badgeBox(cimentoLeaf,report);
      if(!betonBox||!cimentoBox)return;
      let parent=betonBox.parentElement;
      if(parent!==cimentoBox.parentElement){
        const common=[...report.querySelectorAll('*')].find(el=>el.children && [...el.children].includes(betonBox) && [...el.children].includes(cimentoBox));
        if(common)parent=common;
      }
      if(!parent)return;
      host=document.createElement('div');
      host.id='trackingExportFinalHost';
      parent.insertBefore(host,betonBox);
      if(betonBox.isConnected)betonBox.remove();
      if(cimentoBox.isConnected)cimentoBox.remove();
    }
    const oldParents=new Set([pdf.parentElement,excel.parentElement,print.parentElement]);
    [pdf,excel,print].forEach(btn=>{ if(btn.parentElement!==host) host.appendChild(btn); });
    oldParents.forEach(p=>{ if(p&&p!==host&&!p.querySelector('button')) p.style.setProperty('display','none','important'); });
    host.className='tomorrow-actions';
    Object.assign(host.style,{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:'8px',flexWrap:'nowrap',width:'auto',margin:'0',padding:'0',position:'static',background:'transparent',border:'0'});
    pdf.className='btn btn-primary'; excel.className='btn btn-light'; print.className='btn btn-light';
    pdf.style.setProperty('background','#6f42c1','important');
    pdf.style.setProperty('border-color','#6f42c1','important');
    pdf.style.setProperty('color','#fff','important');
    [excel,print].forEach(btn=>{btn.style.removeProperty('background');btn.style.removeProperty('border-color');btn.style.removeProperty('color');});
    [pdf,excel,print].forEach(btn=>{btn.style.setProperty('width','auto','important');btn.style.setProperty('min-width','0','important');btn.style.setProperty('margin','0','important');btn.style.setProperty('white-space','nowrap','important');});
  }

  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;place();});}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',schedule,{once:true}); else schedule();
  const page=document.getElementById('recordsPage');
  if(page) new MutationObserver(schedule).observe(page,{childList:true,subtree:true});
  else new MutationObserver(()=>{const p=document.getElementById('recordsPage');if(p){ schedule(); new MutationObserver(schedule).observe(p,{childList:true,subtree:true}); }}).observe(document.documentElement,{childList:true,subtree:true});
})();

(function(){
  'use strict';
  const TABLE='cimento_sevkiyatlar';
  const $=id=>document.getElementById(id);
  let editingId=null;
  let editingRecord=null;

  function db(){return typeof window.ensureDb==='function'?window.ensureDb():null;}
  function isCementEdit(btn){
    if(!btn?.matches?.('.rc-edit'))return false;
    const block=btn.closest('.rc-block');
    return !!block && /Çimento/i.test(block.querySelector('h3')?.textContent||'');
  }
  function rowId(btn){
    const row=btn.closest('tr');
    const select=row?.querySelector('.shipment-status-select[data-shipment-type="cement"][data-shipment-id]');
    if(select?.dataset.shipmentId)return select.dataset.shipmentId;
    const code=btn.getAttribute('onclick')||'';
    return code.match(/editCementFromCombined\(['"]?([^'")]+)['"]?\)/)?.[1]||null;
  }
  function showPage(){
    const page=$('cementPage');if(!page)return false;
    document.querySelectorAll('main.content > section.panel').forEach(s=>s.classList.add('hidden'));
    document.querySelectorAll('.tabs button').forEach(b=>b.classList.remove('active'));
    page.classList.remove('hidden');
    ($('cementTabBtn')||document.querySelector('.tabs [data-page="cement"]'))?.classList.add('active');
    return true;
  }
  function fill(r){
    editingId=String(r.id);editingRecord=r;window.__cementPendingEditId=editingId;
    if($('cementDate'))$('cementDate').value=r.tarih||'';
    if($('cementCompany'))$('cementCompany').value=r.firma||'';
    if($('cementDelivery'))$('cementDelivery').value=r.teslim_yeri||'Şantiye';
    if($('cementVehicleCount'))$('cementVehicleCount').value=r.arac_sayisi??'';
    if($('cementTonnage'))$('cementTonnage').value=r.toplam_tonaj==null?'0':r.toplam_tonaj;
    if($('cementSaveBtn'))$('cementSaveBtn').textContent='Değişiklikleri Kaydet';
    $('cementCancelBtn')?.classList.remove('hidden');
    const h=document.querySelector('#cementPage .cement-head h2');if(h)h.textContent='🏗️ Çimento Sevkiyatını Düzenle';
    if($('cementStatus'))$('cementStatus').textContent='Tamamlanmış kayıt düzenleniyor.';
  }
  async function open(id){
    const c=db();if(!c)return;
    const {data,error}=await c.from(TABLE).select('*').eq('id',id).limit(1);
    if(error||!data?.[0]){alert('Çimento sevkiyatı bulunamadı'+(error?.message?': '+error.message:'.'));return;}
    if(!showPage())return;
    fill(data[0]);
    setTimeout(()=>{if(editingId===String(id))fill(data[0]);},0);
    setTimeout(()=>{if(editingId===String(id))fill(data[0]);},150);
  }
  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('button');
    if(!isCementEdit(btn))return;
    const id=rowId(btn);if(!id)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    open(id);
  },true);

  document.addEventListener('click',async e=>{
    if(!editingId||!e.target.closest?.('#cementSaveBtn'))return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    const tarih=$('cementDate')?.value||'';
    const firma=String($('cementCompany')?.value||'').trim();
    const teslim=String($('cementDelivery')?.value||'').trim()||'Şantiye';
    const arac=Number($('cementVehicleCount')?.value);
    const raw=String($('cementTonnage')?.value??'').trim().replace(',','.');
    const ton=(raw===''||Number(raw)===0)?null:Number(raw);
    if(!tarih||!firma||!Number.isInteger(arac)||arac<1||(ton!==null&&!Number.isFinite(ton))){alert('Çimento sevkiyat bilgilerini kontrol et.');return;}
    const c=db();if(!c)return;
    const save=$('cementSaveBtn');if(save)save.disabled=true;
    const payload={tarih,firma,teslim_yeri:teslim,arac_sayisi:arac,toplam_tonaj:ton};
    const {error}=await c.from(TABLE).update(payload).eq('id',editingId);
    if(save)save.disabled=false;
    if(error){alert('Çimento sevkiyatı güncellenemedi: '+error.message);return;}
    editingId=null;editingRecord=null;window.__cementPendingEditId=null;
    if(save)save.textContent='Sevkiyatı Kaydet';
    $('cementCancelBtn')?.classList.add('hidden');
    if($('cementStatus'))$('cementStatus').textContent='Çimento sevkiyatı güncellendi.';
    try{if(typeof window.refreshRecordsCombined==='function')await window.refreshRecordsCombined();}catch(_){}
  },true);

  document.addEventListener('click',e=>{
    if(!e.target.closest?.('#cementCancelBtn'))return;
    editingId=null;editingRecord=null;window.__cementPendingEditId=null;
  },true);
})();
