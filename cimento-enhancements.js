(function(){
  'use strict';
  const CEMENT='cimento_sevkiyatlar', CONCRETE='sevkiyatlar';
  const $=id=>document.getElementById(id);
  const db=()=>typeof window.ensureDb==='function'?window.ensureDb():null;
  const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const norm=s=>String(s||'').trim().toLocaleLowerCase('tr-TR').replace(/\s+/g,' ');
  const title=s=>String(s||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('tr-TR').replace(/(^|[\s\-\/])([\p{L}])/gu,(m,a,b)=>a+b.toLocaleUpperCase('tr-TR'));
  const fmt=n=>Number(n||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
  let suggestions={firma:[],yer:['Şantiye']};
  let nullTonnageIds=new Set();

  function addStyles(){if($('cementEnhStyles'))return;const s=document.createElement('style');s.id='cementEnhStyles';s.textContent=`
    #cementAnalysisAddon{margin-top:20px;padding-top:18px;border-top:2px solid rgba(103,52,189,.18)}
    #cementAnalysisAddon h3{margin:0 0 12px}.cement-analysis-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:14px}.cement-analysis-card{background:rgba(255,255,255,.55);border:1px solid rgba(103,52,189,.12);border-radius:14px;padding:14px}.cement-analysis-card small{display:block;color:var(--muted);font-weight:700;margin-bottom:6px}.cement-analysis-card strong{font-size:21px}.cement-analysis-table{overflow:auto;border-radius:14px}.cement-analysis-table table{width:100%;border-collapse:collapse;min-width:620px}.cement-analysis-table th,.cement-analysis-table td{padding:9px;border-bottom:1px solid rgba(103,52,189,.1);text-align:left}.cement-analysis-table th{background:#7442c8;color:#fff!important}.cement-tonnage-pending{font-weight:800;color:var(--purple-dark)}
    .cement-pair-menu{position:absolute;left:0;right:0;top:100%;z-index:1000;background:#fff;border:1px solid rgba(103,52,189,.22);border-radius:12px;box-shadow:0 10px 24px rgba(40,25,70,.16);max-height:220px;overflow:auto;margin-top:4px}.cement-pair-menu.hidden{display:none}.cement-pair-option{display:block;width:100%;border:0;background:#fff;text-align:left;padding:10px 12px;font:inherit;cursor:pointer;color:var(--ink)}.cement-pair-option:hover,.cement-pair-option:focus{background:rgba(103,52,189,.09);outline:none}.cement-pair-option strong{color:var(--purple-dark)}
    @media(max-width:700px){.cement-analysis-cards{grid-template-columns:1fr 1fr}}
  `;document.head.appendChild(s)}

  async function loadSuggestions(){
    const c=db();if(!c)return;
    const [a,b]=await Promise.all([
      c.from(CEMENT).select('id,firma,teslim_yeri,toplam_tonaj'),
      c.from(CONCRETE).select('firma')
    ]);
    nullTonnageIds=new Set((a.data||[]).filter(x=>x.toplam_tonaj==null).map(x=>String(x.id)));
    const fm=new Map();
    const addFirma=f=>{if(f){const F=title(f);fm.set(norm(F),F)}};
    (a.data||[]).forEach(x=>addFirma(x.firma));
    (b.data||[]).forEach(x=>addFirma(x.firma));
    suggestions={firma:[...fm.values()].sort((a,b)=>a.localeCompare(b,'tr')),yer:['Şantiye']};
    fillLists();patchAllDisplays();
  }

  function fillLists(){
    let y=$('cementDeliveryList');
    if(!y){y=document.createElement('datalist');y.id='cementDeliveryList';document.body.appendChild(y)}
    y.innerHTML='<option value="Şantiye">';
    const ci=$('cementCompany'),di=$('cementDelivery');
    if(ci&&!ci.dataset.suggestBound){
      ci.dataset.suggestBound='1';ci.removeAttribute('list');ci.setAttribute('autocomplete','off');
      const field=ci.closest('.cement-field');
      if(field){
        field.style.position='relative';
        const menu=document.createElement('div');menu.id='cementPairMenu';menu.className='cement-pair-menu hidden';field.appendChild(menu);
        ci.addEventListener('input',()=>renderCompanyMenu(ci.value));
        ci.addEventListener('focus',()=>{if(ci.value.trim())renderCompanyMenu(ci.value)});
        document.addEventListener('click',e=>{if(!field.contains(e.target))menu.classList.add('hidden')});
      }
      ci.addEventListener('blur',()=>setTimeout(()=>{const exact=suggestions.firma.find(v=>norm(v)===norm(ci.value));if(exact)ci.value=exact;else if(ci.value.trim())ci.value=title(ci.value)},120));
    }
    if(di&&!di.dataset.suggestBound){
      di.dataset.suggestBound='1';di.setAttribute('list','cementDeliveryList');di.setAttribute('autocomplete','off');
      const forceSite=()=>{if(di.value.trim())di.value='Şantiye'};
      di.addEventListener('input',()=>{if(di.value.trim().length>=2&&norm(di.value).startsWith('san'))di.value='Şantiye'});
      di.addEventListener('change',forceSite);
      di.addEventListener('blur',forceSite);
    }
  }

  function renderCompanyMenu(query){
    const menu=$('cementPairMenu');if(!menu)return;const q=norm(query);if(!q){menu.classList.add('hidden');return}
    const matches=suggestions.firma.filter(v=>norm(v).startsWith(q)).slice(0,12);
    if(!matches.length){menu.classList.add('hidden');return}
    menu.innerHTML=matches.map((firma,i)=>`<button type="button" class="cement-pair-option" data-i="${i}"><strong>${firma}</strong></button>`).join('');
    menu.classList.remove('hidden');
    [...menu.querySelectorAll('.cement-pair-option')].forEach((btn,i)=>btn.addEventListener('mousedown',e=>{e.preventDefault();$('cementCompany').value=matches[i];menu.classList.add('hidden')}));
  }

  function trackEditIds(){
    document.addEventListener('click',e=>{
      const btn=e.target.closest?.('button.edit');if(btn){const oc=btn.getAttribute('onclick')||'';const m=oc.match(/'([^']+)'/);if(m)window.__cementPendingEditId=m[1];}
      if(e.target.closest?.('#cementCancelBtn'))window.__cementPendingEditId=null;
    },true);
  }

  function enablePendingTonnage(){
    const input=$('cementTonnage'),save=$('cementSaveBtn');if(!input||!save||save.dataset.pendingBound)return;
    input.type='text';input.inputMode='decimal';input.placeholder='0,00 veya -';save.dataset.pendingBound='1';
    save.addEventListener('click',async e=>{
      const raw=String(input.value||'').trim();
      if(raw!=='-'){if($('cementDelivery')&&$('cementDelivery').value.trim())$('cementDelivery').value='Şantiye';setTimeout(()=>{window.__cementPendingEditId=null;loadSuggestions()},800);return}
      e.preventDefault();e.stopImmediatePropagation();
      const tarih=$('cementDate')?.value,firma=title($('cementCompany')?.value),yer=$('cementDelivery')?.value.trim()?'Şantiye':'',arac=Number($('cementVehicleCount')?.value);
      if(!tarih||!firma||!yer||!Number.isInteger(arac)||arac<1){const st=$('cementStatus');if(st){st.textContent='Tarih, firma, teslim yeri ve araç sayısını eksiksiz doldur.';st.style.color='var(--danger)'}return}
      const c=db();if(!c)return;save.disabled=true;const editId=window.__cementPendingEditId||null;
      const payload={tarih,firma,teslim_yeri:'Şantiye',arac_sayisi:arac,toplam_tonaj:null,tamamlandi:false};
      const q=editId?c.from(CEMENT).update(payload).eq('id',editId):c.from(CEMENT).insert(payload);
      const {error}=await q;save.disabled=false;const st=$('cementStatus');
      if(error){if(st){st.textContent='Çimento sevkiyatı kaydedilemedi: '+error.message;st.style.color='var(--danger)'}return}
      window.__cementPendingEditId=null;
      if(typeof window.loadCementShipments==='function')await window.loadCementShipments();
      ['cementCompany','cementDelivery','cementVehicleCount','cementTonnage'].forEach(id=>{if($(id))$(id).value=''});if($('cementDate'))$('cementDate').value=today();save.textContent='Çimento Sevkiyatını Kaydet';$('cementCancelBtn')?.classList.add('hidden');
      if(st){st.textContent=editId?'Çimento sevkiyatı güncellendi. Tonaj bekliyor.':'Çimento sevkiyatı kaydedildi. Tonaj bekliyor.';st.style.color='var(--success)'}
      await loadSuggestions();
    },true);
  }

  function rowId(row){const b=row.querySelector('button.edit');if(!b)return null;const m=(b.getAttribute('onclick')||'').match(/'([^']+)'/);return m?m[1]:null}
  function patchTable(tbodyId,tonIndex=5){const tbody=$(tbodyId);if(!tbody)return;[...tbody.querySelectorAll('tr')].forEach(r=>{const c=r.querySelectorAll('td');if(c.length<=tonIndex)return;const id=rowId(r);if(id&&nullTonnageIds.has(String(id)))c[tonIndex].textContent='-';if(c.length>3)c[3].textContent='Şantiye';});}
  function patchTomorrow(){const tbody=document.querySelector('#tomorrowCementTable tbody');if(!tbody)return;[...tbody.querySelectorAll('tr')].forEach(r=>{const c=r.querySelectorAll('td');if(c.length>=2)c[1].textContent='Şantiye';if(c.length>=4&&/^(0([,.]00)?\s*ton)$/i.test(c[3].textContent.trim()))c[3].textContent='-';});}
  function patchAllDisplays(){patchTable('cementRows');patchTable('cementHistoryRows');patchTomorrow()}
  function observeDisplays(){['cementRows','cementHistoryRows'].forEach(id=>{const el=$(id);if(el&&!el.dataset.enhObserve){el.dataset.enhObserve='1';new MutationObserver(()=>setTimeout(patchAllDisplays,0)).observe(el,{childList:true,subtree:true})}});const report=$('tomorrowReport');if(report&&!report.dataset.cementEnhObserve){report.dataset.cementEnhObserve='1';new MutationObserver(()=>setTimeout(patchTomorrow,0)).observe(report,{childList:true,subtree:true})}}

  async function renderAnalysis(){
    const page=$('analysisPage');if(!page)return;let box=$('cementAnalysisAddon');if(!box){box=document.createElement('section');box.id='cementAnalysisAddon';page.appendChild(box)}
    const c=db();if(!c)return;box.innerHTML='<h3>🏗️ Çimento Analizi</h3><div>Yükleniyor…</div>';
    let q=c.from(CEMENT).select('*');const start=$('analysisStart')?.value,end=$('analysisEnd')?.value;if(start)q=q.gte('tarih',start);if(end)q=q.lte('tarih',end);
    const {data,error}=await q.order('tarih',{ascending:true});if(error){box.innerHTML='<h3>🏗️ Çimento Analizi</h3><div>Veriler alınamadı.</div>';return}
    const rows=data||[],pending=rows.filter(r=>r.toplam_tonaj==null).length,vehicles=rows.reduce((s,r)=>s+Number(r.arac_sayisi||0),0),tons=rows.reduce((s,r)=>s+Number(r.toplam_tonaj||0),0);const groups=new Map();
    rows.forEach(r=>{const key=norm(r.firma),g=groups.get(key)||{name:title(r.firma),sev:0,arac:0,ton:0,bek:0};g.sev++;g.arac+=Number(r.arac_sayisi||0);if(r.toplam_tonaj==null)g.bek++;else g.ton+=Number(r.toplam_tonaj||0);groups.set(key,g)});
    box.innerHTML=`<h3>🏗️ Çimento Analizi</h3><div class="cement-analysis-cards"><div class="cement-analysis-card"><small>SEVKİYAT</small><strong>${rows.length}</strong></div><div class="cement-analysis-card"><small>TOPLAM ARAÇ</small><strong>${vehicles}</strong></div><div class="cement-analysis-card"><small>TOPLAM TONAJ</small><strong>${fmt(tons)} ton</strong></div><div class="cement-analysis-card"><small>TONAJ BEKLEYEN</small><strong class="cement-tonnage-pending">${pending}</strong></div></div><div class="cement-analysis-table"><table><thead><tr><th>Firma</th><th>Sevkiyat</th><th>Araç</th><th>Tonaj</th><th>Tonaj Bekleyen</th></tr></thead><tbody>${[...groups.values()].sort((a,b)=>a.name.localeCompare(b.name,'tr')).map(g=>`<tr><td>${g.name}</td><td>${g.sev}</td><td>${g.arac}</td><td>${fmt(g.ton)} ton</td><td>${g.bek||'-'}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function bindAnalysis(){
    document.addEventListener('click',e=>{const b=e.target.closest?.('[data-page="analysis"]');if(b)setTimeout(renderAnalysis,180)});
    ['analysisStart','analysisEnd'].forEach(id=>$(id)?.addEventListener('change',()=>setTimeout(renderAnalysis,50)));
  }
  function init(){addStyles();trackEditIds();let n=0;const t=setInterval(()=>{n++;if($('cementPage')){clearInterval(t);loadSuggestions();fillLists();enablePendingTonnage();observeDisplays();patchAllDisplays()}else if(n>60)clearInterval(t)},100);bindAnalysis();if($('analysisPage')&&!$('analysisPage').classList.contains('hidden'))renderAnalysis()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();