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
