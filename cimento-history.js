(function(){
  "use strict";

  const TABLE="cimento_sevkiyatlar";
  let pastEditId=null;
  const byId=id=>document.getElementById(id);
  const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const fmt=value=>Number(value||0).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});
  const isoDate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const todayIso=()=>isoDate(new Date());
  const titleCase=value=>String(value??"").trim().replace(/\s+/g," ").toLocaleLowerCase("tr-TR").replace(/(^|[\s\-\/])([\p{L}])/gu,(m,sep,ch)=>sep+ch.toLocaleUpperCase("tr-TR"));
  const formatDate=value=>{
    if(!value)return "";
    const d=new Date(value+"T00:00:00");
    const day=d.toLocaleDateString("tr-TR",{weekday:"long"});
    const date=value.split("-").reverse().join(".");
    return `${date} · ${day.charAt(0).toLocaleUpperCase("tr-TR")+day.slice(1)}`;
  };

  function db(){
    return typeof window.ensureDb==="function"?window.ensureDb():null;
  }

  function injectStyles(){
    if(byId("cementHistoryStyles"))return;
    const style=document.createElement("style");
    style.id="cementHistoryStyles";
    style.textContent=`
      #cementPage .cement-history-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      #cementHistoryPanel{margin-top:18px;padding-top:18px;border-top:2px solid rgba(103,52,189,.18)}
      #cementHistoryPanel.hidden{display:none!important}
      #cementHistoryPanel .cement-history-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px}
      #cementHistoryPanel .cement-history-head h3{margin:0;font-size:20px}
      #cementHistoryPanel .cement-history-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0 0 12px}
      #cementHistoryPanel .cement-history-card{background:rgba(255,255,255,.55);border:1px solid rgba(103,52,189,.12);border-radius:12px;padding:11px 13px}
      #cementHistoryPanel .cement-history-card small{display:block;color:var(--muted);font-weight:700;margin-bottom:4px}
      #cementHistoryPanel .cement-history-card strong{font-size:18px}
      #cementHistoryPanel .cement-history-table-wrap{overflow:auto;border-radius:14px}
      #cementHistoryPanel table{width:100%;border-collapse:collapse;min-width:760px}
      #cementHistoryPanel th,#cementHistoryPanel td{padding:10px 9px;border-bottom:1px solid rgba(103,52,189,.10);text-align:left;vertical-align:middle}
      #cementHistoryPanel th{background:#7442c8;color:#fff!important;font-size:12px;font-weight:700;white-space:nowrap}
      #cementHistoryPanel tbody tr:nth-child(odd){background:rgba(255,255,255,.34)}
      #cementHistoryPanel tbody tr:nth-child(even){background:rgba(255,255,255,.56)}
      #cementHistoryPanel .cement-history-empty{padding:22px;text-align:center;color:var(--muted)}
      #cementHistoryStatus{min-height:20px;font-size:13px;font-weight:700;margin:5px 0 8px}
      @media(max-width:700px){
        #cementHistoryPanel .cement-history-summary{grid-template-columns:1fr}
        #cementPage .cement-form{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;column-gap:14px!important;row-gap:12px!important;width:100%!important}
        #cementPage .cement-field{min-width:0!important;max-width:100%!important;width:auto!important}
        #cementPage .cement-field:first-child{grid-column:1 / -1!important}
        #cementPage .cement-field:nth-child(5){grid-column:auto!important}
        #cementPage .cement-field input{box-sizing:border-box!important;width:100%!important;max-width:100%!important;min-width:0!important}
        #cementPage .cement-actions{margin-top:2px}
      }
    `;
    document.head.appendChild(style);
  }

  function injectUi(){
    const page=byId("cementPage");
    if(!page||byId("cementHistoryBtn"))return;

    const head=page.querySelector(".cement-head");
    const refresh=byId("cementRefreshBtn");
    if(!head)return;

    let actions=head.querySelector(".cement-history-actions");
    if(!actions){
      actions=document.createElement("div");
      actions.className="cement-history-actions";
      if(refresh){head.insertBefore(actions,refresh);actions.appendChild(refresh);}else{head.appendChild(actions);}
    }

    const button=document.createElement("button");
    button.id="cementHistoryBtn";
    button.type="button";
    button.className="btn btn-light";
    button.textContent="Geçmiş Sevkiyatlar";
    actions.insertBefore(button,actions.firstChild);

    const panel=document.createElement("section");
    panel.id="cementHistoryPanel";
    panel.className="hidden";
    panel.innerHTML=`
      <div class="cement-history-head">
        <div>
          <h3>📚 Geçmiş Çimento Sevkiyatları</h3>
          <small>Tarihi geçen çimento sevkiyatları otomatik olarak burada listelenir.</small>
        </div>
        <button id="cementHistoryRefreshBtn" type="button" class="btn btn-light">Yenile</button>
      </div>
      <div id="cementHistoryStatus"></div>
      <div class="cement-history-summary">
        <div class="cement-history-card"><small>GEÇMİŞ SEVKİYAT</small><strong id="cementHistoryCount">0</strong></div>
        <div class="cement-history-card"><small>TOPLAM ARAÇ</small><strong id="cementHistoryVehicles">0</strong></div>
        <div class="cement-history-card"><small>TOPLAM TONAJ</small><strong id="cementHistoryTonnage">0,00 ton</strong></div>
      </div>
      <div class="cement-history-table-wrap">
        <table>
          <thead><tr><th>No</th><th>Tarih</th><th>Firma</th><th>Teslim Yeri</th><th>Araç</th><th>Tonaj</th><th>İşlem</th></tr></thead>
          <tbody id="cementHistoryRows"></tbody>
        </table>
      </div>
    `;
    page.appendChild(panel);

    button.addEventListener("click",async()=>{
      panel.classList.toggle("hidden");
      button.textContent=panel.classList.contains("hidden")?"Geçmiş Sevkiyatlar":"Geçmişi Kapat";
      if(!panel.classList.contains("hidden"))await loadHistory();
    });
    byId("cementHistoryRefreshBtn").addEventListener("click",loadHistory);

    bindPastEditForm();
    observeCurrentTable();
    setTimeout(filterCurrentTable,100);
  }

  function setStatus(message,isError=false){
    const el=byId("cementHistoryStatus");
    if(!el)return;
    el.textContent=message||"";
    el.style.color=isError?"var(--danger)":"var(--success)";
  }

  async function loadHistory(){
    const client=db();
    if(!client){setStatus("Veritabanı bağlantısı yüklenemedi.",true);return;}
    setStatus("Yükleniyor…");
    const {data,error}=await client.from(TABLE).select("*").lt("tarih",todayIso()).order("tarih",{ascending:false}).order("created_at",{ascending:false});
    if(error){setStatus("Geçmiş sevkiyatlar alınamadı: "+error.message,true);return;}

    const records=data||[];
    const rows=byId("cementHistoryRows");
    if(rows){
      rows.innerHTML=records.length?records.map((r,index)=>`
        <tr>
          <td>${index+1}</td>
          <td>${esc(formatDate(r.tarih))}</td>
          <td>${esc(titleCase(r.firma))}</td>
          <td>${esc(titleCase(r.teslim_yeri))}</td>
          <td>${Number(r.arac_sayisi||0)}</td>
          <td>${fmt(r.toplam_tonaj)} ton</td>
          <td><div class="cement-row-actions"><button type="button" class="icon-action edit" title="Düzenle" onclick="window.editPastCementShipment('${r.id}')">✏️</button><button type="button" class="icon-action delete" title="Sil" onclick="window.deletePastCementShipment('${r.id}')">🗑️</button></div></td>
        </tr>`).join(""):'<tr><td colspan="7" class="cement-history-empty">Henüz geçmiş çimento sevkiyatı bulunmuyor.</td></tr>';
    }
    if(byId("cementHistoryCount"))byId("cementHistoryCount").textContent=String(records.length);
    if(byId("cementHistoryVehicles"))byId("cementHistoryVehicles").textContent=String(records.reduce((s,r)=>s+Number(r.arac_sayisi||0),0));
    if(byId("cementHistoryTonnage"))byId("cementHistoryTonnage").textContent=fmt(records.reduce((s,r)=>s+Number(r.toplam_tonaj||0),0))+" ton";
    window.__cementPastRecords=records;
    setStatus("");
  }

  function editPastShipment(id){
    const r=(window.__cementPastRecords||[]).find(x=>String(x.id)===String(id));
    if(!r)return;
    pastEditId=r.id;
    byId("cementDate").value=r.tarih||todayIso();
    byId("cementCompany").value=r.firma||"";
    byId("cementDelivery").value=r.teslim_yeri||"";
    byId("cementVehicleCount").value=r.arac_sayisi??"";
    byId("cementTonnage").value=r.toplam_tonaj??"";
    byId("cementSaveBtn").textContent="Değişiklikleri Kaydet";
    byId("cementCancelBtn").classList.remove("hidden");
    const panel=byId("cementHistoryPanel");
    if(panel&&!panel.classList.contains("hidden"))panel.classList.add("hidden");
    const historyBtn=byId("cementHistoryBtn");
    if(historyBtn)historyBtn.textContent="Geçmiş Sevkiyatlar";
    byId("cementPage").scrollIntoView({behavior:"smooth",block:"start"});
  }

  function clearPastEditState(){pastEditId=null;}

  function bindPastEditForm(){
    const saveBtn=byId("cementSaveBtn");
    const cancelBtn=byId("cementCancelBtn");
    if(saveBtn&&!saveBtn.dataset.pastEditBound){
      saveBtn.dataset.pastEditBound="1";
      saveBtn.addEventListener("click",async event=>{
        if(!pastEditId)return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const tarih=byId("cementDate").value;
        const firma=titleCase(byId("cementCompany").value);
        const teslim=titleCase(byId("cementDelivery").value);
        const arac=Number(byId("cementVehicleCount").value);
        const tonaj=Number(String(byId("cementTonnage").value).replace(",","."));
        if(!tarih||!firma||!teslim||!Number.isInteger(arac)||arac<1||!Number.isFinite(tonaj)||tonaj<=0){setStatus("Tarih, firma, teslim yeri, araç sayısı ve toplam tonaj bilgilerini eksiksiz doldur.",true);return;}
        const client=db();
        if(!client){setStatus("Veritabanı bağlantısı yüklenemedi.",true);return;}
        saveBtn.disabled=true;
        const editId=pastEditId;
        const {error}=await client.from(TABLE).update({tarih,firma,teslim_yeri:teslim,arac_sayisi:arac,toplam_tonaj:tonaj}).eq("id",editId);
        saveBtn.disabled=false;
        if(error){setStatus("Kayıt güncellenemedi: "+error.message,true);return;}
        clearPastEditState();
        byId("cementDate").value=todayIso();
        byId("cementCompany").value="";
        byId("cementDelivery").value="";
        byId("cementVehicleCount").value="";
        byId("cementTonnage").value="";
        saveBtn.textContent="Çimento Sevkiyatını Kaydet";
        byId("cementCancelBtn").classList.add("hidden");
        setStatus("Çimento sevkiyatı güncellendi.");
        await loadHistory();
        if(typeof window.loadCementShipments==="function")await window.loadCementShipments();
      },true);
    }
    if(cancelBtn&&!cancelBtn.dataset.pastEditBound){cancelBtn.dataset.pastEditBound="1";cancelBtn.addEventListener("click",()=>clearPastEditState(),true);}
  }

  async function deletePastShipment(id){
    if(!confirm("Bu geçmiş çimento sevkiyatı kalıcı olarak silinsin mi?"))return;
    const client=db(); if(!client)return;
    const {error}=await client.from(TABLE).delete().eq("id",id);
    if(error){setStatus("Kayıt silinemedi: "+error.message,true);return;}
    await loadHistory();
  }

  function filterCurrentTable(){
    const tbody=byId("cementRows");
    if(!tbody)return;
    const today=todayIso();
    let visibleCount=0,vehicleTotal=0,tonnageTotal=0;
    [...tbody.querySelectorAll("tr")].forEach(row=>{
      const cells=row.querySelectorAll("td");
      if(cells.length<7)return;
      const dateText=(cells[1].textContent||"").trim().split(" · ")[0];
      const parts=dateText.split(".");
      const rowIso=parts.length===3?`${parts[2]}-${parts[1]}-${parts[0]}`:"";
      const isPast=rowIso&&rowIso<today;
      row.style.display=isPast?"none":"";
      const completeBtn=[...row.querySelectorAll("button")].find(b=>(b.textContent||"").includes("Tamamla"));
      if(completeBtn)completeBtn.remove();
      if(!isPast){
        visibleCount++;
        vehicleTotal+=Number((cells[4].textContent||"0").replace(/[^0-9.-]/g,""))||0;
        tonnageTotal+=Number((cells[5].textContent||"0").replace(".","").replace(",",".").replace(/[^0-9.-]/g,""))||0;
      }
    });
    if(byId("cementShipmentTotal"))byId("cementShipmentTotal").textContent=String(visibleCount);
    if(byId("cementVehicleTotal"))byId("cementVehicleTotal").textContent=String(vehicleTotal);
    if(byId("cementTonnageTotal"))byId("cementTonnageTotal").textContent=fmt(tonnageTotal)+" ton";
  }

  function observeCurrentTable(){
    const tbody=byId("cementRows");
    if(!tbody||tbody.dataset.historyObserver==="1")return;
    tbody.dataset.historyObserver="1";
    const observer=new MutationObserver(()=>setTimeout(filterCurrentTable,0));
    observer.observe(tbody,{childList:true,subtree:true});
  }

  window.editPastCementShipment=editPastShipment;
  window.deletePastCementShipment=deletePastShipment;
  window.loadCementHistory=loadHistory;

  function init(){
    injectStyles();
    if(byId("cementPage")){injectUi();return;}
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(byId("cementPage")||tries>=50){
        clearInterval(timer);
        if(byId("cementPage"))injectUi();
      }
    },100);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();