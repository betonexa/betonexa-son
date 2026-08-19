(function(){
"use strict";
let cementRecords=[];
let cementMode="current";
const $c=id=>document.getElementById(id);
const todayIso=()=>new Date().toISOString().slice(0,10);
const tomorrowIso=()=>{const d=new Date();d.setDate(d.getDate()+1);return d.toISOString().slice(0,10)};
const trNum=n=>Number(n||0).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});
const cap=s=>(s||"").trim().toLocaleLowerCase("tr-TR").replace(/(^|[\s\-\/])([a-zçğıöşü])/g,(m,a,b)=>a+b.toLocaleUpperCase("tr-TR"));

function buildUi(){
  const tabs=document.querySelector(".tabs");
  const recordsTab=tabs?.querySelector('[data-page="records"]');
  if(tabs&&!tabs.querySelector('[data-page="cement"]')){
    const b=document.createElement("button");
    b.className="btn btn-light"; b.dataset.page="cement"; b.textContent="🧱 Çimento";
    recordsTab?.after(b);
  }
  if(!$c("cementPage")){
    const tomorrow=$c("tomorrowPage");
    if(!tomorrow)return;
    const s=document.createElement("section");
    s.id="cementPage"; s.className="panel hidden";
    s.innerHTML=`
      <div class="tomorrow-header"><div><h2>🧱 Çimento Sevkiyatları</h2><small>Çimento sevkiyatlarını araç ve tonaj bazında takip edin.</small></div>
      <div class="tomorrow-actions"><button id="cementCurrentBtn" class="btn btn-primary" type="button">Güncel Sevkiyatlar</button><button id="cementHistoryBtn" class="btn btn-light" type="button">Geçmiş Sevkiyatlar</button></div></div>
      <form id="cementForm" class="shipment-form" style="margin-top:18px"><div class="form-grid">
      <label>Tarih<input id="cementDate" type="date" required></label><label>Firma<input id="cementCompany" type="text" placeholder="Firma adı" required></label>
      <label>Teslim Yeri<input id="cementDelivery" type="text" placeholder="Teslim yeri" required></label><label>Araç Sayısı<input id="cementVehicles" type="number" min="1" step="1" required></label>
      <label>Toplam Tonaj<input id="cementTonnage" type="number" min="0.01" step="0.01" required></label><label>Not<input id="cementNote" type="text" placeholder="İsteğe bağlı"></label></div>
      <div class="form-actions" style="margin-top:12px"><button class="btn btn-primary" type="submit">Çimento Sevkiyatı Ekle</button><button id="cementRefreshBtn" class="btn btn-light" type="button">Yenile</button></div></form>
      <div id="cementStatus" class="muted" style="margin:12px 0"></div><div class="table-wrap"><table><thead><tr><th>Tarih</th><th>Firma</th><th>Teslim Yeri</th><th>Araç</th><th>Tonaj</th><th>Not</th><th>İşlem</th></tr></thead><tbody id="cementTableBody"></tbody></table></div><div id="cementTotals" class="total-box" style="margin-top:12px"></div>`;
    tomorrow.before(s);
  }
}

