(function(){
  'use strict';
  const CEMENT='cimento_sevkiyatlar', CONCRETE='sevkiyatlar';
  const $=id=>document.getElementById(id);
  const db=()=>typeof window.ensureDb==='function'?window.ensureDb():null;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const title=v=>String(v??'').trim().replace(/\s+/g,' ').toLocaleLowerCase('tr-TR').replace(/(^|[\s\-\/])([\p{L}])/gu,(m,a,b)=>a+b.toLocaleUpperCase('tr-TR'));
  const fmt=v=>Number(v||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
  const monday=d=>{const x=new Date(d),day=(x.getDay()+6)%7;x.setDate(x.getDate()-day);x.setHours(0,0,0,0);return x};
  const trDate=v=>{if(!v)return'';const d=new Date(v+'T00:00:00');return d.toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric'})};
  let concrete=[],cement=[];

  function styles(){
    if($('recordsCementAddonStyles'))return;
    const s=document.createElement('style');s.id='recordsCementAddonStyles';s.textContent=`
      #recordsCombinedView{margin:18px 0 16px;padding-top:4px}
      #recordsCombinedView .rc-title{display:flex;justify-content:space-between;gap:12px;align-items:end;flex-wrap:wrap;margin:0 0 12px}
      #recordsCombinedView .rc-title h3{margin:0;font-size:20px}.rc-sub{font-size:13px;color:var(--muted)}
      .rc-block{margin:0 0 20px}.rc-block>h3{margin:0 0 10px;font-size:19px}
      .rc-table{overflow:auto;border:1px solid rgba(103,52,189,.13);border-radius:14px;background:rgba(255,255,255,.32)}
      .rc-table table{width:100%;border-collapse:collapse;min-width:900px}.rc-table th,.rc-table td{padding:9px 10px;text-align:left;border-bottom:1px solid rgba(103,52,189,.09);font-size:12px}.rc-table th{background:#7442c8;color:#fff!important;white-space:nowrap}
      .rc-table tbody tr:nth-child(odd){background:rgba(255,255,255,.34)}.rc-table tbody tr:nth-child(even){background:rgba(255,255,255,.54)}
      .rc-total{display:flex;justify-content:flex-end;gap:22px;flex-wrap:wrap;border-radius:12px;padding:12px 14px;background:rgba(103,52,189,.10);font-weight:850;margin-top:8px}
      .rc-empty{padding:16px;border:1px dashed rgba(103,52,189,.25);border-radius:12px;color:var(--muted)}
      .rc-edit{border:1px solid rgba(103,52,189,.18);background:#f1e9ff;border-radius:9px;padding:6px 9px;cursor:pointer;font-size:16px}
      #recordsPage .records-report > .table-wrap.rc-original-hidden{display:none!important}
      @media(max-width:700px){#recordsCombinedView{margin-top:14px}.rc-total{justify-content:flex-start;gap:8px 18px}.rc-table table{min-width:820px}}
    `;document.head.appendChild(s);
  }

  function periodBounds(){
    const range=$('exportRange')?.value||'daily',refStr=$('exportDate')?.value||iso(new Date()),ref=new Date(refStr+'T00:00:00');
    if(range==='all')return {range,start:null,end:null,label:'Tüm Sevkiyatlar'};
    if(range==='daily')return {range,start:refStr,end:refStr,label:trDate(refStr)};
    if(range==='weekly'){const s=monday(ref),e=addDays(s,6);return {range,start:iso(s),end:iso(e),label:`${trDate(iso(s))} – ${trDate(iso(e))}`};}
    const start=refStr.slice(0,7)+'-01',first=new Date(start+'T00:00:00'),end=new Date(first.getFullYear(),first.getMonth()+1,0);return {range,start,end:iso(end),label:first.toLocaleDateString('tr-TR',{month:'long',year:'numeric'})};
  }
  function inPeriod(r,b){if(!r?.tarih)return false;if(!b.start)return true;return r.tarih>=b.start&&r.tarih<=b.end}

  async function load(renderAfter=true){
    const c=db();if(!c)return;
    const [a,b]=await Promise.all([
      c.from(CONCRETE).select('*').order('tarih',{ascending:true}).order('saat',{ascending:true}),
      c.from(CEMENT).select('*').order('tarih',{ascending:true}).order('created_at',{ascending:true})
    ]);
    concrete=a.error?[]:(a.data||[]);
    cement=b.error?[]:(b.data||[]);
    if(renderAfter)renderNow();
  }

  function ensureView(){
    const report=document.querySelector('#recordsPage .records-report');if(!report)return null;
    let box=$('recordsCombinedView');
    if(!box){
      box=document.createElement('div');box.id='recordsCombinedView';
      const table=report.querySelector('.table-wrap');
      if(table){table.classList.add('rc-original-hidden');report.insertBefore(box,table);}else report.appendChild(box);
    }
    const original=report.querySelector(':scope > .table-wrap:not(#recordsCombinedView .table-wrap)');
    if(original)original.classList.add('rc-original-hidden');
    return box;
  }

  function concreteHtml(items){
    if(!items.length)return '<div class="rc-empty">Seçilen dönemde beton sevkiyatı bulunmuyor.</div>';
    const total=items.reduce((s,r)=>s+Number(r.metraj||0),0);
    return `<div class="rc-table"><table><thead><tr><th>No</th><th>Tarih</th><th>Saat</th><th>Santral</th><th>Firma</th><th>Şantiye</th><th>Beton</th><th>Metraj</th><th>Pompa</th><th>İşlem</th></tr></thead><tbody>${items.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(trDate(r.tarih))}</td><td>${esc((r.saat||'').slice(0,5))}</td><td>${esc(title(r.santral))}</td><td>${esc(title(r.firma))}</td><td>${esc(title(r.santiye))}</td><td>${esc(title([r.beton_sinifi,r.beton_ozelligi].filter(Boolean).join(' ')))}</td><td>${fmt(r.metraj)}${r.metraj_plus?'+':''} m³</td><td>${r.pompa_var_mi?esc(title(r.pompa_tipi||'Pompalı')):'Pompasız'}</td><td><button type="button" class="rc-edit" onclick="window.editConcreteFromCombined('${r.id}')">✏️</button></td></tr>`).join('')}</tbody></table></div><div class="rc-total"><span>BETON SEVKİYATI: ${items.length}</span><span>GENEL BETON: ${fmt(total)} m³</span></div>`;
  }

  function cementHtml(items){
    if(!items.length)return '<div class="rc-empty">Seçilen dönemde çimento sevkiyatı bulunmuyor.</div>';
    const vehicles=items.reduce((s,r)=>s+Number(r.arac_sayisi||0),0),tons=items.reduce((s,r)=>s+(r.toplam_tonaj==null?0:Number(r.toplam_tonaj||0)),0),pending=items.filter(r=>r.toplam_tonaj==null).length;
    return `<div class="rc-table"><table><thead><tr><th>No</th><th>Tarih</th><th>Firma</th><th>Teslim Yeri</th><th>Araç</th><th>Tonaj</th><th>İşlem</th></tr></thead><tbody>${items.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(trDate(r.tarih))}</td><td>${esc(title(r.firma))}</td><td>Şantiye</td><td>${Number(r.arac_sayisi||0)}</td><td>${r.toplam_tonaj==null?'-':fmt(r.toplam_tonaj)+' ton'}</td><td><button type="button" class="rc-edit" onclick="window.editCementFromCombined('${r.id}')">✏️</button></td></tr>`).join('')}</tbody></table></div><div class="rc-total"><span>ÇİMENTO SEVKİYATI: ${items.length}</span><span>TOPLAM ARAÇ: ${vehicles}</span><span>TOPLAM TONAJ: ${fmt(tons)} ton</span>${pending?`<span>TONAJ BEKLEYEN: ${pending}</span>`:''}</div>`;
  }

  function renderNow(){
    const box=ensureView();if(!box)return;
    const b=periodBounds(),cr=concrete.filter(r=>inPeriod(r,b)),ce=cement.filter(r=>inPeriod(r,b));
    box.innerHTML=`<div class="rc-title"><div><h3>📋 Dönem Sevkiyatları</h3><div class="rc-sub">${esc(b.label)}</div></div></div><section class="rc-block"><h3>🚚 Beton Sevkiyatları</h3>${concreteHtml(cr)}</section><section class="rc-block"><h3>🏗️ Çimento Sevkiyatları</h3>${cementHtml(ce)}</section>`;
  }
  async function refresh(){await load(true)}

  function editConcrete(id){
    const recordsBtn=document.querySelector('[data-page="records"]');recordsBtn?.click();
    setTimeout(()=>{if(typeof window.editRecord==='function')window.editRecord(id);else if(typeof editRecord==='function')editRecord(id)},80);
  }
  function editCement(id){
    const cementBtn=$('cementTabBtn')||document.querySelector('[data-page="cement"]');cementBtn?.click();
    setTimeout(()=>{if(typeof window.editCementShipment==='function')window.editCementShipment(String(id))},180);
  }

  async function pdf(){
    if(!window.jspdf?.jsPDF){alert('PDF modülü yüklenemedi.');return;}
    await load(false);
    const b=periodBounds(),cr=concrete.filter(r=>inPeriod(r,b)),ce=cement.filter(r=>inPeriod(r,b));
    if(!cr.length&&!ce.length){alert('Seçilen dönemde sevkiyat yok.');return;}
    const {jsPDF}=window.jspdf,doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});let text=v=>String(v??''),font='helvetica';
    try{if(typeof window.preparePdfFont==='function'){const f=await window.preparePdfFont(doc);if(f){font=f.name||font;text=f.text||text}}}catch(e){}
    doc.setFont(font,'normal');doc.setFontSize(10);doc.text(text(b.label),14,14);let y=22;
    if(cr.length){
      doc.setFontSize(13);doc.text(text('Beton Sevkiyatları'),14,y);y+=4;
      doc.autoTable({head:[['Tarih','Saat','Santral','Firma','Şantiye','Beton','Metraj','Pompa'].map(text)],body:cr.map(r=>[trDate(r.tarih),(r.saat||'').slice(0,5),title(r.santral),title(r.firma),title(r.santiye),title([r.beton_sinifi,r.beton_ozelligi].filter(Boolean).join(' ')),`${fmt(r.metraj)}${r.metraj_plus?'+':''} m³`,r.pompa_var_mi?title(r.pompa_tipi||'Pompalı'):'Pompasız'].map(text)),startY:y+2,styles:{font,fontSize:7},headStyles:{font,fillColor:[111,66,193]},margin:{left:14,right:14}});
      y=(doc.lastAutoTable?.finalY||y+20)+7;const total=cr.reduce((s,r)=>s+Number(r.metraj||0),0);doc.setFontSize(10);doc.text(text(`Beton Toplamı: ${cr.length} sevkiyat · ${fmt(total)} m³`),14,y);y+=9;
    }
    if(ce.length){
      if(y>165){doc.addPage();y=16}doc.setFontSize(13);doc.text(text('Çimento Sevkiyatları'),14,y);y+=4;
      doc.autoTable({head:[['Tarih','Firma','Teslim Yeri','Araç','Tonaj'].map(text)],body:ce.map(r=>[trDate(r.tarih),title(r.firma),'Şantiye',String(Number(r.arac_sayisi||0)),r.toplam_tonaj==null?'-':fmt(r.toplam_tonaj)+' ton'].map(text)),startY:y+2,styles:{font,fontSize:8},headStyles:{font,fillColor:[111,66,193]},margin:{left:14,right:14}});
      y=(doc.lastAutoTable?.finalY||y+20)+7;const v=ce.reduce((s,r)=>s+Number(r.arac_sayisi||0),0),t=ce.reduce((s,r)=>s+(r.toplam_tonaj==null?0:Number(r.toplam_tonaj||0)),0),p=ce.filter(r=>r.toplam_tonaj==null).length;doc.setFontSize(10);doc.text(text(`Çimento Toplamı: ${ce.length} sevkiyat · ${v} araç · ${fmt(t)} ton${p?` · ${p} tonaj bekliyor`:''}`),14,y);
    }
    doc.save(`Betonexa-Sevkiyat-Plani-${b.range}.pdf`);
  }

  function bind(){
    const range=$('exportRange'),date=$('exportDate'),pdfBtn=$('pdfBtn');
    range?.addEventListener('change',refresh);date?.addEventListener('change',refresh);
    document.querySelector('.tabs')?.addEventListener('click',e=>{if(e.target.closest('[data-page="records"]'))setTimeout(refresh,100)});
    if(pdfBtn&&!pdfBtn.dataset.combinedCementPdf){pdfBtn.dataset.combinedCementPdf='1';pdfBtn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();pdf()},true)}
    document.addEventListener('click',e=>{if(e.target.closest('#cementSaveBtn')||e.target.closest('#cementRows .delete')||e.target.closest('#cementHistoryRows .delete'))setTimeout(refresh,900)},true);
  }

  window.editConcreteFromCombined=editConcrete;
  window.editCementFromCombined=editCement;
  window.refreshRecordsCombined=refresh;
  function init(){styles();bind();setTimeout(refresh,250)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();