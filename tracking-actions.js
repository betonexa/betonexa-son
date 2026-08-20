(function(){
  'use strict';
  if(window.__betonexaTrackingActionsStable)return;
  window.__betonexaTrackingActionsStable=true;

  const txt=el=>String(el?.textContent||'').replace(/\s+/g,' ').trim();

  function findCard(report){
    const clear=[...report.querySelectorAll('button')].find(b=>txt(b)==='Filtreleri Temizle');
    if(!clear)return null;
    let n=clear.parentElement;
    while(n&&n!==report){
      const labels=[...n.querySelectorAll('button')].map(txt);
      if(labels.includes('Bugün')&&labels.includes('Yarın')&&labels.includes('Bu Hafta')&&labels.includes('Bu Ay')&&labels.includes('Tümü')) return n;
      n=n.parentElement;
    }
    return null;
  }

  function findSummaryHost(card){
    const nodes=[...card.querySelectorAll('div,span,strong')];
    const beton=nodes.find(el=>/\d+\s*beton\b/i.test(txt(el)) && ![...el.children].some(ch=>/\d+\s*beton\b/i.test(txt(ch))));
    const cimento=nodes.find(el=>/\d+\s*çimento\b/i.test(txt(el)) && ![...el.children].some(ch=>/\d+\s*çimento\b/i.test(txt(ch))));
    if(!beton||!cimento)return null;
    let p=beton.parentElement;
    while(p&&p!==card){
      if(p.contains(cimento))return p;
      p=p.parentElement;
    }
    return null;
  }

  function apply(){
    const report=document.querySelector('#recordsPage .records-report');
    if(!report)return false;
    const card=findCard(report);
    if(!card)return false;

    const pdf=document.getElementById('pdfBtn');
    const excel=document.getElementById('excelBtn');
    const print=document.getElementById('printBtn');
    if(!pdf||!excel||!print)return false;

    const host=findSummaryHost(card);
    if(!host)return false;

    // Use the summary chips' own layout slot: remove chips, place buttons there.
    host.innerHTML='';
    host.className='tomorrow-actions tracking-actions-stable';
    [pdf,excel,print].forEach(btn=>host.appendChild(btn));

    host.style.display='flex';
    host.style.alignItems='center';
    host.style.justifyContent='flex-end';
    host.style.gap='8px';
    host.style.flexWrap='nowrap';
    host.style.width='auto';
    host.style.margin='0';
    host.style.padding='0';
    host.style.background='transparent';
    host.style.border='0';
    host.style.position='static';

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

    // Hide the now-empty former button row only if it truly contains nothing useful.
    [...report.querySelectorAll('.export-bar')].forEach(bar=>{
      const hasControls=!!bar.querySelector('select,input,label');
      const hasButtons=!!bar.querySelector('button');
      if(!hasControls&&!hasButtons) bar.style.display='none';
    });

    return true;
  }

  function retry(){
    let tries=0;
    const tick=()=>{
      tries++;
      if(apply()||tries>=30)return;
      setTimeout(tick,100);
    };
    tick();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',retry,{once:true});
  else retry();

  document.addEventListener('click',e=>{
    if(e.target.closest?.('[data-page="records"]')) setTimeout(retry,80);
  },true);
})();
