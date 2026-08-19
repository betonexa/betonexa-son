(function(){
  'use strict';
  function applyMenuLayout(){
    const nav=document.querySelector('.tabs');
    if(!nav)return false;
    const records=nav.querySelector('[data-page="records"]');
    const cement=nav.querySelector('[data-page="cement"]');
    const tomorrow=nav.querySelector('[data-page="tomorrow"]');
    const calendar=nav.querySelector('[data-page="calendar"]');
    if(!records||!cement||!tomorrow)return false;

    // Mevcut Sevkiyatlar ekranı ortak filtreleme/takip ekranıdır.
    records.innerHTML='📋 Sevkiyat Takibi';

    // Beton ana operasyon butonu: mevcut yeni beton sevkiyat formuna gider.
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
        // Eski sürümlerde beton giriş formu Sevkiyatlar sayfasının üstündedir.
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
    return true;
  }
  function init(){let tries=0;const timer=setInterval(()=>{tries++;if(applyMenuLayout()||tries>100)clearInterval(timer)},50)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
