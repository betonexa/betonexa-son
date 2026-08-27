(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const db=()=>typeof window.ensureDb==='function'?window.ensureDb():null;
  const fmt=v=>Number(v||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const trDate=v=>v?new Date(v+'T00:00:00').toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric'}):'';
  const label=v=>window.BetonexaNames?.label?.(v)||String(v??'').trim();
  const status=r=>({planlandi:'Planlandı',miktar_degisti:'Miktar Değişti',tamamlandi:'Tamamlandı',iptal:'İptal'})[r?.durum]||(r?.tamamlandi?'Tamamlandı':'Planlandı');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const showCount=v=>v==null||Number(v)===0?'-':String(Number(v));
  const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const monday=d=>{const x=new Date(d),day=(x.getDay()+6)%7;x.setDate(x.getDate()-day);x.setHours(0,0,0,0);return x};
  const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
  function bounds(prefix='export'){
    const range=$(prefix==='export'?'exportRange':'cementRange')?.value||'all';
    const ref=$(prefix==='export'?'exportDate':'cementFilterDate')?.value||iso(new Date());
    const d=new Date(ref+'T00:00:00');
    if(range==='all')return {range,start:null,end:null,label:'Tüm Sevkiyatlar'};
    if(range==='daily')return {range,start:ref,end:ref,label:trDate(ref)};
    if(range==='weekly'){const s=monday(d),e=addDays(s,6);return {range,start:iso(s),end:iso(e),label:`${trDate(iso(s))} – ${trDate(iso(e))}`}}
    const start=ref.slice(0,7)+'-01',f=new Date(start+'T00:00:00'),e=new Date(f.getFullYear(),f.getMonth()+1,0);return {range,start,end:iso(e),label:f.toLocaleDateString('tr-TR',{month:'long',year:'numeric'})};
  }
  async function fetchRows(b,cementOnly=false){
    const c=db();if(!c)throw new Error('Veritabanı bağlantısı yüklenemedi.');
    const inRange=r=>!b.start||(r.tarih>=b.start&&r.tarih<=b.end);
    const cementRes=await c.from('cimento_sevkiyatlar').select('*').order('tarih',{ascending:true}).order('created_at',{ascending:true});
    if(cementRes.error)throw cementRes.error;
    const cement=(cementRes.data||[]).filter(r=>r.durum!=='iptal'&&inRange(r));
    if(cementOnly)return {cement,concrete:[]};
    const concreteRes=await c.from('sevkiyatlar').select('*').order('tarih',{ascending:true}).order('saat',{ascending:true});
    if(concreteRes.error)throw concreteRes.error;
    return {cement,concrete:(concreteRes.data||[]).filter(r=>r.durum!=='iptal'&&inRange(r))};
  }
  async function pdfReport(cementOnly=false){
    try{
      if(!window.jspdf?.jsPDF)throw new Error('PDF modülü yüklenemedi.');
      const b=bounds(cementOnly?'cement':'export'),data=await fetchRows(b,cementOnly);if(!data.cement.length&&!data.concrete.length)throw new Error('Seçilen dönemde sevkiyat yok.');
      const {jsPDF}=window.jspdf,doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});let font='helvetica',text=v=>String(v??'');
      try{if(typeof window.preparePdfFont==='function'){const p=await window.preparePdfFont(doc);if(p){font=p.name||font;text=p.text||text}}}catch(_){ }
      doc.setFont(font,'normal');doc.setTextColor(18,25,62);doc.setFontSize(19);doc.text(text(cementOnly?'ÇİMENTO SEVKİYATLARI':'SEVKİYAT RAPORU'),10,13);doc.setFontSize(8);doc.setTextColor(74,35,181);doc.text(text(b.label),10,20);let y=27;
      if(data.concrete.length&&!cementOnly){doc.setFontSize(11);doc.text(text('BETON SEVKİYATLARI'),10,y);y+=3;doc.autoTable({startY:y,head:[['No','Tarih','Saat','Santral','Firma','Şantiye','Beton','Miktar','Durum'].map(text)],body:data.concrete.map((r,i)=>[i+1,trDate(r.tarih),(r.saat||'').slice(0,5),label(r.santral),label(r.firma),label(r.santiye),label([r.beton_sinifi,r.beton_ozelligi].filter(Boolean).join(' ')),`${fmt(r.metraj)}${r.metraj_plus?'+':''} m³`,status(r)].map(text)),styles:{font,fontSize:6},headStyles:{font,fillColor:[74,35,181]},margin:{left:10,right:10}});y=(doc.lastAutoTable?.finalY||y+15)+8;}
      if(data.cement.length){if(y>165){doc.addPage();y=18}doc.setFontSize(11);doc.setTextColor(18,25,62);doc.text(text('ÇİMENTO SEVKİYATLARI'),10,y);y+=3;doc.autoTable({startY:y,head:[['No','Tarih','Firma','Teslim Yeri / Şantiye','Araç','Palet','Miktar','Durum'].map(text)],body:data.cement.map((r,i)=>[i+1,trDate(r.tarih),label(r.firma),label(r.teslim_yeri||'Şantiye'),showCount(r.arac_sayisi),showCount(r.palet_sayisi),r.toplam_tonaj==null?'Bilgi bekleniyor':`${fmt(r.toplam_tonaj)} ton`,status(r)].map(text)),styles:{font,fontSize:6,cellPadding:1.3},headStyles:{font,fillColor:[74,35,181]},columnStyles:{0:{cellWidth:8,halign:'center'},1:{cellWidth:24,halign:'center'},2:{cellWidth:42},3:{cellWidth:38},4:{cellWidth:20,halign:'center'},5:{cellWidth:20,halign:'center'},6:{cellWidth:62,halign:'center'},7:{cellWidth:42,halign:'center'}},margin:{left:10,right:10}});y=(doc.lastAutoTable?.finalY||y+15)+7;const vehicles=data.cement.reduce((s,r)=>s+Number(r.arac_sayisi||0),0),pallets=data.cement.reduce((s,r)=>s+Number(r.palet_sayisi||0),0),tons=data.cement.reduce((s,r)=>s+Number(r.toplam_tonaj||0),0);doc.setFontSize(9);doc.setTextColor(74,35,181);doc.text(text(`TOPLAM ÇİMENTO: ${data.cement.length} sevkiyat   •   ${vehicles} araç   •   ${pallets} palet   •   ${fmt(tons)} ton`),10,y);}
      doc.save(cementOnly?`Cimento-Sevkiyatlari-${b.range}.pdf`:`Betonexa-Sevkiyat-Raporu-${b.range}.pdf`);
    }catch(e){alert(e.message||String(e));}
  }
  async function excelReport(cementOnly=false){
    try{if(!window.XLSX)throw new Error('Excel modülü yüklenemedi.');const b=bounds(cementOnly?'cement':'export'),data=await fetchRows(b,cementOnly),wb=XLSX.utils.book_new();
      if(data.concrete.length&&!cementOnly){const rows=data.concrete.map((r,i)=>({No:i+1,Tarih:trDate(r.tarih),Saat:(r.saat||'').slice(0,5),Santral:label(r.santral),Firma:label(r.firma),'Şantiye':label(r.santiye),Beton:label([r.beton_sinifi,r.beton_ozelligi].filter(Boolean).join(' ')),Metraj:Number(r.metraj||0),Durum:status(r)}));XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),'Beton');}
      if(data.cement.length){const rows=data.cement.map((r,i)=>({No:i+1,Tarih:trDate(r.tarih),Firma:label(r.firma),'Teslim Yeri':label(r.teslim_yeri||'Şantiye'),'Araç Sayısı':r.arac_sayisi?Number(r.arac_sayisi):'-','Palet Sayısı':r.palet_sayisi?Number(r.palet_sayisi):'-','Toplam Tonaj':r.toplam_tonaj==null?'':Number(r.toplam_tonaj),Durum:status(r)}));rows.push({No:'',Tarih:'',Firma:'TOPLAM','Teslim Yeri':'','Araç Sayısı':data.cement.reduce((s,r)=>s+Number(r.arac_sayisi||0),0),'Palet Sayısı':data.cement.reduce((s,r)=>s+Number(r.palet_sayisi||0),0),'Toplam Tonaj':data.cement.reduce((s,r)=>s+Number(r.toplam_tonaj||0),0),Durum:''});const ws=XLSX.utils.json_to_sheet(rows);ws['!cols']=[{wch:6},{wch:12},{wch:24},{wch:18},{wch:12},{wch:12},{wch:15},{wch:18}];XLSX.utils.book_append_sheet(wb,ws,'Çimento');}
      XLSX.writeFile(wb,cementOnly?`Cimento-Sevkiyatlari-${b.range}.xlsx`:`Betonexa-Sevkiyat-Raporu-${b.range}.xlsx`);
    }catch(e){alert(e.message||String(e));}
  }
  async function printReport(cementOnly=false){
    try{const b=bounds(cementOnly?'cement':'export'),data=await fetchRows(b,cementOnly),w=window.open('','_blank');if(!w)return;const cement=data.cement.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(trDate(r.tarih))}</td><td>${esc(label(r.firma))}</td><td>${esc(label(r.teslim_yeri||'Şantiye'))}</td><td>${showCount(r.arac_sayisi)}</td><td>${showCount(r.palet_sayisi)}</td><td>${r.toplam_tonaj==null?'-':fmt(r.toplam_tonaj)+' ton'}</td><td>${esc(status(r))}</td></tr>`).join('');const v=data.cement.reduce((s,r)=>s+Number(r.arac_sayisi||0),0),p=data.cement.reduce((s,r)=>s+Number(r.palet_sayisi||0),0),t=data.cement.reduce((s,r)=>s+Number(r.toplam_tonaj||0),0);w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Sevkiyat Raporu</title><style>body{font-family:Arial;padding:22px;color:#202633}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #bbb;padding:7px}th{background:#6f42c1;color:#fff}.delivery{width:14%}.num{width:8%;text-align:center}.total{margin-top:12px;font-weight:bold;text-align:right}</style></head><body><h2>${cementOnly?'Çimento Sevkiyatları':'Sevkiyat Raporu'}</h2><p>${esc(b.label)}</p>${data.cement.length?`<h3>Çimento Sevkiyatları</h3><table><thead><tr><th>No</th><th>Tarih</th><th>Firma</th><th class="delivery">Teslim Yeri</th><th class="num">Araç</th><th class="num">Palet</th><th>Miktar</th><th>Durum</th></tr></thead><tbody>${cement}</tbody></table><div class="total">TOPLAM: ${data.cement.length} sevkiyat · ${v} araç · ${p} palet · ${fmt(t)} ton</div>`:''}</body></html>`);w.document.close();w.focus();setTimeout(()=>w.print(),250);}catch(e){alert(e.message||String(e));}
  }
  function hook(){
    const map={pdfBtn:()=>pdfReport(false),excelBtn:()=>excelReport(false),printBtn:()=>printReport(false),cementPdfBtn:()=>pdfReport(true),cementExcelBtn:()=>excelReport(true),cementPrintBtn:()=>printReport(true)};
    document.addEventListener('click',e=>{const b=e.target.closest?.('button');if(!b||!map[b.id])return;e.preventDefault();e.stopImmediatePropagation();map[b.id]();},true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hook,{once:true});else hook();
})();
