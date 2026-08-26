(function(){
  "use strict";
  const LABELS={planlandi:"Planlandı",miktar_degisti:"Miktar Değişti",tamamlandi:"Tamamlandı",iptal:"İptal"};
  const TABLES={concrete:"sevkiyatlar",cement:"cimento_sevkiyatlar"};
  const escape=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const fmt=value=>Number(value||0).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});
  const client=()=>typeof window.ensureDb==="function"?window.ensureDb():null;
  function styles(){if(document.getElementById("shipmentStatusStyles"))return;const style=document.createElement("style");style.id="shipmentStatusStyles";style.textContent=`.shipment-status-cell{min-width:182px}.shipment-status-select{width:100%;min-width:148px;border:1px solid rgba(103,52,189,.22);border-radius:9px;padding:6px 8px;background:#fff;color:#202633;font:inherit;font-weight:700}.shipment-status-select[data-status="miktar_degisti"]{background:#fff4d6;color:#8a5a00}.shipment-status-select[data-status="tamamlandi"]{background:#e5f7ed;color:#167a4d}.shipment-status-select[data-status="iptal"]{background:#ffe8e5;color:#b42318}.shipment-amount-change{display:grid;gap:2px;margin-top:6px;padding:6px 8px;border-radius:8px;background:#fff8e8;color:#6e4b00;font-size:11px;line-height:1.25;white-space:nowrap}.shipment-amount-change strong{color:#3d2b00}.shipment-row-cancelled td{opacity:.68}.shipment-row-cancelled td:not(.shipment-status-cell){text-decoration:line-through}@media(max-width:700px){.shipment-status-cell{min-width:174px}.shipment-status-select{min-width:140px}}`;document.head.appendChild(style)}
  function options(selected){return Object.entries(LABELS).map(([value,label])=>`<option value="${value}"${value===selected?" selected":""}>${escape(label)}</option>`).join("")}
  function amountChange(record,type){const plannedKey=type==="concrete"?"planlanan_metraj":"planlanan_tonaj",currentKey=type==="concrete"?"metraj":"toplam_tonaj",unit=type==="concrete"?"m³":"ton",planned=record?.[plannedKey],current=record?.[currentKey];if(planned==null||current==null||Math.abs(Number(planned)-Number(current))<.001)return"";const difference=Number(current)-Number(planned),sign=difference>0?"+":"";return `<div class="shipment-amount-change"><span>İlk: ${fmt(planned)} ${unit}</span><strong>Güncel: ${fmt(current)} ${unit}</strong><span>Fark: ${sign}${fmt(difference)} ${unit}</span></div>`}
  async function decorate(){const db=client(),view=document.getElementById("recordsCombinedView");if(!db||!view)return;const [concreteResult,cementResult]=await Promise.all([db.from(TABLES.concrete).select("id,durum,planlanan_metraj,metraj"),db.from(TABLES.cement).select("id,durum,tamamlandi,planlanan_tonaj,toplam_tonaj")]);const maps={concrete:new Map((concreteResult.data||[]).map(r=>[String(r.id),{...r,durum:r.durum||"planlandi"}])),cement:new Map((cementResult.data||[]).map(r=>[String(r.id),{...r,durum:r.durum||(r.tamamlandi?"tamamlandi":"planlandi")}]))};view.querySelectorAll('.rc-block').forEach(section=>{const type=/Çimento/i.test(section.querySelector("h3")?.textContent||"")?"cement":"concrete";section.querySelectorAll("tbody tr").forEach(row=>{if(row.querySelector('.shipment-status-cell'))return;const code=row.querySelector(".rc-edit")?.getAttribute("onclick")||"",id=code.match(/\('([^']+)'\)/)?.[1];if(!id)return;const record=maps[type].get(String(id))||{durum:"planlandi"},status=record.durum;const cell=document.createElement("td");cell.className="shipment-status-cell";cell.innerHTML=`<select class="shipment-status-select" data-status="${escape(status)}" aria-label="Sevkiyat durumu">${options(status)}</select>${amountChange(record,type)}`;row.lastElementChild?.before(cell);row.classList.toggle("shipment-row-cancelled",status==="iptal");cell.querySelector("select").addEventListener("change",event=>update(type,id,event.target))});const header=section.querySelector("thead tr");if(header&&!header.querySelector('.shipment-status-head')){const th=document.createElement("th");th.className="shipment-status-head";th.textContent="Durum";header.lastElementChild?.before(th)};recalculate(section,type)})}
  function trNumber(value){const cleaned=String(value||"").replace(/[^0-9,.-]/g,"").replace(/\./g,"").replace(",",".");return Number(cleaned)||0}
  function recalculate(section,type){const rows=[...section.querySelectorAll("tbody tr")].filter(row=>!row.classList.contains("shipment-row-cancelled")),total=section.querySelector(".rc-total");if(!total)return;if(type==="concrete"){const amount=rows.reduce((sum,row)=>sum+trNumber(row.children[7]?.textContent),0);total.innerHTML=`<span>BETON SEVKİYATI: ${rows.length}</span><span>GENEL BETON: ${amount.toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2})} m³</span>`}else{const vehicles=rows.reduce((sum,row)=>sum+Number(row.children[4]?.textContent||0),0),tons=rows.reduce((sum,row)=>sum+trNumber(row.children[5]?.textContent),0),pending=rows.filter(row=>/^-|bekleniyor/i.test(row.children[5]?.textContent.trim()||"")).length;total.innerHTML=`<span>ÇİMENTO SEVKİYATI: ${rows.length}</span><span>TOPLAM ARAÇ: ${vehicles}</span><span>TOPLAM TONAJ: ${tons.toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2})} ton</span>${pending?`<span>TONAJ BEKLEYEN: ${pending}</span>`:""}`}}
  async function update(type,id,select){const db=client(),table=TABLES[type],next=select.value,previous=select.dataset.status||"planlandi";if(!db||!table)return;select.disabled=true;const payload={durum:next};if(type==="cement")payload.tamamlandi=next==="tamamlandi";const {error}=await db.from(table).update(payload).eq("id",id);select.disabled=false;if(error){select.value=previous;alert("Durum güncellenemedi: "+error.message);return}select.dataset.status=next;select.closest("tr")?.classList.toggle("shipment-row-cancelled",next==="iptal");if(typeof window.loadRecords==="function")await window.loadRecords();if(typeof window.loadCementShipments==="function")await window.loadCementShipments();if(typeof window.refreshRecordsCombined==="function")await window.refreshRecordsCombined()}
  function init(){styles();document.addEventListener("betonexa:records-rendered",decorate);document.addEventListener("change",event=>{const select=event.target.closest?.(".shipment-status-select[data-shipment-type][data-shipment-id]");if(select)update(select.dataset.shipmentType,select.dataset.shipmentId,select)});decorate()}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();

(function fixCombinedCementEdit(){
  "use strict";
  if(window.__betonexaCombinedCementEditFix)return;
  window.__betonexaCombinedCementEditFix=true;
  const $=id=>document.getElementById(id);
  const db=()=>typeof window.ensureDb==="function"?window.ensureDb():null;
  const label=value=>window.BetonexaNames?.label?window.BetonexaNames.label(value):String(value??"").trim();
  const status=(message,isError=false)=>{const el=$("cementStatus");if(!el)return;el.textContent=message||"";el.style.color=isError?"var(--danger)":"var(--success)";};

  async function openEdit(id){
    const cementBtn=$("cementTabBtn")||document.querySelector('.tabs [data-page="cement"]');
    cementBtn?.click();
    const c=db();
    if(!c){status("Veritabanı bağlantısı yüklenemedi.",true);return;}
    status("Sevkiyat bilgileri yükleniyor…");
    const {data,error}=await c.from("cimento_sevkiyatlar").select("*").eq("id",id).limit(1);
    if(error){status("Çimento sevkiyatı alınamadı: "+error.message,true);return;}
    const r=(data||[])[0];
    if(!r){status("Düzenlenecek çimento sevkiyatı bulunamadı.",true);return;}
    window.__cementCombinedEdit=true;
    window.__cementPendingEditId=String(r.id);
    if($("cementDate"))$("cementDate").value=r.tarih||"";
    if($("cementCompany"))$("cementCompany").value=r.firma||"";
    if($("cementDelivery"))$("cementDelivery").value=r.teslim_yeri||"";
    if($("cementVehicleCount"))$("cementVehicleCount").value=r.arac_sayisi??"";
    if($("cementTonnage"))$("cementTonnage").value=r.toplam_tonaj==null?"0":r.toplam_tonaj;
    if($("cementSaveBtn"))$("cementSaveBtn").textContent="Değişiklikleri Kaydet";
    $("cementCancelBtn")?.classList.remove("hidden");
    status("");
    $("cementPage")?.scrollIntoView({behavior:"smooth",block:"start"});
  }

  async function saveCombinedEdit(event){
    if(!window.__cementCombinedEdit||!window.__cementPendingEditId)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const tarih=$("cementDate")?.value||"";
    const firma=label($("cementCompany")?.value);
    const teslimYeri=label($("cementDelivery")?.value);
    const aracSayisi=Number($("cementVehicleCount")?.value);
    const raw=String($("cementTonnage")?.value??"").trim();
    let toplamTonaj;
    if(raw==="-"||raw==="0"||raw==="0,00"||raw==="0.00")toplamTonaj=null;
    else toplamTonaj=Number(raw.replace(",","."));
    if(!tarih||!firma||!teslimYeri||!Number.isInteger(aracSayisi)||aracSayisi<1||(toplamTonaj!==null&&(!Number.isFinite(toplamTonaj)||toplamTonaj<=0))){status("Tarih, firma, teslim yeri ve araç sayısını kontrol et. Tonaj bilinmiyorsa 0 girebilirsin.",true);return;}
    const c=db();if(!c){status("Veritabanı bağlantısı yüklenemedi.",true);return;}
    const save=$("cementSaveBtn");if(save)save.disabled=true;
    status("Güncelleniyor…");
    const id=window.__cementPendingEditId;
    const payload={tarih,firma,teslim_yeri:teslimYeri,arac_sayisi:aracSayisi,toplam_tonaj:toplamTonaj};
    const {error}=await c.from("cimento_sevkiyatlar").update(payload).eq("id",id);
    if(save)save.disabled=false;
    if(error){status("Çimento sevkiyatı güncellenemedi: "+error.message,true);return;}
    window.__cementCombinedEdit=false;
    window.__cementPendingEditId=null;
    $("cementCancelBtn")?.click();
    if(typeof window.loadCementShipments==="function")try{await window.loadCementShipments();}catch(e){}
    if(typeof window.refreshRecordsCombined==="function")try{await window.refreshRecordsCombined();}catch(e){}
    status("Çimento sevkiyatı güncellendi.");
  }

  document.addEventListener("click",event=>{
    const edit=event.target.closest?.("#recordsCombinedView .rc-edit");
    if(edit&&/editCementFromCombined/.test(edit.getAttribute("onclick")||"")){
      const id=(edit.getAttribute("onclick")||"").match(/'([^']+)'/)?.[1];
      if(!id)return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openEdit(id);
      return;
    }
    if(event.target.closest?.("#cementSaveBtn"))saveCombinedEdit(event);
    if(event.target.closest?.("#cementCancelBtn")){window.__cementCombinedEdit=false;window.__cementPendingEditId=null;}
  },true);
})();
