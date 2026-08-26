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
  const db=()=>typeof window.ensureDb==='function'?window.ensureDb():null;
  const label=v=>typeof window.BetonexaNames?.label==='function'?window.BetonexaNames.label(v):String(v||'').trim();
  let editId=null;
  let saveButton=null;

  function setStatus(msg,bad=false){const el=$('cementStatus');if(!el)return;el.textContent=msg||'';el.style.color=bad?'var(--danger)':'var(--success)';}
  function parseTon(v){const raw=String(v??'').trim();if(!raw||raw==='-'||raw==='0'||raw==='0,00'||raw==='0.00')return null;const n=Number(raw.replace(/\./g,'').replace(',','.'));return Number.isFinite(n)&&n>0?n:NaN;}
  function showPage(){const page=$('cementPage');if(!page)return false;document.querySelectorAll('main.content > section.panel').forEach(s=>s.classList.add('hidden'));document.querySelectorAll('.tabs button').forEach(b=>b.classList.remove('active'));page.classList.remove('hidden');(document.querySelector('.tabs [data-page="cement"]')||$('cementTabBtn'))?.classList.add('active');return true;}
  function fill(r){editId=String(r.id);window.__cementPendingEditId=editId;if($('cementDate'))$('cementDate').value=r.tarih||'';if($('cementCompany'))$('cementCompany').value=r.firma||'';if($('cementDelivery'))$('cementDelivery').value=r.teslim_yeri||'';if($('cementVehicleCount'))$('cementVehicleCount').value=r.arac_sayisi??'';if($('cementTonnage'))$('cementTonnage').value=r.toplam_tonaj==null?'-':r.toplam_tonaj;if($('cementSaveBtn'))$('cementSaveBtn').textContent='Değişiklikleri Kaydet';$('cementCancelBtn')?.classList.remove('hidden');const h=document.querySelector('#cementPage .cement-head h2');if(h)h.textContent='Çimento Sevkiyatını Düzenle';setStatus('Seçilen çimento sevkiyatı düzenleniyor.');window.scrollTo({top:0,behavior:'auto'});}
  async function openEdit(id){const client=db();if(!client){alert('Veritabanı bağlantısı yüklenemedi.');return;}const {data,error}=await client.from(TABLE).select('*').eq('id',id).single();if(error||!data){alert('Çimento sevkiyatı bulunamadı'+(error?.message?': '+error.message:'.'));return;}if(!showPage()){alert('Çimento düzenleme formu açılamadı.');return;}fill(data);requestAnimationFrame(()=>fill(data));setTimeout(()=>fill(data),80);setTimeout(()=>fill(data),220);}
  function rowEditId(btn){const block=btn.closest('.rc-block');if(!block||!/Çimento/i.test(block.querySelector('h3')?.textContent||''))return null;const code=btn.getAttribute('onclick')||'';let m=code.match(/editCementFromCombined\(['"]?([^'")]+)['"]?\)/);if(m)return m[1];m=code.match(/\(['"]([^'"]+)['"]\)/);return m?m[1]:null;}
  function intercept(event){const btn=event.target.closest?.('#recordsCombinedView .rc-edit');if(!btn)return;const id=rowEditId(btn);if(!id)return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();openEdit(id);}
  document.addEventListener('pointerdown',intercept,true);
  document.addEventListener('click',intercept,true);

  function keepRouter(){
    if(window.editCementFromCombined!==openEdit)window.editCementFromCombined=openEdit;
    if(window.editCementShipment!==openEdit)window.editCementShipment=openEdit;
  }
  keepRouter();setInterval(keepRouter,25);

  function bindSave(){const save=$('cementSaveBtn');if(!save||save===saveButton)return;saveButton=save;save.addEventListener('click',async e=>{if(!editId)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();const tarih=$('cementDate')?.value||'',firma=label($('cementCompany')?.value||''),yer=label($('cementDelivery')?.value||''),arac=Number($('cementVehicleCount')?.value),ton=parseTon($('cementTonnage')?.value);if(!tarih||!firma||!yer||!Number.isInteger(arac)||arac<1||Number.isNaN(ton)){setStatus('Tarih, firma, teslim yeri, araç sayısı ve tonaj bilgisini kontrol et.',true);return;}const client=db();if(!client){setStatus('Veritabanı bağlantısı yüklenemedi.',true);return;}save.disabled=true;setStatus('Güncelleniyor…');const currentId=editId;const {error}=await client.from(TABLE).update({tarih,firma,teslim_yeri:yer,arac_sayisi:arac,toplam_tonaj:ton}).eq('id',currentId);save.disabled=false;if(error){setStatus('Çimento sevkiyatı güncellenemedi: '+error.message,true);return;}editId=null;window.__cementPendingEditId=null;save.textContent='Sevkiyatı Kaydet';$('cementCancelBtn')?.classList.add('hidden');setStatus('Çimento sevkiyatı güncellendi.');try{if(typeof window.loadCementShipments==='function')await window.loadCementShipments();}catch(_){}try{if(typeof window.refreshRecordsCombined==='function')await window.refreshRecordsCombined();}catch(_){}} ,true);$('cementCancelBtn')?.addEventListener('click',()=>{editId=null;window.__cementPendingEditId=null;},true);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindSave,{once:true});else bindSave();
  new MutationObserver(()=>{bindSave();keepRouter();}).observe(document.documentElement,{childList:true,subtree:true});
})();