(function(root){
  'use strict';

  const PURPLE=[74,35,181],PURPLE_2=[91,45,195],DARK=[18,25,62],LINE=[211,205,235],SOFT=[247,246,252],WHITE=[255,255,255];
  const $=id=>document.getElementById(id);
  const db=()=>typeof root.ensureDb==='function'?root.ensureDb():root.BetonexaAuthClient;
  const fmt=value=>Number(value||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const label=value=>root.BetonexaNames?.label?.(value)||String(value??'').trim();
  const key=value=>root.BetonexaNames?.key?.(value)||String(value??'').trim().toLocaleLowerCase('tr-TR');
  const iso=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const addDays=(date,days)=>{const result=new Date(date);result.setDate(result.getDate()+days);return result};
  const monday=date=>{const result=new Date(date),day=(result.getDay()+6)%7;result.setDate(result.getDate()-day);result.setHours(0,0,0,0);return result};
  const trDate=value=>value?new Date(value+'T00:00:00').toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric'}):'';
  const longDate=value=>value?new Date(value+'T00:00:00').toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'}):'';

  async function fontPack(doc){
    try{
      if(typeof root.preparePdfFont==='function')return await root.preparePdfFont(doc);
    }catch(error){console.warn('PDF fontu hazırlanamadı:',error)}
    return {name:'helvetica',text:value=>String(value??'').replace(/[ŞşĞğİıÇçÖöÜü³]/g,character=>({Ş:'S',ş:'s',Ğ:'G',ğ:'g',İ:'I',ı:'i',Ç:'C',ç:'c',Ö:'O',ö:'o',Ü:'U',ü:'u','³':'3'}[character]))};
  }

  function period(){
    const mode=$('exportRange')?.value||'all',reference=$('exportDate')?.value||iso(new Date()),date=new Date(reference+'T00:00:00');
    if(mode==='daily')return {mode,start:reference,end:reference,dateLabel:longDate(reference),typeLabel:'Günlük Rapor'};
    if(mode==='weekly'){
      const start=iso(monday(date)),end=iso(addDays(monday(date),6));
      return {mode,start,end,dateLabel:`${longDate(start)} - ${longDate(end)}`,typeLabel:'Haftalık Rapor'};
    }
    if(mode==='monthly'){
      const start=iso(new Date(date.getFullYear(),date.getMonth(),1)),end=iso(new Date(date.getFullYear(),date.getMonth()+1,0));
      return {mode,start,end,dateLabel:new Date(start+'T00:00:00').toLocaleDateString('tr-TR',{month:'long',year:'numeric'}),typeLabel:'Aylık Rapor'};
    }
    return {mode:'all',start:null,end:null,dateLabel:'Tüm kayıtlar',typeLabel:'Tüm Sevkiyatlar'};
  }

  function tomorrowPeriod(){
    const value=typeof root.tomorrowDateString==='function'?root.tomorrowDateString():iso(addDays(new Date(),1));
    return {mode:'tomorrow',start:value,end:value,dateLabel:longDate(value),typeLabel:'Yarınki Sevkiyatlar'};
  }

  async function fetchData(bounds){
    const client=db();if(!client)throw new Error('Veritabanı bağlantısı yüklenemedi.');
    const [concreteResult,cementResult]=await Promise.all([
      client.from('sevkiyatlar').select('*').order('tarih',{ascending:true}).order('saat',{ascending:true}),
      client.from('cimento_sevkiyatlar').select('*').order('tarih',{ascending:true}).order('created_at',{ascending:true})
    ]);
    if(concreteResult.error)throw new Error('Beton kayıtları alınamadı: '+concreteResult.error.message);
    if(cementResult.error)throw new Error('Çimento kayıtları alınamadı: '+cementResult.error.message);
    const inRange=row=>!bounds.start||(row.tarih>=bounds.start&&row.tarih<=bounds.end);
    return {concrete:(concreteResult.data||[]).filter(inRange),cement:(cementResult.data||[]).filter(inRange)};
  }

  function groupConcrete(items){
    const groups=new Map();
    items.forEach(item=>{
      const raw=label(item.firma)||'Firma Belirtilmemiş',canonical=key(raw)||raw;
      if(!groups.has(canonical))groups.set(canonical,{name:raw,items:[]});
      groups.get(canonical).items.push(item);
    });
    return [...groups.values()];
  }

  function reportHeader(doc,text,bounds){
    const width=doc.internal.pageSize.getWidth(),margin=7;
    doc.setTextColor(...DARK);doc.setFontSize(19);doc.text(text('SEVKİYAT RAPORU'),margin,12);
    doc.setDrawColor(...PURPLE);doc.setLineWidth(.35);doc.line(margin,23,width-margin,23);
    doc.setFillColor(...PURPLE);doc.roundedRect(margin,15.5,4.4,4.4,.6,.6,'F');
    doc.setTextColor(...PURPLE);doc.setFontSize(8.2);doc.text(text(bounds.dateLabel),margin+6.5,19);
    const dateWidth=doc.getTextWidth(text(bounds.dateLabel));doc.setTextColor(...DARK);doc.text(text('•  '+bounds.typeLabel),margin+8+dateWidth,19);
  }

  function sectionTitle(doc,text,title,letter,y){
    const width=doc.internal.pageSize.getWidth(),margin=7;
    doc.setFillColor(...PURPLE);doc.roundedRect(margin,y,width-margin*2,8,1.5,1.5,'F');
    doc.setFillColor(...PURPLE_2);doc.circle(margin+4.2,y+4,4.6,'F');
    doc.setTextColor(...WHITE);doc.setFontSize(8.5);doc.text(text(letter),margin+4.2,y+5.2,{align:'center'});
    doc.setFontSize(9);doc.text(text(title),margin+11,y+5.2);
    return y+10.5;
  }

  function continuationHeader(doc,text,title){
    reportHeader(doc,text,{dateLabel:'Rapor devamı',typeLabel:title});
    return sectionTitle(doc,text,title,title.startsWith('BETON')?'B':'Ç',27);
  }

  function companyBand(doc,text,name,total,y){
    const width=doc.internal.pageSize.getWidth(),margin=10;
    doc.setFillColor(...SOFT);doc.setDrawColor(...LINE);doc.roundedRect(margin,y,width-margin*2,7,1,1,'FD');
    doc.setTextColor(...DARK);doc.setFontSize(7.5);doc.text(text(name),margin+2,y+4.7);
    doc.setTextColor(...PURPLE);doc.text(text(`Firma Toplamı: ${fmt(total)} m³`),width-margin-2,y+4.7,{align:'right'});
    return y+7;
  }

  function tableBase(font,margin=10){
    return {
      theme:'grid',margin:{left:margin,right:margin},
      styles:{font,fontStyle:'normal',fontSize:5.6,cellPadding:1.25,textColor:DARK,lineColor:LINE,lineWidth:.12,overflow:'linebreak',valign:'middle'},
      headStyles:{font,fontStyle:'normal',fontSize:5.7,fillColor:PURPLE,textColor:WHITE,halign:'center',cellPadding:1.4},
      alternateRowStyles:{fillColor:[250,249,253]},
      didDrawPage:()=>{}
    };
  }

  function summaryBand(doc,text,labelText,valueText,y){
    const width=doc.internal.pageSize.getWidth(),margin=10;
    doc.setFillColor(...SOFT);doc.setDrawColor(...LINE);doc.roundedRect(margin,y,width-margin*2,7,1,1,'FD');
    doc.setTextColor(...PURPLE);doc.setFontSize(8);doc.text(text(labelText),margin+10,y+4.8);
    doc.setFontSize(9);doc.text(text(valueText),width-margin-3,y+4.8,{align:'right'});
    return y+10;
  }

  function addPageFooters(doc,text){
    const pages=doc.getNumberOfPages(),stamp=new Date(),date=stamp.toLocaleDateString('tr-TR',{day:'2-digit',month:'long',year:'numeric'}),time=stamp.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});
    for(let page=1;page<=pages;page++){
      doc.setPage(page);const width=doc.internal.pageSize.getWidth(),height=doc.internal.pageSize.getHeight(),margin=7;
      doc.setDrawColor(...LINE);doc.setFillColor(250,249,253);doc.roundedRect(margin,height-10.5,width-margin*2,7,1.2,1.2,'FD');
      doc.setTextColor(...DARK);doc.setFontSize(5.8);doc.text(text(`Rapor Tarihi: ${date}   ${time}`),margin+10,height-6);
      doc.text(text(`Sayfa  ${page} / ${pages}`),width-margin-6,height-6,{align:'right'});
    }
  }

  async function buildReport(bounds,data){
    if(!root.jspdf?.jsPDF)throw new Error('PDF modülü yüklenemedi.');
    if(!data.concrete.length&&!data.cement.length)throw new Error('Seçilen dönemde sevkiyat bulunmuyor.');
    const {jsPDF}=root.jspdf,doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'}),pack=await fontPack(doc),font=pack.name,text=pack.text;
    doc.setFont(font,'normal');reportHeader(doc,text,bounds);let y=27;

    if(data.concrete.length){
      y=sectionTitle(doc,text,'BETON SEVKİYATLARI','B',y);
      for(const group of groupConcrete(data.concrete)){
        if(y>174){doc.addPage();doc.setFont(font,'normal');y=continuationHeader(doc,text,'BETON SEVKİYATLARI');}
        const total=group.items.reduce((sum,item)=>sum+Number(item.metraj||0),0);y=companyBand(doc,text,group.name,total,y);
        doc.autoTable({
          ...tableBase(font),startY:y,
          head:[['No','Tarih','Saat','Santral','Firma','Şantiye','Beton','Özellik','Pompa','Metraj (m³)','Sorumlu','Telefon'].map(text)],
          body:group.items.map((item,index)=>[
            String(index+1),trDate(item.tarih),(item.saat||'').slice(0,5),label(item.santral),label(item.firma),label(item.santiye),label(item.beton_sinifi),label(item.beton_ozelligi)||'-',item.pompa_var_mi?label(item.pompa_tipi||'Pompalı'):'Pompasız',`${fmt(item.metraj)}${item.metraj_plus?'+':''}`,label(item.sorumlu_kisi||''),item.telefon||''
          ].map(text)),
          columnStyles:{0:{cellWidth:8,halign:'center'},1:{cellWidth:20,halign:'center'},2:{cellWidth:13,halign:'center'},3:{cellWidth:25},4:{cellWidth:22},5:{cellWidth:34},6:{cellWidth:14,halign:'center'},7:{cellWidth:17,halign:'center'},8:{cellWidth:17,halign:'center'},9:{cellWidth:22,halign:'center'},10:{cellWidth:23},11:{cellWidth:38}}
        });
        y=(doc.lastAutoTable?.finalY||y+10)+2.3;
      }
      const total=data.concrete.reduce((sum,item)=>sum+Number(item.metraj||0),0);
      if(y>187){doc.addPage();doc.setFont(font,'normal');y=continuationHeader(doc,text,'BETON SEVKİYATLARI');}
      y=summaryBand(doc,text,'TOPLAM BETON',`${data.concrete.length} sevkiyat   •   ${fmt(total)} m³`,y);
    }

    if(data.cement.length){
      if(y>170){doc.addPage();doc.setFont(font,'normal');reportHeader(doc,text,bounds);y=27;}
      y=sectionTitle(doc,text,'ÇİMENTO SEVKİYATLARI','Ç',y);
      doc.autoTable({
        ...tableBase(font),startY:y,
        head:[['No','Tarih','Firma','Teslim Yeri / Şantiye','Araç','Tonaj (ton)'].map(text)],
        body:data.cement.map((item,index)=>[String(index+1),trDate(item.tarih),label(item.firma),label(item.teslim_yeri||'Şantiye'),String(Number(item.arac_sayisi||0)),item.toplam_tonaj==null?'-':fmt(item.toplam_tonaj)].map(text)),
        columnStyles:{0:{cellWidth:12,halign:'center'},1:{cellWidth:38,halign:'center'},2:{cellWidth:52},3:{cellWidth:75},4:{cellWidth:48,halign:'center'},5:{cellWidth:48,halign:'center'}}
      });
      y=(doc.lastAutoTable?.finalY||y+10)+2.3;
      const vehicles=data.cement.reduce((sum,item)=>sum+Number(item.arac_sayisi||0),0),tons=data.cement.reduce((sum,item)=>sum+(item.toplam_tonaj==null?0:Number(item.toplam_tonaj||0)),0);
      summaryBand(doc,text,'TOPLAM ÇİMENTO',`${data.cement.length} sevkiyat   •   ${vehicles} araç   •   ${fmt(tons)} ton`,y);
    }

    addPageFooters(doc,text);return doc;
  }

  async function save(kind){
    try{
      const bounds=kind==='tomorrow'?tomorrowPeriod():period(),data=await fetchData(bounds),doc=await buildReport(bounds,data);
      const name=kind==='tomorrow'?`Betonexa-Yarinki-Sevkiyatlar-${bounds.start}.pdf`:`Betonexa-Sevkiyat-Raporu-${bounds.mode}.pdf`;
      doc.save(name);
    }catch(error){alert(error.message||String(error));}
  }

  function replacePdfButton(id,kind){
    const old=$(id);if(!old||old.dataset.professionalPdf==='1')return false;
    const button=old.cloneNode(true);button.dataset.professionalPdf='1';old.replaceWith(button);
    button.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();save(kind)},true);
    return true;
  }

  function bind(){
    let tries=0;const timer=setInterval(()=>{
      tries++;const tomorrow=replacePdfButton('tomorrowPdfBtn','tomorrow'),all=replacePdfButton('pdfBtn','all');
      if((tomorrow&&all)||tries>100)clearInterval(timer);
    },100);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  root.BetonexaProfessionalPdf=Object.freeze({buildReport,save});
})(typeof window!=='undefined'?window:null);
