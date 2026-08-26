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
    return nodes
      .filter(el=>![...el.children].some(ch=>re.test(text(ch))))
      .sort((a,b)=>text(a).length-text(b).length)[0]||null;
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

      const betonBox=badgeBox(betonLeaf,report);
      const cimentoBox=badgeBox(cimentoLeaf,report);
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

    oldParents.forEach(p=>{
      if(p&&p!==host&&!p.querySelector('button')) p.style.setProperty('display','none','important');
    });

    host.className='tomorrow-actions';
    Object.assign(host.style,{
      display:'flex',alignItems:'center',justifyContent:'flex-end',gap:'8px',flexWrap:'nowrap',width:'auto',margin:'0',padding:'0',position:'static',background:'transparent',border:'0'
    });

    pdf.className='btn btn-primary';
    excel.className='btn btn-light';
    print.className='btn btn-light';
    pdf.style.setProperty('background','#6f42c1','important');
    pdf.style.setProperty('border-color','#6f42c1','important');
    pdf.style.setProperty('color','#fff','important');
    [excel,print].forEach(btn=>{
      btn.style.removeProperty('background');
      btn.style.removeProperty('border-color');
      btn.style.removeProperty('color');
    });
    [pdf,excel,print].forEach(btn=>{
      btn.style.setProperty('width','auto','important');
      btn.style.setProperty('min-width','0','important');
      btn.style.setProperty('margin','0','important');
      btn.style.setProperty('white-space','nowrap','important');
    });
  }

  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;place();});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();

  const page=document.getElementById('recordsPage');
  if(page) new MutationObserver(schedule).observe(page,{childList:true,subtree:true});
  else new MutationObserver(()=>{
    const p=document.getElementById('recordsPage');
    if(p){ schedule(); new MutationObserver(schedule).observe(p,{childList:true,subtree:true}); }
  }).observe(document.documentElement,{childList:true,subtree:true});
})();

