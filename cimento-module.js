(function(){
  "use strict";

  const CEMENT_TABLE="cimento_sevkiyatlar";
  let cementRecords=[];
  let cementEditId=null;

  const byId=id=>document.getElementById(id);
  const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const fmtNumber=value=>Number(value||0).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});
  const todayIso=()=>{
    const d=new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };
  const formatDate=value=>{
    if(!value)return "";
    const d=new Date(value+"T00:00:00");
    const day=d.toLocaleDateString("tr-TR",{weekday:"long"});
    const date=value.split("-").reverse().join(".");
    return `${date} · ${day.charAt(0).toLocaleUpperCase("tr-TR")+day.slice(1)}`;
  };
  const sentenceCase=value=>{
    const raw=String(value??"").trim();
    if(!raw)return "";
    const lower=raw.toLocaleLowerCase("tr-TR");
    return lower.charAt(0).toLocaleUpperCase("tr-TR")+lower.slice(1);
  };

  function db(){
    if(typeof window.ensureDb==="function")return window.ensureDb();
    return null;
  }

  function injectStyles(){
    if(byId("cementModuleStyles"))return;
    const style=document.createElement("style");
    style.id="cementModuleStyles";
    style.textContent=`
      #cementPage .cement-head{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:16px}
      #cementPage .cement-head h2{margin:0 0 4px}
      #cementPage .cement-form{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;align-items:end;margin-bottom:16px}
      #cementPage .cement-field{display:flex;flex-direction:column;gap:6px;min-width:0}
      #cementPage .cement-field label{font-size:12px;font-weight:700;color:var(--muted)}
      #cementPage .cement-field input{width:100%;height:44px;border:1px solid rgba(103,52,189,.20);border-radius:12px;padding:8px 10px;background:rgba(255,255,255,.74);color:var(--ink);font:inherit}
      #cementPage .cement-actions{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 18px}
      #cementPage .cement-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:12px 0 16px}
      #cementPage .cement-summary-card{background:rgba(255,255,255,.58);border:1px solid rgba(103,52,189,.12);border-radius:14px;padding:14px 16px}
      #cementPage .cement-summary-card small{display:block;color:var(--muted);font-weight:700;margin-bottom:6px}
      #cementPage .cement-summary-card strong{font-size:22px}
      #cementPage .cement-table-wrap{overflow:auto;border-radius:14px}
      #cementPage table{width:100%;border-collapse:collapse;min-width:820px}
      #cementPage th,#cementPage td{padding:10px 9px;border-bottom:1px solid rgba(103,52,189,.10);text-align:left;vertical-align:middle}
      #cementPage th{font-size:12px;color:var(--muted);white-space:nowrap}
      #cementPage tbody tr:nth-child(odd){background:rgba(255,255,255,.34)}
      #cementPage tbody tr:nth-child(even){background:rgba(255,255,255,.56)}
      #cementPage .cement-row-actions{display:flex;gap:6px;white-space:nowrap}
      #cementPage .cement-status{min-height:22px;font-size:13px;font-weight:700;margin:2px 0 8px}
      #cementPage .cement-empty{padding:24px;text-align:center;color:var(--muted)}
      @media(max-width:900px){#cementPage .cement-form{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:700px){
        #cementPage .cement-form{grid-template-columns:1fr 1fr;gap:10px}
        #cementPage .cement-field:first-child{grid-column:1 / -1}
        #cementPage .cement-summary{grid-template-columns:1fr;gap:9px}
        #cementPage .cement-summary-card{padding:12px 14px}
        #cementPage .cement-summary-card strong{font-size:20px}
      }
    `;
    document.head.appendChild(style);
  }

  function injectUi(){
    const nav=document.querySelector(".tabs");
    const recordsPage=byId("recordsPage");
    if(!nav||!recordsPage||byId("cementPage"))return;

    const button=document.createElement("button");
    button.type="button";
    button.className="btn btn-light";
    button.dataset.page="cement";
    button.id="cementTabBtn";
    button.textContent="🏗️ Çimento";

    const tomorrowBtn=nav.querySelector('[data-page="tomorrow"]');
    nav.insertBefore(button,tomorrowBtn||null);

    const page=document.createElement("section");
    page.id="cementPage";
    page.className="panel hidden";
    page.innerHTML=`
      <div class="cement-head">
        <div>
          <h2>🏗️ Çimento Sevkiyatları</h2>
          <small>Güncel çimento sevkiyatlarını araç adedi ve toplam tonaj ile takip et.</small>
        </div>
        <button id="cementRefreshBtn" type="button" class="btn btn-light">Yenile</button>
      </div>

      <div class="cement-form">
        <div class="cement-field"><label>Tarih</label><input id="cementDate" type="date" required></div>
        <div class="cement-field"><label>Firma</label><input id="cementCompany" type="text" placeholder="Firma adı" required></div>
        <div class="cement-field"><label>Teslim yeri</label><input id="cementDelivery" type="text" placeholder="Teslim yeri" required></div>
        <div class="cement-field"><label>Araç sayısı</label><input id="cementVehicleCount" type="number" min="1" step="1" inputmode="numeric" placeholder="0" required></div>
        <div class="cement-field"><label>Toplam tonaj</label><input id="cementTonnage" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0,00" required></div>
      </div>

      <div class="cement-actions">
        <button id="cementSaveBtn" type="button" class="btn btn-primary">Çimento Sevkiyatını Kaydet</button>
        <button id="cementCancelBtn" type="button" class="btn btn-light hidden">Düzenlemeyi İptal Et</button>
      </div>
      <div id="cementStatus" class="cement-status"></div>

      <div class="cement-summary">
        <div class="cement-summary-card"><small>GÜNCEL SEVKİYAT</small><strong id="cementShipmentTotal">0</strong></div>
        <div class="cement-summary-card"><small>TOPLAM ARAÇ</small><strong id="cementVehicleTotal">0</strong></div>
        <div class="cement-summary-card"><small>TOPLAM TONAJ</small><strong id="cementTonnageTotal">0,00 ton</strong></div>
      </div>

      <div class="cement-table-wrap">
        <table>
          <thead><tr><th>No</th><th>Tarih</th><th>Firma</th><th>Teslim Yeri</th><th>Araç</th><th>Tonaj</th><th>İşlem</th></tr></thead>
          <tbody id="cementRows"></tbody>
        </table>
      </div>
    `;
    recordsPage.insertAdjacentElement("afterend",page);

    button.addEventListener("click",()=>showCementPage());
    nav.addEventListener("click",event=>{
      const target=event.target.closest("button[data-page]");
      if(!target||target.dataset.page==="cement")return;
      page.classList.add("hidden");
      button.classList.remove("active");
    });

    byId("cementSaveBtn").addEventListener("click",saveCementShipment);
    byId("cementCancelBtn").addEventListener("click",clearCementForm);
    byId("cementRefreshBtn").addEventListener("click",loadCementShipments);
    byId("cementDate").value=todayIso();
  }

  function showCementPage(){
    document.querySelectorAll("main.content > section.panel").forEach(section=>section.classList.add("hidden"));
    document.querySelectorAll(".tabs button").forEach(btn=>btn.classList.remove("active"));
    byId("cementPage").classList.remove("hidden");
    byId("cementTabBtn").classList.add("active");
    loadCementShipments();
  }

  function setCementStatus(message,isError=false){
    const el=byId("cementStatus");
    if(!el)return;
    el.textContent=message||"";
    el.style.color=isError?"var(--danger)":"var(--success)";
  }

  async function loadCementShipments(){
    const client=db();
    if(!client){
      setCementStatus("Veritabanı bağlantısı yüklenemedi.",true);
      return;
    }
    setCementStatus("Yükleniyor…");
    const {data,error}=await client
      .from(CEMENT_TABLE)
      .select("*")
      .eq("tamamlandi",false)
      .order("tarih",{ascending:true})
      .order("created_at",{ascending:true});
    if(error){
      setCementStatus("Çimento kayıtları alınamadı: "+error.message,true);
      cementRecords=[];
      renderCementRows();
      return;
    }
    cementRecords=data||[];
    setCementStatus("");
    renderCementRows();
  }

  function renderCementRows(){
    const rows=byId("cementRows");
    if(!rows)return;
    if(!cementRecords.length){
      rows.innerHTML='<tr><td colspan="7" class="cement-empty">Güncel çimento sevkiyatı bulunmuyor.</td></tr>';
    }else{
      rows.innerHTML=cementRecords.map((record,index)=>`
        <tr>
          <td>${index+1}</td>
          <td>${escapeHtml(formatDate(record.tarih))}</td>
          <td>${escapeHtml(sentenceCase(record.firma))}</td>
          <td>${escapeHtml(sentenceCase(record.teslim_yeri))}</td>
          <td>${Number(record.arac_sayisi||0)}</td>
          <td>${fmtNumber(record.toplam_tonaj)} ton</td>
          <td><div class="cement-row-actions">
            <button type="button" class="icon-action edit" title="Düzenle" onclick="window.editCementShipment('${record.id}')">✏️</button>
            <button type="button" class="btn btn-light" title="Tamamlandı" onclick="window.completeCementShipment('${record.id}')">✓</button>
            <button type="button" class="icon-action delete" title="Sil" onclick="window.deleteCementShipment('${record.id}')">🗑️</button>
          </div></td>
        </tr>
      `).join("");
    }

    byId("cementShipmentTotal").textContent=String(cementRecords.length);
    byId("cementVehicleTotal").textContent=String(cementRecords.reduce((sum,r)=>sum+Number(r.arac_sayisi||0),0));
    byId("cementTonnageTotal").textContent=fmtNumber(cementRecords.reduce((sum,r)=>sum+Number(r.toplam_tonaj||0),0))+" ton";
  }

  function clearCementForm(){
    cementEditId=null;
    byId("cementDate").value=todayIso();
    byId("cementCompany").value="";
    byId("cementDelivery").value="";
    byId("cementVehicleCount").value="";
    byId("cementTonnage").value="";
    byId("cementSaveBtn").textContent="Çimento Sevkiyatını Kaydet";
    byId("cementCancelBtn").classList.add("hidden");
    setCementStatus("");
  }

  async function saveCementShipment(){
    const tarih=byId("cementDate").value;
    const firma=sentenceCase(byId("cementCompany").value);
    const teslimYeri=sentenceCase(byId("cementDelivery").value);
    const aracSayisi=Number(byId("cementVehicleCount").value);
    const toplamTonaj=Number(String(byId("cementTonnage").value).replace(",","."));

    if(!tarih||!firma||!teslimYeri||!Number.isInteger(aracSayisi)||aracSayisi<1||!Number.isFinite(toplamTonaj)||toplamTonaj<=0){
      setCementStatus("Tarih, firma, teslim yeri, araç sayısı ve toplam tonaj bilgilerini eksiksiz doldur.",true);
      return;
    }

    const client=db();
    if(!client){setCementStatus("Veritabanı bağlantısı yüklenemedi.",true);return;}

    const payload={
      tarih,
      firma,
      teslim_yeri:teslimYeri,
      arac_sayisi:aracSayisi,
      toplam_tonaj:toplamTonaj,
      tamamlandi:false
    };

    byId("cementSaveBtn").disabled=true;
    setCementStatus("Kaydediliyor…");
    const query=cementEditId
      ? client.from(CEMENT_TABLE).update(payload).eq("id",cementEditId)
      : client.from(CEMENT_TABLE).insert(payload);
    const {error}=await query;
    byId("cementSaveBtn").disabled=false;

    if(error){
      setCementStatus("Çimento sevkiyatı kaydedilemedi: "+error.message,true);
      return;
    }

    clearCementForm();
    setCementStatus(cementEditId?"Çimento sevkiyatı güncellendi.":"Çimento sevkiyatı kaydedildi.");
    await loadCementShipments();
  }

  function editCementShipment(id){
    const record=cementRecords.find(r=>String(r.id)===String(id));
    if(!record)return;
    cementEditId=record.id;
    byId("cementDate").value=record.tarih||todayIso();
    byId("cementCompany").value=record.firma||"";
    byId("cementDelivery").value=record.teslim_yeri||"";
    byId("cementVehicleCount").value=record.arac_sayisi??"";
    byId("cementTonnage").value=record.toplam_tonaj??"";
    byId("cementSaveBtn").textContent="Değişiklikleri Kaydet";
    byId("cementCancelBtn").classList.remove("hidden");
    byId("cementPage").scrollIntoView({behavior:"smooth",block:"start"});
  }

  async function completeCementShipment(id){
    if(!confirm("Bu çimento sevkiyatı tamamlandı olarak işaretlensin mi?"))return;
    const client=db();
    if(!client)return;
    const {error}=await client.from(CEMENT_TABLE).update({tamamlandi:true}).eq("id",id);
    if(error){setCementStatus("Sevkiyat tamamlanamadı: "+error.message,true);return;}
    setCementStatus("Sevkiyat tamamlandı ve güncel listeden kaldırıldı.");
    await loadCementShipments();
  }

  async function deleteCementShipment(id){
    if(!confirm("Bu çimento sevkiyatı kalıcı olarak silinsin mi?"))return;
    const client=db();
    if(!client)return;
    const {error}=await client.from(CEMENT_TABLE).delete().eq("id",id);
    if(error){setCementStatus("Sevkiyat silinemedi: "+error.message,true);return;}
    setCementStatus("Çimento sevkiyatı silindi.");
    await loadCementShipments();
  }

  window.editCementShipment=editCementShipment;
  window.completeCementShipment=completeCementShipment;
  window.deleteCementShipment=deleteCementShipment;
  window.loadCementShipments=loadCementShipments;

  function init(){
    injectStyles();
    injectUi();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
