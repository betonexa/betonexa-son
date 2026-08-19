(function(){
  'use strict';

  function cleanCementEntryOnly(){
    const page=document.getElementById('cementPage');
    if(!page)return;

    // Çimento ekranı yalnızca yeni sevkiyat kaydı için kullanılacak.
    page.querySelectorAll('.cement-summary,.cement-table-wrap,.cement-export-actions,.cement-export-controls,.cement-period-controls,.cement-controls,[id*="cementExport"],[id*="cementPeriod"],#cementRefreshBtn').forEach(el=>{
      el.style.display='none';
    });

    // Eski sürümden kalan Dönem / Tümü alanını tamamen kaldır.
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
      concrete.addEventListener('click',function(){
        document.querySelectorAll('main.content > section.panel').forEach(s=>s.classList.add('hidden'));
        document.querySelectorAll('.tabs button').forEach(b=>b.classList.remove('active'));
        const form=document.getElementById('newShipmentPage') || document.getElementById('formPage') || document.querySelector('main.content > section.panel:has(#shipmentForm)');
        if(form){form.classList.remove('hidden');concrete.classList.add('active');return;}
        records.click();
        setTimeout(()=>{
          const candidates=[document.getElementById('shipmentForm'),document.getElementById('newShipmentForm'),document.querySelector('#recordsPage form')].filter(Boolean);
          if(candidates[0])candidates[0].scrollIntoView({behavior:'smooth',block:'start'});
          document.querySelectorAll('.tabs button').forEach(b=>b.classList.remove('active'));
          concrete.classList.add('active');
        },30);
      });
    }

    nav.insertBefore(concrete,nav.firstElementChild);
    nav.insertBefore(cement,concrete.nextSibling);
    nav.insertBefore(records,cement.nextSibling);
    nav.insertBefore(tomorrow,records.nextSibling);

    if(calendar){
      calendar.innerHTML='📅 Takvim';
      nav.insertBefore(calendar,tomorrow.nextSibling);
    } else {
      [...nav.querySelectorAll('button')].forEach(btn=>{
        if(/Haftalık\s+Takvim/i.test(btn.textContent||''))btn.innerHTML='📅 Takvim';
      });
    }

    cement.addEventListener('click',()=>setTimeout(cleanCementEntryOnly,30));
    cleanCementEntryOnly();
    return true;
  }

  function init(){
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(applyMenuLayout()||tries>100)clearInterval(timer);
    },50);

    const observer=new MutationObserver(()=>cleanCementEntryOnly());
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
