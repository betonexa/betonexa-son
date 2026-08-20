(function(){
  'use strict';

  let contactFixTimer=null;

  function installTomorrowPendingTonnagePdfFix(){
    if(window.__tomorrowPendingTonnagePdfFix)return;
    window.__tomorrowPendingTonnagePdfFix=true;

    const replacePending=v=>{
      if(typeof v==='string')return v.replace(/0([,.]00)?\s*ton/gi,'Tonaj bilgisi bekleniyor');
      if(Array.isArray(v))return v.map(replacePending);
      return v;
    };

    const patchInstance=doc=>{
      if(!doc||doc.__pendingTonnageInstancePatched)return doc;
      if(typeof doc.text==='function'){
        const originalText=doc.text.bind(doc);
        doc.text=function(){
          const args=[...arguments];
          if(window.__tomorrowPdfPendingTonnageMode)args[0]=replacePending(args[0]);
          return originalText(...args);
        };
      }
      if(typeof doc.autoTable==='function'){
        const originalTable=doc.autoTable.bind(doc);
        doc.autoTable=function(options){
          if(window.__tomorrowPdfPendingTonnageMode&&options){
            options={...options};
            if(options.head)options.head=replacePending(options.head);
            if(options.body)options.body=replacePending(options.body);
          }
          return originalTable(options);
        };
      }
      doc.__pendingTonnageInstancePatched=true;
      return doc;
    };

    const patch=()=>{
      const J=window.jspdf?.jsPDF;
      if(!J)return false;
      const API=J.API;
      if(API&&typeof API.text==='function'&&!API.__pendingTonnageTextPatched){
        const original=API.text;
        API.text=function(){
          const args=[...arguments];
          if(window.__tomorrowPdfPendingTonnageMode)args[0]=replacePending(args[0]);
          return original.apply(this,args);
        };
        API.__pendingTonnageTextPatched=true;
      }
      if(API&&typeof API.autoTable==='function'&&!API.__pendingTonnageTablePatched){
        const original=API.autoTable;
        API.autoTable=function(options){
          if(window.__tomorrowPdfPendingTonnageMode&&options){
            options={...options};
            if(options.head)options.head=replacePending(options.head);
            if(options.body)options.body=replacePending(options.body);
          }
          return original.call(this,options);
        };
        API.__pendingTonnageTablePatched=true;
      }
      if(!J.__pendingTonnageCtorPatched){
        const Original=J;
        const Wrapped=function(){return patchInstance(new Original(...arguments));};
        Object.setPrototypeOf(Wrapped,Original);
        Wrapped.prototype=Original.prototype;
        Object.keys(Original).forEach(k=>{try{Wrapped[k]=Original[k]}catch(e){}});
        Wrapped.API=Original.API;
        Wrapped.__pendingTonnageCtorPatched=true;
        window.jspdf.jsPDF=Wrapped;
      }
      return true;
    };

    patch();
    let tries=0;
    const timer=setInterval(()=>{tries++;if(patch()||tries>50)clearInterval(timer);},100);

    document.addEventListener('click',e=>{
      if(!e.target.closest?.('#tomorrowPdfBtn'))return;
      patch();
      window.__tomorrowPdfPendingTonnageMode=true;
      clearTimeout(window.__tomorrowPdfPendingTonnageTimer);
      window.__tomorrowPdfPendingTonnageTimer=setTimeout(()=>{window.__tomorrowPdfPendingTonnageMode=false;},5000);
    },true);
  }

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

  function styleTrackingExportActions(){
    const report=document.querySelector('#recordsPage .records-report');
    const pdf=document.getElementById('pdfBtn');
    const excel=document.getElementById('excelBtn');
    const print=document.getElementById('printBtn');
    if(!report||!pdf||!excel||!print)return;

    const clear=[...report.querySelectorAll('button')].find(b=>(b.textContent||'').trim()==='Filtreleri Temizle');
    if(!clear)return;

    let card=clear.parentElement;
    while(card&&card!==report){
      const labels=[...card.querySelectorAll('button')].map(b=>(b.textContent||'').trim());
      if(labels.includes('Bugün')&&labels.includes('Yarın')&&labels.includes('Bu Hafta')&&labels.includes('Bu Ay')&&labels.includes('Tümü'))break;
      card=card.parentElement;
    }
    if(!card||card===report)return;

    const leaves=[...card.querySelectorAll('div,span,strong')].filter(el=>el.children.length===0);
    const beton=leaves.find(el=>/\d+\s*beton\b/i.test((el.textContent||'').replace(/\s+/g,' ').trim()));
    const cimento=leaves.find(el=>/\d+\s*çimento\b/i.test((el.textContent||'').replace(/\s+/g,' ').trim()));

    let host=null;
    if(beton&&cimento){
      if(beton.parentElement===cimento.parentElement) host=beton.parentElement;
      else{
        let n=beton.parentElement;
        while(n&&n!==card){
          if(n.contains(cimento)){host=n;break;}
          n=n.parentElement;
        }
      }
    }

    if(!host){
      host=card.querySelector('.tracking-export-slot');
      if(!host){
        host=document.createElement('div');
        host.className='tracking-export-slot';
        card.insertBefore(host,card.firstChild);
      }
    }

    if(beton){
      const bwrap=beton.parentElement!==host&&beton.parentElement?.children.length===1?beton.parentElement:beton;
      if(bwrap!==host)bwrap.remove(); else beton.remove();
    }
    if(cimento&&cimento.isConnected){
      const cwrap=cimento.parentElement!==host&&cimento.parentElement?.children.length===1?cimento.parentElement:cimento;
      if(cwrap!==host)cwrap.remove(); else cimento.remove();
    }

    report.querySelectorAll('.tracking-export-actions,.tracking-final-actions').forEach(el=>{
      if(el!==host)el.style.setProperty('display','none','important');
    });

    host.className='tomorrow-actions tracking-export-slot';
    [pdf,excel,print].forEach(btn=>{if(btn.parentElement!==host)host.appendChild(btn);});

    host.style.setProperty('display','flex','important');
    host.style.setProperty('align-items','center','important');
    host.style.setProperty('justify-content','flex-end','important');
    host.style.setProperty('gap','8px','important');
    host.style.setProperty('flex-wrap','nowrap','important');
    host.style.setProperty('width','auto','important');
    host.style.setProperty('margin','0','important');
    host.style.setProperty('padding','0','important');
    host.style.setProperty('position','static','important');
    host.style.setProperty('background','transparent','important');
    host.style.setProperty('border','0','important');

    report.style.removeProperty('padding-top');
    report.style.removeProperty('position');

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

  async function restoreConcreteContactColumns(){
    const table=document.querySelector('#recordsCombinedView .rc-block .rc-table table');
    if(!table)return;

    const headRow=table.querySelector('thead tr');
    const bodyRows=[...table.querySelectorAll('tbody tr')];
    if(!headRow||!bodyRows.length)return;

    let headers=[...headRow.children].map(th=>(th.textContent||'').trim());
    const removeDuplicateHeader=(label)=>{
      const indexes=headers.map((h,i)=>h===label?i:-1).filter(i=>i>=0);
      for(let k=indexes.length-1;k>=1;k--){
        const idx=indexes[k];
        headRow.children[idx]?.remove();
        bodyRows.forEach(row=>row.children[idx]?.remove());
        headers=[...headRow.children].map(th=>(th.textContent||'').trim());
      }
    };
    removeDuplicateHeader('Telefon');
    removeDuplicateHeader('Sorumlu');

    headers=[...headRow.children].map(th=>(th.textContent||'').trim());
    if(headers.includes('Sorumlu')&&headers.includes('Telefon'))return;
    if(typeof window.ensureDb!=='function')return;

    const ids=bodyRows.map(row=>{
      const btn=row.querySelector('.rc-edit');
      const src=btn?.getAttribute('onclick')||'';
      const m=src.match(/editConcreteFromCombined\(['"]?([^'")]+)['"]?\)/);
      return m?m[1]:null;
    }).filter(Boolean);
    if(!ids.length)return;

    try{
      const db=window.ensureDb();
      const {data,error}=await db.from('sevkiyatlar').select('id,sorumlu_kisi,telefon').in('id',ids);
      if(error||!Array.isArray(data))return;
      const map=new Map(data.map(r=>[String(r.id),r]));
      const actionHead=headRow.lastElementChild;

      if(!headers.includes('Sorumlu')){
        const th=document.createElement('th');
        th.textContent='Sorumlu';
        headRow.insertBefore(th,actionHead);
      }
      if(!headers.includes('Telefon')){
        const th=document.createElement('th');
        th.textContent='Telefon';
        headRow.insertBefore(th,actionHead);
      }

      bodyRows.forEach(row=>{
        const btn=row.querySelector('.rc-edit');
        const src=btn?.getAttribute('onclick')||'';
        const m=src.match(/editConcreteFromCombined\(['"]?([^'")]+)['"]?\)/);
        const rec=m?map.get(String(m[1])):null;
        const actionCell=row.lastElementChild;
        const currentHeaders=[...headRow.children].map(th=>(th.textContent||'').trim());
        const responsibleIndex=currentHeaders.indexOf('Sorumlu');
        const phoneIndex=currentHeaders.indexOf('Telefon');
        while(row.children.length<headRow.children.length){
          row.insertBefore(document.createElement('td'),actionCell);
        }
        if(responsibleIndex>=0)row.children[responsibleIndex].textContent=rec?.sorumlu_kisi||'';
        if(phoneIndex>=0)row.children[phoneIndex].textContent=rec?.telefon||'';
      });

      table.style.minWidth='1120px';
    }catch(e){}
  }

  function scheduleConcreteContactFix(){
    clearTimeout(contactFixTimer);
    contactFixTimer=setTimeout(()=>restoreConcreteContactColumns(),80);
  }

  const concreteEditRouter=async function(id){
    const concreteBtn=document.querySelector('.tabs [data-page="concrete"]');
    if(concreteBtn)concreteBtn.click();

    try{
      if(typeof window.loadRecords==='function')await window.loadRecords();
    }catch(e){}

    setTimeout(()=>{
      if(typeof window.editRecord==='function'){
        window.editRecord(id);
        window.scrollTo({top:0,behavior:'auto'});
      }
    },80);
  };

  const cementEditRouter=async function(id){
    const cementBtn=document.querySelector('.tabs [data-page="cement"]')||document.getElementById('cementTabBtn');
    if(cementBtn)cementBtn.click();

    try{
      if(typeof window.loadCementShipments==='function')await window.loadCementShipments();
    }catch(e){}

    setTimeout(()=>{
      if(typeof window.editCementShipment==='function'){
        window.editCementShipment(String(id));
        window.scrollTo({top:0,behavior:'auto'});
      }
    },100);
  };

  function enforceCombinedEditRouting(){
    if(window.editConcreteFromCombined!==concreteEditRouter)window.editConcreteFromCombined=concreteEditRouter;
    if(window.editCementFromCombined!==cementEditRouter)window.editCementFromCombined=cementEditRouter;
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
    styleTrackingExportActions();
    scheduleConcreteContactFix();
    enforceCombinedEditRouting();
    return {recordsPage,report,entryWrap};
  }

  function hideAllMainPages(){document.querySelectorAll('main.content > section.panel').forEach(s=>s.classList.add('hidden'));}

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
    hideAllMainPages();
    document.querySelectorAll('.tabs button').forEach(b=>b.classList.remove('active'));
    parts.recordsPage.classList.remove('hidden');
    parts.entryWrap.style.display='none';
    parts.report.style.display='';
    records.classList.add('active');
    styleTrackingExportActions();
    scheduleConcreteContactFix();
    enforceCombinedEditRouting();
    window.scrollTo({top:0,behavior:'auto'});
  }

  function applyMenuLayout(){
    disableBrowserLoginSuggestions();
    enforceCombinedEditRouting();
    const nav=document.querySelector('.tabs'); if(!nav)return false;
    const records=nav.querySelector('[data-page="records"]');
    const cement=nav.querySelector('[data-page="cement"]');
    const tomorrow=nav.querySelector('[data-page="tomorrow"]');
    const calendar=nav.querySelector('[data-page="calendar"]');
    if(!records||!cement||!tomorrow)return false;
    records.innerHTML='📋 Sevkiyat Takibi';
    let concrete=nav.querySelector('[data-page="concrete"]');
    if(!concrete){concrete=document.createElement('button');concrete.type='button';concrete.className='btn btn-light';concrete.dataset.page='concrete';concrete.innerHTML='🚚 Beton';}
    if(!concrete.dataset.modeBound){concrete.dataset.modeBound='1';concrete.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();showConcreteMode(concrete);});}
    if(!records.dataset.modeBound){records.dataset.modeBound='1';records.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();showTrackingMode(records);},true);}
    nav.insertBefore(concrete,nav.firstElementChild);
    nav.insertBefore(cement,concrete.nextSibling);
    nav.insertBefore(records,cement.nextSibling);
    nav.insertBefore(tomorrow,records.nextSibling);
    if(calendar){calendar.innerHTML='📅 Takvim';nav.insertBefore(calendar,tomorrow.nextSibling);}
    else [...nav.querySelectorAll('button')].forEach(btn=>{if(/Haftalık\s+Takvim/i.test(btn.textContent||''))btn.innerHTML='📅 Takvim';});
    if(!cement.dataset.entryOnlyBound){cement.dataset.entryOnlyBound='1';cement.addEventListener('click',()=>setTimeout(()=>{cleanCementEntryOnly();applyEntryUi();},30));}
    const parts=prepareConcreteAndTracking(); cleanCementEntryOnly(); applyEntryUi(); styleTrackingExportActions(); scheduleConcreteContactFix(); enforceCombinedEditRouting();
    if(parts){
      if(records.classList.contains('active')){parts.entryWrap.style.display='none';parts.report.style.display='';}
      else if(concrete.classList.contains('active')){parts.entryWrap.style.display='';parts.report.style.display='none';}
    }
    return true;
  }

  function init(){
    installTomorrowPendingTonnagePdfFix();
    disableBrowserLoginSuggestions();
    enforceCombinedEditRouting();

    let routeTries=0;
    const routeTimer=setInterval(()=>{
      routeTries++;
      enforceCombinedEditRouting();
      if(routeTries>60)clearInterval(routeTimer);
    },100);

    if(applyMenuLayout()){
      const observer=new MutationObserver(()=>{cleanCementEntryOnly();styleTrackingExportActions();scheduleConcreteContactFix();enforceCombinedEditRouting();});
      observer.observe(document.documentElement,{childList:true,subtree:true});
      return;
    }
    let tries=0;
    const timer=setInterval(()=>{tries++;if(applyMenuLayout()||tries>100)clearInterval(timer);},50);
    const observer=new MutationObserver(()=>{cleanCementEntryOnly();styleTrackingExportActions();scheduleConcreteContactFix();enforceCombinedEditRouting();});
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
