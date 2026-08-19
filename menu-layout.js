(function(){
  'use strict';

  function disableBrowserLoginSuggestions(){
    const user=document.getElementById('loginUser');
    const pass=document.getElementById('loginPass');
    if(user){
      user.setAttribute('autocomplete','off');
      user.setAttribute('autocapitalize','none');
      user.setAttribute('autocorrect','off');
      user.setAttribute('spellcheck','false');
      user.setAttribute('inputmode','email');
      user.setAttribute('name','betonexa_account_entry');
      if(user.type==='email') user.type='text';
    }
    if(pass){
      pass.setAttribute('autocomplete','new-password');
      pass.setAttribute('name','betonexa_password_entry');
    }
  }

  function applyEntryUi(){
    const concreteTitle=document.querySelector('#recordsPage .dashboard-head h2');
    const cementTitle=document.querySelector('#cementPage .cement-head h2');
    const refresh=document.getElementById('refreshBtn');
    if(concreteTitle) concreteTitle.textContent='Yeni Sevkiyat Ekle - Beton';
    if(cementTitle){
      cementTitle.textContent='Yeni Sevkiyat Ekle - Çimento';
      const head=cementTitle.closest('.cement-head') || cementTitle.parentElement;
      if(head){
        const desc=[...head.querySelectorAll('p,small,div,span')].find(el=>{
          const t=(el.textContent||'').trim();
          return t && el!==cementTitle && !el.contains(cementTitle);
        });
        if(desc) desc.textContent='Sevkiyat bilgilerini doldurarak kaydedebilirsin.';
      }
    }
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
    page.querySelectorAll('.cement-summary,.cement-table-wrap,.cement-export-actions,.cement-export-controls,.cement-period-controls,.cement-controls,[id*="cementExport"],[id*="cementPeriod"],#cementRefreshBtn').forEach(el=>el.style.display='none');
    const range=page.querySelector('#cementRange');
    if(range){const host=range.closest('.field,.cement-field,div'); if(host)host.remove(); else range.remove();}
    [...page.querySelectorAll('label,small,span,div')].forEach(el=>{
      if((el.textContent||'').trim()==='Dönem'){
        const host=el.closest('.field,.cement-field'); if(host)host.remove(); else el.remove();
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
      entryWrap=document.createElement('div'); entryWrap.id='concreteEntryWrap';
      const nodes=[];
      for(const child of [...recordsPage.children]){if(child===report)break; nodes.push(child);}
      nodes.forEach(node=>entryWrap.appendChild(node));
      recordsPage.insertBefore(entryWrap,report);
    }
    applyEntryUi();
    return {recordsPage,report,entryWrap};
  }

  function hideAllMainPages(){
    document.querySelectorAll('main.content > section.panel').forEach(s=>s.classList.add('hidden'));
  }

  function showConcreteMode(concrete){
    const parts=prepareConcreteAndTracking(); if(!parts)return;
    hideAllMainPages();
    document.querySelectorAll('.tabs button').forEach(b=>b.classList.remove('active'));
    parts.recordsPage.classList.remove('hidden');
    parts.entryWrap.style.display='';
    parts.report.style.display='none';
    concrete.classList.add('active');
    applyEntryUi();
    window.scrollTo({top:0,behavior:'auto'});
  }

  function showTrackingMode(records){
    const parts=prepareConcreteAndTracking(); if(!parts)return;
    // Önemli: Yarınki Sevkiyatlar gibi başka bir sayfadan gelirken
    // önce bütün ana sayfaları kapatıp recordsPage'i açıkça görünür yap.
    hideAllMainPages();
    document.querySelectorAll('.tabs button').forEach(b=>b.classList.remove('active'));
    parts.recordsPage.classList.remove('hidden');
    parts.entryWrap.style.display='none';
    parts.report.style.display='';
    records.classList.add('active');
    window.scrollTo({top:0,behavior:'auto'});
  }

  function applyMenuLayout(){
    disableBrowserLoginSuggestions();
    const nav=document.querySelector('.tabs'); if(!nav)return false;
    const records=nav.querySelector('[data-page="records"]');
    const cement=nav.querySelector('[data-page="cement"]');
    const tomorrow=nav.querySelector('[data-page="tomorrow"]');
    const calendar=nav.querySelector('[data-page="calendar"]');
    if(!records||!cement||!tomorrow)return false;
    records.innerHTML='📋 Sevkiyat Takibi';
    let concrete=nav.querySelector('[data-page="concrete"]');
    if(!concrete){
      concrete=document.createElement('button'); concrete.type='button'; concrete.className='btn btn-light'; concrete.dataset.page='concrete'; concrete.innerHTML='🚚 Beton';
    }
    if(!concrete.dataset.modeBound){
      concrete.dataset.modeBound='1';
      concrete.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();showConcreteMode(concrete);});
    }
    if(!records.dataset.modeBound){
      records.dataset.modeBound='1';
      records.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();showTrackingMode(records);},true);
    }
    nav.insertBefore(concrete,nav.firstElementChild);
    nav.insertBefore(cement,concrete.nextSibling);
    nav.insertBefore(records,cement.nextSibling);
    nav.insertBefore(tomorrow,records.nextSibling);
    if(calendar){calendar.innerHTML='📅 Takvim';nav.insertBefore(calendar,tomorrow.nextSibling);}
    else [...nav.querySelectorAll('button')].forEach(btn=>{if(/Haftalık\s+Takvim/i.test(btn.textContent||''))btn.innerHTML='📅 Takvim';});
    if(!cement.dataset.entryOnlyBound){
      cement.dataset.entryOnlyBound='1'; cement.addEventListener('click',()=>setTimeout(()=>{cleanCementEntryOnly();applyEntryUi();},30));
    }
    const parts=prepareConcreteAndTracking(); cleanCementEntryOnly(); applyEntryUi();
    if(parts){
      if(records.classList.contains('active')){parts.entryWrap.style.display='none';parts.report.style.display='';}
      else if(concrete.classList.contains('active')){parts.entryWrap.style.display='';parts.report.style.display='none';}
    }
    return true;
  }

  function init(){
    disableBrowserLoginSuggestions();
    if(applyMenuLayout()){
      const observer=new MutationObserver(()=>cleanCementEntryOnly()); observer.observe(document.documentElement,{childList:true,subtree:true}); return;
    }
    let tries=0;
    const timer=setInterval(()=>{tries++;if(applyMenuLayout()||tries>100)clearInterval(timer);},50);
    const observer=new MutationObserver(()=>cleanCementEntryOnly()); observer.observe(document.documentElement,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