async function loadCement(){
  const client=ensureDb(),status=$c("cementStatus");
  if(!client){if(status)status.textContent="Veritabanı bağlantısı kurulamadı.";return}
  if(status)status.textContent="Yükleniyor…";
  const {data,error}=await client.from("cimento_sevkler").select("*").order("tarih",{ascending:false}).order("created_at",{ascending:false});
  if(error){if(status)status.textContent="Çimento tablosu henüz hazır değil. Supabase SQL kurulumu gerekli.";console.warn(error);return}
  cementRecords=data||[]; if(status)status.textContent=""; renderCement(); renderCementTomorrow();
}
function filteredCement(){const t=todayIso();return cementRecords.filter(r=>cementMode==="history"?r.tarih<t:r.tarih>=t)}
function renderCement(){
  const body=$c("cementTableBody"),totals=$c("cementTotals");if(!body||!totals)return;
  const rows=filteredCement();
  body.innerHTML=rows.length?rows.map(r=>`<tr><td>${esc(trDate(r.tarih))}</td><td>${esc(cap(r.firma))}</td><td>${esc(cap(r.teslim_yeri))}</td><td>${Number(r.arac_sayisi||0)}</td><td>${trNum(r.toplam_tonaj)} ton</td><td>${esc(r.notlar||"")}</td><td><button class="btn btn-danger btn-sm" type="button" data-cement-delete="${r.id}">Sil</button></td></tr>`).join(""):`<tr><td colspan="7" style="text-align:center;padding:18px">Kayıt yok.</td></tr>`;
  totals.textContent=`Toplam: ${rows.reduce((s,r)=>s+Number(r.arac_sayisi||0),0)} araç · ${trNum(rows.reduce((s,r)=>s+Number(r.toplam_tonaj||0),0))} ton`;
  $c("cementCurrentBtn")?.classList.toggle("btn-primary",cementMode==="current");$c("cementCurrentBtn")?.classList.toggle("btn-light",cementMode!=="current");
  $c("cementHistoryBtn")?.classList.toggle("btn-primary",cementMode==="history");$c("cementHistoryBtn")?.classList.toggle("btn-light",cementMode!=="history");
}
async function saveCement(e){
  e.preventDefault();const client=ensureDb();if(!client)return;
  const payload={tarih:$c("cementDate").value,firma:cap($c("cementCompany").value),teslim_yeri:cap($c("cementDelivery").value),arac_sayisi:Number($c("cementVehicles").value),toplam_tonaj:Number($c("cementTonnage").value),notlar:($c("cementNote").value||"").trim()};
  if(!payload.tarih||!payload.firma||!payload.teslim_yeri||payload.arac_sayisi<1||payload.toplam_tonaj<=0){alert("Lütfen tarih, firma, teslim yeri, araç sayısı ve toplam tonajı doldurun.");return}
  const {error}=await client.from("cimento_sevkler").insert(payload);if(error){alert("Çimento sevkiyatı kaydedilemedi: "+error.message);return}
  e.target.reset();$c("cementDate").value=todayIso();await loadCement();
}
async function deleteCement(id){if(!confirm("Bu çimento sevkiyatını silmek istediğinize emin misiniz?"))return;const client=ensureDb();if(!client)return;const {error}=await client.from("cimento_sevkler").delete().eq("id",id);if(error){alert("Silme işlemi başarısız: "+error.message);return}await loadCement()}
function tomorrowCementRows(){return cementRecords.filter(r=>r.tarih===tomorrowIso())}
function renderCementTomorrow(){
  const page=$c("tomorrowPage");if(!page)return;let block=$c("cementTomorrowBlock");if(!block){block=document.createElement("div");block.id="cementTomorrowBlock";block.style.marginTop="28px";page.appendChild(block)}
  const rows=tomorrowCementRows(),v=rows.reduce((s,r)=>s+Number(r.arac_sayisi||0),0),t=rows.reduce((s,r)=>s+Number(r.toplam_tonaj||0),0);
  block.innerHTML=`<div class="tomorrow-header"><div><h2>🧱 Yarınki Çimento Sevkiyatları</h2></div></div>${rows.length?`<div class="table-wrap"><table><thead><tr><th>Firma</th><th>Teslim Yeri</th><th>Araç</th><th>Toplam Tonaj</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(cap(r.firma))}</td><td>${esc(cap(r.teslim_yeri))}</td><td>${Number(r.arac_sayisi||0)}</td><td>${trNum(r.toplam_tonaj)} ton</td></tr>`).join("")}</tbody></table></div><div class="total-box" style="margin-top:12px">Çimento Toplamı: ${v} araç · ${trNum(t)} ton</div>`:`<div class="muted" style="padding:12px 0">Yarın için çimento sevkiyatı yok.</div>`}`;
}
async function downloadCombinedTomorrowPdf(){
  if(!window.jspdf){alert("PDF modülü yüklenemedi.");return}const concrete=groupTomorrow(),cement=tomorrowCementRows();if(!concrete.length&&!cement.length){alert("Yarın için sevkiyat yok.");return}
  const {jsPDF}=window.jspdf,doc=new jsPDF({orientation:"landscape"});let y=14;doc.setFontSize(16);doc.text("BETONEXA - YARINKI SEVKIYATLAR",14,y);y+=8;doc.setFontSize(10);doc.text(trDate(tomorrowDateString()),14,y);y+=6;
  if(concrete.length){doc.setFontSize(13);doc.text("BETON SEVKIYATLARI",14,y);y+=4;const body=[];concrete.forEach(([company,items])=>items.forEach(r=>body.push([company,(r.saat||"").slice(0,5),r.santral||"",r.santiye||"",r.beton_sinifi||"",metrajDisplay(r)+" m3"])));doc.autoTable({startY:y,head:[["Firma","Saat","Santral","Santiye","Beton","Metraj"]],body,styles:{fontSize:7}});y=doc.lastAutoTable.finalY+9}
  if(cement.length){if(y>180){doc.addPage();y=14}doc.setFontSize(13);doc.text("CIMENTO SEVKIYATLARI",14,y);y+=4;doc.autoTable({startY:y,head:[["Firma","Teslim Yeri","Arac","Toplam Tonaj"]],body:cement.map(r=>[cap(r.firma),cap(r.teslim_yeri),String(r.arac_sayisi||0),trNum(r.toplam_tonaj)+" ton"]),styles:{fontSize:8}})}
  doc.save(`Betonexa-Yarinki-Beton-Cimento-${tomorrowDateString()}.pdf`);
}
function downloadCombinedTomorrowExcel(){
  if(!window.XLSX){alert("Excel modülü yüklenemedi.");return}const wb=XLSX.utils.book_new(),concrete=tomorrowExportRows(),cement=tomorrowCementRows().map(r=>({"Firma":cap(r.firma),"Teslim Yeri":cap(r.teslim_yeri),"Araç Sayısı":Number(r.arac_sayisi||0),"Toplam Tonaj":Number(r.toplam_tonaj||0)}));if(!concrete.length&&!cement.length){alert("Yarın için sevkiyat yok.");return}
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(concrete.length?concrete:[{"Bilgi":"Beton sevkiyatı yok"}]),"Beton");XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(cement.length?cement:[{"Bilgi":"Çimento sevkiyatı yok"}]),"Çimento");XLSX.writeFile(wb,`Betonexa-Yarinki-Beton-Cimento-${tomorrowDateString()}.xlsx`);
}
function printCombinedTomorrow(){const concrete=groupTomorrow(),cement=tomorrowCementRows();if(!concrete.length&&!cement.length){alert("Yarın için sevkiyat yok.");return}let beton="";concrete.forEach(([company,items])=>{beton+=`<h3>${esc(company)}</h3><table><thead><tr><th>Saat</th><th>Santral</th><th>Şantiye</th><th>Beton</th><th>Metraj</th></tr></thead><tbody>${items.map(r=>`<tr><td>${esc((r.saat||"").slice(0,5))}</td><td>${esc(r.santral)}</td><td>${esc(r.santiye)}</td><td>${esc(r.beton_sinifi)}</td><td>${metrajDisplay(r)} m³</td></tr>`).join("")}</tbody></table>`});const cimento=cement.length?`<h2>Çimento Sevkiyatları</h2><table><thead><tr><th>Firma</th><th>Teslim Yeri</th><th>Araç</th><th>Toplam Tonaj</th></tr></thead><tbody>${cement.map(r=>`<tr><td>${esc(cap(r.firma))}</td><td>${esc(cap(r.teslim_yeri))}</td><td>${Number(r.arac_sayisi||0)}</td><td>${trNum(r.toplam_tonaj)} ton</td></tr>`).join("")}</tbody></table>`:"";const w=window.open("","_blank");w.document.write(`<html><head><title>Yarınki Sevkiyatlar</title><style>body{font-family:Arial;padding:20px}h2{color:#5d2eae}table{width:100%;border-collapse:collapse;margin-bottom:22px;font-size:10px}th,td{border:1px solid #aaa;padding:6px}th{background:#6f42c1;color:#fff}</style></head><body><h1>Yarınki Sevkiyatlar - ${trDate(tomorrowDateString())}</h1><h2>Beton Sevkiyatları</h2>${beton||"<p>Beton sevkiyatı yok.</p>"}${cimento}</body></html>`);w.document.close();w.focus();setTimeout(()=>w.print(),300)}
function replaceTomorrowButtons(){[["tomorrowPdfBtn",downloadCombinedTomorrowPdf],["tomorrowExcelBtn",downloadCombinedTomorrowExcel],["tomorrowPrintBtn",printCombinedTomorrow]].forEach(([id,handler])=>{const old=$c(id);if(!old||old.dataset.cementCombined)return;const neo=old.cloneNode(true);neo.dataset.cementCombined="1";old.replaceWith(neo);neo.addEventListener("click",handler)})}
function openCementPage(){["dashboardPage","tomorrowPage","recordsPage","calendarPage","analysisPage","contractsPage","settingsPage"].forEach(id=>$c(id)?.classList.add("hidden"));$c("cementPage")?.classList.remove("hidden");document.querySelectorAll(".tabs button").forEach(b=>b.classList.toggle("active",b.dataset.page==="cement"));loadCement()}
function init(){buildUi();const tab=document.querySelector('.tabs button[data-page="cement"]');if(tab)tab.addEventListener("click",openCementPage);document.querySelectorAll('.tabs button:not([data-page="cement"])').forEach(b=>b.addEventListener("click",()=>{$c("cementPage")?.classList.add("hidden")},true));$c("cementForm")?.addEventListener("submit",saveCement);$c("cementRefreshBtn")?.addEventListener("click",loadCement);$c("cementCurrentBtn")?.addEventListener("click",()=>{cementMode="current";renderCement()});$c("cementHistoryBtn")?.addEventListener("click",()=>{cementMode="history";renderCement()});$c("cementTableBody")?.addEventListener("click",e=>{const id=e.target?.dataset?.cementDelete;if(id)deleteCement(id)});document.querySelector('.tabs button[data-page="tomorrow"]')?.addEventListener("click",()=>{loadCement();setTimeout(renderCementTomorrow,0)});if($c("cementDate"))$c("cementDate").value=todayIso();replaceTomorrowButtons()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