(function(){
  'use strict';

  const CEMENT_TABLE='cimento_sevkiyatlar';
  let trackingEditId=null;
  let saveBound=false;

  const $=id=>document.getElementById(id);
  const db=()=>typeof window.ensureDb==='function'?window.ensureDb():null;
  const label=value=>typeof window.BetonexaNames?.label==='function'?window.BetonexaNames.label(value):String(value||'').trim();

  function setStatus(message,isError=false){
    const el=$('cementStatus');
    if(!el)return;
    el.textContent=message||'';
    el.style.color=isError?'var(--danger)':'var(--success)';
  }

  function parseTonnage(value){
    const raw=String(value??'').trim();
    if(!raw||raw==='-'||raw==='0'||raw==='0,00'||raw==='0.00')return null;
    const n=Number(raw.replace(/\./g,'').replace(',','.'));
    return Number.isFinite(n)&&n>0?n:NaN;
  }

  function clearTrackingEdit(){
    trackingEditId=null;
    window.__cementPendingEditId=null;
  }

  function bindSaveBridge(){
    const save=$('cementSaveBtn');
    if(!save||saveBound)return;
    saveBound=true;

    save.addEventListener('click',async event=>{
      if(!trackingEditId)return;
      event.preventDefault();
      event.stopImmediatePropagation();

      const tarih=$('cementDate')?.value||'';
      const firma=label($('cementCompany')?.value||'');
      const teslimYeri=label($('cementDelivery')?.value||'');
      const arac=Number($('cementVehicleCount')?.value);
      const tonaj=parseTonnage($('cementTonnage')?.value);

      if(!tarih||!firma||!teslimYeri||!Number.isInteger(arac)||arac<1||Number.isNaN(tonaj)){
        setStatus('Tarih, firma, teslim yeri, araç sayısı ve tonaj bilgisini kontrol et.',true);
        return;
      }

      const client=db();
      if(!client){setStatus('Veritabanı bağlantısı yüklenemedi.',true);return;}

      save.disabled=true;
      setStatus('Güncelleniyor…');
      const id=trackingEditId;
      const {error}=await client.from(CEMENT_TABLE).update({
        tarih,
        firma,
        teslim_yeri:teslimYeri,
        arac_sayisi:arac,
        toplam_tonaj:tonaj
      }).eq('id',id);
      save.disabled=false;

      if(error){setStatus('Çimento sevkiyatı güncellenemedi: '+error.message,true);return;}

      clearTrackingEdit();
      if($('cementSaveBtn'))$('cementSaveBtn').textContent='Sevkiyatı Kaydet';
      $('cementCancelBtn')?.classList.add('hidden');
      if($('cementDate'))$('cementDate').value='';
      ['cementCompany','cementDelivery','cementVehicleCount','cementTonnage'].forEach(key=>{if($(key))$(key).value='';});
      setStatus('Çimento sevkiyatı güncellendi.');

      try{if(typeof window.loadCementShipments==='function')await window.loadCementShipments();}catch(e){}
      try{if(typeof window.refreshRecordsCombined==='function')await window.refreshRecordsCombined();}catch(e){}
    },true);

    $('cementCancelBtn')?.addEventListener('click',()=>clearTrackingEdit(),true);
  }

  function fillEditForm(record){
    bindSaveBridge();
    trackingEditId=String(record.id);
    window.__cementPendingEditId=String(record.id);

    if($('cementDate'))$('cementDate').value=record.tarih||'';
    if($('cementCompany'))$('cementCompany').value=record.firma||'';
    if($('cementDelivery'))$('cementDelivery').value=record.teslim_yeri||'';
    if($('cementVehicleCount'))$('cementVehicleCount').value=record.arac_sayisi??'';
    if($('cementTonnage'))$('cementTonnage').value=record.toplam_tonaj==null?'-':record.toplam_tonaj;
    if($('cementSaveBtn'))$('cementSaveBtn').textContent='Değişiklikleri Kaydet';
    $('cementCancelBtn')?.classList.remove('hidden');
    const heading=document.querySelector('#cementPage .cement-head h2');
    if(heading)heading.textContent='Çimento Sevkiyatını Düzenle';
    setStatus('Seçilen çimento sevkiyatı düzenleniyor.');
    window.scrollTo({top:0,behavior:'auto'});
  }

  function showCementPageWithoutClick(){
    const page=$('cementPage');
    const cementBtn=document.querySelector('.tabs [data-page="cement"]')||$('cementTabBtn');
    if(!page)return false;
    document.querySelectorAll('main.content > section.panel').forEach(section=>section.classList.add('hidden'));
    document.querySelectorAll('.tabs button').forEach(button=>button.classList.remove('active'));
    page.classList.remove('hidden');
    cementBtn?.classList.add('active');
    return true;
  }

  async function openTrackingCementEdit(id){
    const client=db();
    if(!client){alert('Veritabanı bağlantısı yüklenemedi.');return;}

    const {data,error}=await client.from(CEMENT_TABLE).select('*').eq('id',id).single();
    if(error||!data){alert('Çimento sevkiyatı bulunamadı'+(error?.message?': '+error.message:'.'));return;}

    if(!showCementPageWithoutClick()){
      alert('Çimento düzenleme formu açılamadı.');
      return;
    }

    requestAnimationFrame(()=>{
      fillEditForm(data);
      setTimeout(()=>fillEditForm(data),80);
    });
  }

  document.addEventListener('click',event=>{
    const btn=event.target.closest?.('#recordsCombinedView .rc-edit');
    if(!btn)return;
    const code=btn.getAttribute('onclick')||'';
    const match=code.match(/editCementFromCombined\(['"]?([^'")]+)['"]?\)/);
    if(!match)return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openTrackingCementEdit(match[1]);
  },true);

  window.editCementFromCombined=openTrackingCementEdit;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindSaveBridge,{once:true});
  else bindSaveBridge();
})();
