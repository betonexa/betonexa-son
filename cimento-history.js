(function(){
  "use strict";
  const TABLE="cimento_sevkiyatlar";
  const $=id=>document.getElementById(id);
  const db=()=>typeof window.ensureDb==="function"?window.ensureDb():null;
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const fmt=v=>Number(v||0).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});
  const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const title=v=>String(v??"").trim().replace(/\s+/g," ").toLocaleLowerCase("tr-TR").replace(/(^|[\s\-\/])([\p{L}])/gu,(m,a,b)=>a+b.toLocaleUpperCase("tr-TR"));
  const trDate=v=>{if(!v)return"";const d=new Date(v+"T00:00:00"),day=d.toLocaleDateString("tr-TR",{weekday:"long"});return `${v.split("-").reverse().join(".")} · ${day.charAt(0).toLocaleUpperCase("tr-TR")+day.slice(1)}`};
  let all=[], editId=null;

  function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
  function monday(d){const x=new Date(d),day=(x.getDay()+6)%7;x.setDate(x.getDate()-day);x.setHours(0,0,0,0);return x}
  function bounds(){const mode=$("cementRange")?.value||"all",ref=$("cementFilterDate")?.value||iso(new Date()),d=new Date(ref+"T00:00:00");if(mode==="all")return {start:null,end:null};if(mode==="daily")return {start:ref,end:ref};if(mode==="weekly"){const s=monday(d);return {start:iso(s),end:iso(addDays(s,6))}}const start=ref.slice(0,7)+"-01",f=new Date(start+"T00:00:00"),e=new Date(f.getFullYear(),f.getMonth()+1,0);return {start,end:iso(e)}}
  function filtered(){const b=bounds();return all.filter(r=>!b.start||(r.tarih>=b.start&&r.tarih<=b.end))}

  function inject(){const page=$("cementPage");if(!page||$("cementFilters"))return false;
    const head=page.querySelector(".cement-head small");if(head)head.textContent="Tüm çimento sevkiyatlarını günlük, haftalık, aylık veya tümü olarak takip et.";
    const oldHistory=$("cementHistoryBtn");if(oldHistory)oldHistory.remove();const oldPanel=$("cementHistoryPanel");if(oldPanel)oldPanel.remove();
    const summary=page.querySelector(".cement-summary");if(summary){const first=summary.querySelector("small");if(first)first.textContent="SEVKİYAT";const bar=document.createElement("div");bar.id="cementFilters";bar.innerHTML=`<label>Dönem <select id="cementRange"><option value="daily">Günlük</option><option value="weekly">Haftalık</option><option value="monthly">Aylık</option><option value="all" selected>Tümü</option></select></label><label id="cementFilterDateWrap">Referans tarihi <input id="cementFilterDate" type="date"></label>`;summary.parentNode.insertBefore(bar,summary);$("cementFilterDate").value=iso(new Date());$("cementRange").addEventListener("change",()=>{updateDateVisibility();render()});$("cementFilterDate").addEventListener("change",render);updateDateVisibility();}
    const st=document.createElement("style");st.id="cementUnifiedStyles";st.textContent=`#cementFilters{display:flex;gap:10px;align-items:end;flex-wrap:wrap;margin:4px 0 14px}#cementFilters label{font-size:12px;font-weight:700;color:var(--muted);display:flex;flex-direction:column;gap:5px}#cementFilters select,#cementFilters input{height:40px;border:1px solid rgba(103,52,189,.2);border-radius:10px;padding:7px 10px;background:rgba(255,255,255,.75);color:var(--ink);font:inherit}#cementPage .cement-row-actions .btn{padding:6px 9px}#cementPage .cement-table-wrap{margin-top:4px}`;document.head.appendChild(st);return true;
  }
  function updateDateVisibility(){const w=$("cementFilterDateWrap");if(w)w.style.display=$("cementRange")?.value==="all"?"none":"flex"}

  async function loadAll(){const client=db();if(!client)return;const status=$("cementStatus");if(status)status.textContent="Yükleniyor…";const {data,error}=await client.from(TABLE).select("*").order("tarih",{ascending:false}).order("created_at",{ascending:false});if(error){if(status){status.textContent="Çimento kayıtları alınamadı: "+error.message;status.style.color="var(--danger)"}return}all=data||[];if(status)status.textContent="";render()}
  function render(){const rows=$("cementRows");if(!rows)return;const items=filtered();rows.innerHTML=items.length?items.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(trDate(r.tarih))}</td><td>${esc(title(r.firma))}</td><td>Şantiye</td><td>${Number(r.arac_sayisi||0)}</td><td>${r.toplam_tonaj==null?"-":fmt(r.toplam_tonaj)+" ton"}</td><td><div class="cement-row-actions"><button type="button" class="icon-action edit" title="Düzenle" data-cement-edit="${esc(r.id)}">✏️</button><button type="button" class="icon-action delete" title="Sil" data-cement-delete="${esc(r.id)}">🗑️</button></div></td></tr>`).join(""):'<tr><td colspan="7" class="cement-empty">Seçilen dönemde çimento sevkiyatı bulunmuyor.</td></tr>';
    if($("cementShipmentTotal"))$("cementShipmentTotal").textContent=String(items.length);if($("cementVehicleTotal"))$("cementVehicleTotal").textContent=String(items.reduce((s,r)=>s+Number(r.arac_sayisi||0),0));if($("cementTonnageTotal"))$("cementTonnageTotal").textContent=fmt(items.reduce((s,r)=>s+(r.toplam_tonaj==null?0:Number(r.toplam_tonaj||0)),0))+" ton";
  }
  function startEdit(id){const r=all.find(x=>String(x.id)===String(id));if(!r)return;editId=r.id;$("cementDate").value=r.tarih||iso(new Date());$("cementCompany").value=r.firma||"";$("cementDelivery").value="Şantiye";$("cementVehicleCount").value=r.arac_sayisi??"";$("cementTonnage").value=r.toplam_tonaj==null?"0":r.toplam_tonaj;$("cementSaveBtn").textContent="Değişiklikleri Kaydet";$("cementCancelBtn").classList.remove("hidden");$("cementPage").scrollIntoView({behavior:"smooth",block:"start"})}
  function cancelEdit(){editId=null}
  async function saveEdit(e){if(!editId)return;e.preventDefault();e.stopImmediatePropagation();const raw=String($("cementTonnage").value||"").trim(),number=raw===""?NaN:Number(raw.replace(",",".")),ton=number===0?null:number,vehicle=Number($("cementVehicleCount").value),payload={tarih:$("cementDate").value,firma:title($("cementCompany").value),teslim_yeri:"Şantiye",arac_sayisi:vehicle,toplam_tonaj:ton};if(!payload.tarih||!payload.firma||!Number.isInteger(vehicle)||vehicle<1||(ton!==null&&(!Number.isFinite(ton)||ton<=0))){const s=$("cementStatus");if(s){s.textContent="Tarih, firma ve araç sayısını kontrol et. Tonaj bilinmiyorsa 0 girebilirsin.";s.style.color="var(--danger)"}return}const client=db();if(!client)return;const {error}=await client.from(TABLE).update(payload).eq("id",editId);if(error){alert("Kayıt güncellenemedi: "+error.message);return}editId=null;$("cementSaveBtn").textContent="Çimento Sevkiyatını Kaydet";$("cementCancelBtn").classList.add("hidden");$("cementCompany").value="";$("cementDelivery").value="";$("cementVehicleCount").value="";$("cementTonnage").value="";await loadAll()}
  async function remove(id){if(!confirm("Bu çimento sevkiyatı kalıcı olarak silinsin mi?"))return;const client=db();if(!client)return;const {error}=await client.from(TABLE).delete().eq("id",id);if(error){alert("Kayıt silinemedi: "+error.message);return}await loadAll()}
  function bind(){const rows=$("cementRows");if(rows&&!rows.dataset.unifiedBound){rows.dataset.unifiedBound="1";rows.addEventListener("click",e=>{const ed=e.target.closest("[data-cement-edit]");if(ed){startEdit(ed.dataset.cementEdit);return}const del=e.target.closest("[data-cement-delete]");if(del)remove(del.dataset.cementDelete)})}const save=$("cementSaveBtn");if(save&&!save.dataset.unifiedEditBound){save.dataset.unifiedEditBound="1";save.addEventListener("click",saveEdit,true)}const cancel=$("cementCancelBtn");if(cancel&&!cancel.dataset.unifiedEditBound){cancel.dataset.unifiedEditBound="1";cancel.addEventListener("click",cancelEdit,true)}const refresh=$("cementRefreshBtn");if(refresh&&!refresh.dataset.unifiedBound){refresh.dataset.unifiedBound="1";refresh.addEventListener("click",()=>setTimeout(loadAll,50))}document.querySelector(".tabs")?.addEventListener("click",e=>{if(e.target.closest('[data-page="cement"]'))setTimeout(loadAll,120)})}
  function init(){let n=0,t=setInterval(()=>{n++;if($("cementPage")){clearInterval(t);inject();bind();setTimeout(loadAll,120)}else if(n>60)clearInterval(t)},100)}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();

(function loadCementMobileFix(){if(document.getElementById("cementMobileFixCss"))return;const link=document.createElement("link");link.id="cementMobileFixCss";link.rel="stylesheet";link.href="./cimento-mobile-fix.css?v=20260817-2";document.head.appendChild(link)})();
(function loadCementEnhancements(){if(document.querySelector('script[src^="./cimento-enhancements.js"]'))return;const s=document.createElement("script");s.src="./cimento-enhancements.js?v=20260817-2";s.defer=true;document.head.appendChild(s)})();
(function loadRecordsCementAddon(){if(document.querySelector('script[src^="./records-cement-addon.js"]'))return;const s=document.createElement("script");s.src="./records-cement-addon.js?v=20260826-status-amount1";s.defer=true;document.head.appendChild(s)})();

/* Yarınki Sevkiyatlar birleşik PDF: başlık/karakter temizliği. */
(function removeTomorrowPdfTitle(){
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    const API=window.jspdf?.jsPDF?.API;
    if(!API?.text){if(tries>100)clearInterval(timer);return;}
    clearInterval(timer);
    if(API.__betonexaTomorrowTitlePatched)return;
    API.__betonexaTomorrowTitlePatched=true;
    const originalText=API.text;
    const normalizePdfText=value=>String(value??"")
      .replace(/\bm3\b/gi,"m³")
      .replace(/\s+·\s+/g," · ");
    API.text=function(value,x,y,options,transform){
      const plain=Array.isArray(value)?value.join(" "):String(value??"");
      if(plain==="Betonexa - Yarınki Sevkiyatlar"){
        this.__betonexaMoveTomorrowDate=true;
        return this;
      }
      if(this.__betonexaMoveTomorrowDate && Number(y)===20){
        this.__betonexaMoveTomorrowDate=false;
        y=14;
      }
      const cleaned=Array.isArray(value)?value.map(normalizePdfText):normalizePdfText(value);
      return originalText.call(this,cleaned,x,y,options,transform);
    };
  },50);
})();
