(function(){
  'use strict';

  function applyEntryUi(){
    const concreteTitle=document.querySelector('#recordsPage .dashboard-head h2');
    const cementTitle=document.querySelector('#cementPage .cement-head h2');
    const cementDesc=document.querySelector('#cementPage .cement-head p');
    const refresh=document.getElementById('refreshBtn');

    if(concreteTitle) concreteTitle.textContent='Yeni Sevkiyat Ekle - Beton';
    if(cementTitle) cementTitle.textContent='Yeni Sevkiyat Ekle - Çimento';
    if(cementDesc) cementDesc.textContent='Sevkiyat bilgilerini doldurarak kaydedebilirsin.';
    if(refresh) refresh.style.display='none';

    [concreteTitle,cementTitle].forEach(el=>{
      if(!el)return;
      el.style.fontFamily='Arial, Helvetica, sans-serif';
      el.style.fontSize='25px';
      el.style.fontWeight='700';
      el.style.lineHeight='1.2';
      el.style.color='#4f3271';
      el.style.margin='0';
    });
  }

  function cleanCementEntryOnly(){
    const page=document.getElementById('cementPage');
    if(!page)return;

    // Çimento ekranı yalnızca yeni sevkiyat kaydı içindir.
    page.querySelectorAll('.cement-summary,.cement-table-wrap,.cement-export-actions,.cement-export-controls,.cement-period-controls,.cement-controls,[id*="cementExport"],[id*="cementPeriod"],#cementRefreshBtn').forEach(el=>{
      el.style.display='none';
    });

    const range=page.querySelector('#cementRange');
    if(range){
      const host=range.closest('.field,.cement-field,div');
      if(host)host.remove();
      else range.remove();
    }

    [...page.querySelectorAll('label,small,span,div')].forEach(el=>{
      if((el.textContent||'').trim()==='Dönem'){
        const host=el.closest('.field,.cement-field');
        if(host)host.remove();
        else el.remove();
      }
    });
  }

  function prepareConcreteAndTracking(){
    const recordsPage=document.getElementById('recordsPage');
    if(!recordsPage)return null;

    const report=recordsPage.querySelector('.records-report');
    if(!report)return null;

    let entryWrap=document.getElementById('concreteEntryWrap');
    if(!entryWrap){
      entryWrap=document.createElement('div');
      entryWrap.id='concreteEntryWrap';

      // Sevkiyat Takibi başlamadan önceki tüm içerik beton kayıt ekranına aittir.
      const nodes=[];
      for(const child of [...recordsPage.children]){
        if(child===report)break;
        nodes.push(child);
      }
      nodes.forEach(node=>entryWrap.appendChild(node));
      recordsPage.insertBefore(entryWrap,report);
    }

    applyEntryUi();
    return {recordsPage,report,entryWrap};
  }

  function showConcreteMode(concrete){
    const parts=prepareConcreteAndTracking();
    if(!parts)return;

    document.querySelectorAll('main.content > section.panel').forEach(s=>s.classList.add('hidden'));
    document.querySelectorAll('.tabs button').forEach(b=>b.classList.remove('active'));

    parts.recordsPage.classList.remove('hidden');
    parts.entryWrap.style.display='';
    parts.report.style.display='none';
    concrete.classList.add('active');
    applyEntryUi();
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function showTrackingMode(records){
    const parts=prepareConcreteAndTracking();
    if(!parts)return;

    parts.recordsPage.classList.remove('hidden');
    parts.entryWrap.style.display='none';
    parts.report.style.display='';

    document.querySelectorAll('.tabs button').forEach(b=>b.classList.remove('active'));
    records.classList.add('active');

    if(typeof window.refreshRecordsCombined==='function'){
      try{window.refreshRecordsCombined();}catch(e){}
    }else if(typeof window.loadRecords==='function'){
      try{window.loadRecords();}catch(e){}
    }
  }

  function applyMenuLayout(){
    const nav=document.querySelector('.tabs');
    if(!nav)return false;

    const records=nav.querySelector('[data-page="records"]');
    const cement=nav.querySelector('[data-page="cement"]');
    const tomorrow=nav.querySelector('[data-page="tomorrow"]');
    const calendar=nav.querySelector('[data-page="calendar"]');
    if(!records||!cement||!tomorrow)return false;

    records.innerHTML='📋 Sevkiyat Takibi';

    let concrete=nav.querySelector('[data-page="concrete"]');
    if(!concrete){
      concrete=document.createElement('button');
      concrete.type='button';
      concrete.className='btn btn-light';
      concrete.dataset.page='concrete';
      concrete.innerHTML='🚚 Beton';
    }

    if(!concrete.dataset.modeBound){
      concrete.dataset.modeBound='1';
      concrete.addEventListener('click',function(e){
        e.preventDefault();
        e.stopPropagation();
        showConcreteMode(concrete);
      });
    }

    if(!records.dataset.modeBound){
      records.dataset.modeBound='1';
      records.addEventListener('click',()=>setTimeout(()=>showTrackingMode(records),0));
    }

    nav.insertBefore(concrete,nav.firstElementChild);
    nav.insertBefore(cement,concrete.nextSibling);
    nav.insertBefore(records,cement.nextSibling);
    nav.insertBefore(tomorrow,records.nextSibling);

    if(calendar){
      calendar.innerHTML='📅 Takvim';
      nav.insertBefore(calendar,tomorrow.nextSibling);
    }else{
      [...nav.querySelectorAll('button')].forEach(btn=>{
        if(/Haftalık\s+Takvim/i.test(btn.textContent||''))btn.innerHTML='📅 Takvim';
      });
    }

    if(!cement.dataset.entryOnlyBound){
      cement.dataset.entryOnlyBound='1';
      cement.addEventListener('click',()=>setTimeout(()=>{cleanCementEntryOnly();applyEntryUi();},30));
    }

    prepareConcreteAndTracking();
    cleanCementEntryOnly();
    applyEntryUi();

    // Sayfa ilk açıldığında hangi sekme aktifse doğru görünümü uygula.
    if(records.classList.contains('active'))showTrackingMode(records);
    else if(concrete.classList.contains('active'))showConcreteMode(concrete);

    return true;
  }

  function init(){
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(applyMenuLayout()||tries>100)clearInterval(timer);
    },50);

    // Yalnızca eski çimento liste elemanları sonradan oluşursa onları gizle.
    // Başlıkları observer içinde değiştirmiyoruz; giriş akışına müdahale etmez.
    const observer=new MutationObserver(()=>cleanCementEntryOnly());
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
