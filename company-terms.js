(function(root){
  'use strict';

  const STORAGE_KEY='betonexa_company_terms_v1';
  const DEFAULT_ROWS=[{company:'TEYDA ARSTEK',term:'A90'}];
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  let rows=[];
  let editingIndex=-1;

  function normalizeCompany(value){
    const clean=String(value||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('tr-TR');
    return clean.replace(/(^|[\s-])([a-zçğıöşü])/gu,(match,prefix,letter)=>prefix+letter.toLocaleUpperCase('tr-TR'));
  }
  function normalizeTerm(value){
    return String(value||'').trim().replace(/\s+/g,'').toLocaleUpperCase('tr-TR');
  }
  function load(){
    try{
      const stored=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
      rows=Array.isArray(stored)&&stored.length?stored:DEFAULT_ROWS.slice();
    }catch(_){
      rows=DEFAULT_ROWS.slice();
    }
    rows=rows.map(row=>({id:row.id||null,company:normalizeCompany(row.company),term:normalizeTerm(row.term)}));
    save();
  }
  function save(){
    localStorage.setItem(STORAGE_KEY,JSON.stringify(rows));
  }
  function companyKey(value){
    return normalizeCompany(value).toLocaleLowerCase('tr-TR');
  }
  async function cloudContext(){
    const client=typeof root.ensureDb==='function'?root.ensureDb():null;
    if(!client)return null;
    const result=await client.auth.getUser();
    if(result.error||!result.data?.user)return null;
    return {client,user:result.data.user};
  }
  async function syncFromCloud(){
    const status=$('companyTermStatus');
    try{
      const context=await cloudContext();
      if(!context)return;
      const {client,user}=context;
      const localMap=new Map();
      rows.filter(row=>row.company&&row.term).forEach(row=>{
        const item={
          user_id:user.id,
          firma:normalizeCompany(row.company),
          firma_key:companyKey(row.company),
          vade:normalizeTerm(row.term)
        };
        if(!localMap.has(item.firma_key))localMap.set(item.firma_key,item);
      });
      const localRows=[...localMap.values()];
      for(const item of localRows){
        const migrated=await client.from('firma_vadeleri').upsert(item,{
          onConflict:'user_id,firma_key',
          ignoreDuplicates:true
        });
        if(migrated.error)throw migrated.error;
      }
      const result=await client.from('firma_vadeleri')
        .select('id,firma,vade')
        .eq('user_id',user.id)
        .order('firma',{ascending:true});
      if(result.error)throw result.error;
      rows=(result.data||[]).map(row=>({id:row.id,company:normalizeCompany(row.firma),term:normalizeTerm(row.vade)}));
      save();
      render();
      if(status&&status.textContent==='Kayıtlar eşitleniyor…')status.textContent='';
    }catch(error){
      console.warn('Firma vadeleri eşitlenemedi:',error);
      if(status){
        status.textContent='Kayıtlar şu anda yalnızca bu cihazda gösteriliyor.';
        status.style.color='var(--danger)';
      }
    }
  }
  function resetForm(){
    editingIndex=-1;
    $('companyTermCompany').value='';
    $('companyTermValue').value='';
    $('companyTermSave').textContent='Ekle';
    $('companyTermCancel').classList.add('hidden');
    $('companyTermStatus').textContent='';
  }
  function render(){
    const body=$('companyTermsBody');
    if(!body)return;
    if(!rows.length){
      body.innerHTML='<tr><td colspan="3" class="company-terms-empty">Henüz firma vadesi eklenmedi.</td></tr>';
      return;
    }
    body.innerHTML=rows.map((row,index)=>`
      <tr>
        <td>${esc(row.company)}</td>
        <td class="company-term-value">${esc(row.term)}</td>
        <td class="company-term-actions">
          <button type="button" class="btn btn-light company-term-edit" data-index="${index}">Düzenle</button>
          <button type="button" class="btn btn-light company-term-delete" data-index="${index}">Sil</button>
        </td>
      </tr>`).join('');
  }
  async function upsert(){
    const company=normalizeCompany($('companyTermCompany').value);
    const term=normalizeTerm($('companyTermValue').value);
    const status=$('companyTermStatus');
    if(!company||!term){
      status.textContent='Firma adı ve vade günü gerekli.';
      status.style.color='var(--danger)';
      return;
    }
    const duplicate=rows.findIndex((row,index)=>index!==editingIndex&&companyKey(row.company)===companyKey(company));
    if(duplicate>=0){
      status.textContent='Bu firma zaten kayıtlı.';
      status.style.color='var(--danger)';
      return;
    }
    const previous=editingIndex>=0?rows[editingIndex]:null;
    const item={id:previous?.id||null,company,term};
    if(editingIndex>=0)rows[editingIndex]=item;
    else rows.push(item);
    rows.sort((a,b)=>a.company.localeCompare(b.company,'tr'));
    save();
    render();
    resetForm();
    try{
      const context=await cloudContext();
      if(!context)return;
      const {client,user}=context;
      let result;
      const payload={user_id:user.id,firma:company,firma_key:companyKey(company),vade:term,updated_at:new Date().toISOString()};
      if(previous?.id){
        result=await client.from('firma_vadeleri').update(payload).eq('id',previous.id).eq('user_id',user.id);
      }else{
        result=await client.from('firma_vadeleri').upsert(payload,{onConflict:'user_id,firma_key'});
      }
      if(result.error)throw result.error;
      await syncFromCloud();
    }catch(error){
      console.warn('Firma vadesi buluta kaydedilemedi:',error);
      status.textContent='Kayıt cihazda saklandı; bağlantı gelince eşitlenecek.';
      status.style.color='var(--danger)';
    }
  }
  function startEdit(index){
    const row=rows[index];
    if(!row)return;
    editingIndex=index;
    $('companyTermCompany').value=row.company;
    $('companyTermValue').value=row.term;
    $('companyTermSave').textContent='Güncelle';
    $('companyTermCancel').classList.remove('hidden');
    $('companyTermCompany').focus();
  }
  async function remove(index){
    const row=rows[index];
    if(!row||!confirm(row.company+' kaydı silinsin mi?'))return;
    rows.splice(index,1);
    save();
    render();
    resetForm();
    if(!row.id)return;
    try{
      const context=await cloudContext();
      if(!context)return;
      const result=await context.client.from('firma_vadeleri').delete().eq('id',row.id).eq('user_id',context.user.id);
      if(result.error)throw result.error;
    }catch(error){
      console.warn('Firma vadesi buluttan silinemedi:',error);
      const status=$('companyTermStatus');
      status.textContent='Silme işlemi buluta aktarılamadı.';
      status.style.color='var(--danger)';
    }
  }
  async function downloadPdf(){
    const status=$('companyTermStatus');
    if(!rows.length){
      status.textContent='PDF için en az bir kayıt gerekli.';
      status.style.color='var(--danger)';
      return;
    }
    try{
      if(!root.jspdf?.jsPDF)throw new Error('PDF modülü yüklenemedi.');
      const {jsPDF}=root.jspdf;
      const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
      let font='helvetica',text=value=>String(value??'').replace(/[ŞşĞğİıÇçÖöÜü]/g,ch=>({Ş:'S',ş:'s',Ğ:'G',ğ:'g',İ:'I',ı:'i',Ç:'C',ç:'c',Ö:'O',ö:'o',Ü:'U',ü:'u'}[ch]));
      if(typeof root.preparePdfFont==='function'){
        try{
          const pack=await root.preparePdfFont(doc);
          if(pack){font=pack.name||font;text=pack.text||text;}
        }catch(_){}
      }
      doc.setFont(font,'normal');
      const purple=[74,35,181],dark=[18,25,62],line=[211,205,235],soft=[247,246,252],white=[255,255,255];
      const width=doc.internal.pageSize.getWidth(),margin=14;
      doc.setTextColor(...dark);doc.setFontSize(19);doc.text(text('FİRMA VADELERİ'),margin,18);
      doc.setDrawColor(...purple);doc.setLineWidth(.35);doc.line(margin,29,width-margin,29);
      doc.setFillColor(...purple);doc.roundedRect(margin,21.5,4.4,4.4,.6,.6,'F');
      doc.setTextColor(...purple);doc.setFontSize(8.5);
      doc.text(text(new Date().toLocaleDateString('tr-TR',{day:'2-digit',month:'long',year:'numeric'})),margin+7,25);
      doc.autoTable({
        startY:35,
        theme:'grid',
        head:[[text('FİRMA ADI'),text('VADE GÜNÜ')]],
        body:rows.map(row=>[text(row.company),text(row.term)]),
        margin:{left:margin,right:margin},
        styles:{font,fontStyle:'normal',fontSize:10,cellPadding:4,textColor:dark,lineColor:line,lineWidth:.15,valign:'middle'},
        headStyles:{font,fontStyle:'normal',fillColor:purple,textColor:white,halign:'center',cellPadding:4},
        alternateRowStyles:{fillColor:soft},
        columnStyles:{0:{cellWidth:125},1:{cellWidth:43,halign:'center'}}
      });
      const pages=doc.getNumberOfPages();
      for(let page=1;page<=pages;page++){
        doc.setPage(page);
        const height=doc.internal.pageSize.getHeight();
        doc.setDrawColor(...line);doc.setFillColor(...soft);
        doc.roundedRect(margin,height-15,width-margin*2,7,1.2,1.2,'FD');
        doc.setTextColor(...dark);doc.setFontSize(6.5);
        doc.text(text('Betonexa Firma Vadeleri'),margin+4,height-10.5);
        doc.text(text('Sayfa '+page+' / '+pages),width-margin-4,height-10.5,{align:'right'});
      }
      doc.save('Betonexa_Firma_Vadeleri.pdf');
      status.textContent='PDF indirildi.';
      status.style.color='var(--success)';
    }catch(error){
      status.textContent='PDF oluşturulamadı: '+(error.message||'Bilinmeyen hata');
      status.style.color='var(--danger)';
    }
  }
  function init(){
    load();
    render();
    root.BetonexaCompanyTermsRefresh=async function(){
      const status=$('companyTermStatus');
      if(status&&!status.textContent){
        status.textContent='Kayıtlar eşitleniyor…';
        status.style.color='var(--muted)';
      }
      await syncFromCloud();
    };
    $('companyTermSave')?.addEventListener('click',upsert);
    $('companyTermCancel')?.addEventListener('click',resetForm);
    $('companyTermsPdf')?.addEventListener('click',downloadPdf);
    $('companyTermsBody')?.addEventListener('click',event=>{
      const edit=event.target.closest('.company-term-edit');
      const del=event.target.closest('.company-term-delete');
      if(edit)startEdit(Number(edit.dataset.index));
      if(del)remove(Number(del.dataset.index));
    });
    $('companyTermValue')?.addEventListener('keydown',event=>{if(event.key==='Enter')upsert();});
    setTimeout(()=>syncFromCloud(),1800);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})(window);
