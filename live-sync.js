(function(){
  "use strict";

  const CHANNEL_NAME="betonexa-live-shipments-v1";
  const POLL_INTERVAL_MS=15000;
  const CHANGE_DEBOUNCE_MS=350;
  let channel=null;
  let pollTimer=null;
  let refreshTimer=null;
  let refreshRunning=false;
  let refreshQueued=false;
  let lastDataSignature=null;

  const client=()=>typeof window.ensureDb==="function"?window.ensureDb():null;
  const appIsOpen=()=>{
    const app=document.getElementById("app");
    return !!app&&!app.classList.contains("hidden");
  };

  function stableRows(rows){
    return [...(rows||[])].sort((a,b)=>String(a?.id??"").localeCompare(String(b?.id??""),"tr",{numeric:true}));
  }

  async function shipmentDataSignature(){
    const db=client();
    if(!db)return null;
    const [concreteResult,cementResult]=await Promise.all([
      db.from("sevkiyatlar").select("*").order("id",{ascending:true}),
      db.from("cimento_sevkiyatlar").select("*").order("id",{ascending:true})
    ]);
    if(concreteResult.error||cementResult.error)throw concreteResult.error||cementResult.error;
    return JSON.stringify({
      concrete:stableRows(concreteResult.data),
      cement:stableRows(cementResult.data)
    });
  }

  async function refreshShipmentViews(options={}){
    if(!appIsOpen()||document.visibilityState==="hidden")return;
    if(refreshRunning){refreshQueued=true;return;}
    refreshRunning=true;
    try{
      let signature=null;
      try{signature=await shipmentDataSignature();}
      catch(error){console.warn("Canlı veri değişikliği kontrol edilemedi.",error);return;}
      if(signature===null)return;
      const firstCheck=lastDataSignature===null;
      const dataChanged=signature!==lastDataSignature;
      lastDataSignature=signature;
      if(!options.force&&(firstCheck||!dataChanged))return;
      const jobs=[];
      if(typeof window.loadRecords==="function")jobs.push(window.loadRecords());
      if(typeof window.loadCementShipments==="function")jobs.push(window.loadCementShipments());
      if(typeof window.refreshRecordsCombined==="function")jobs.push(window.refreshRecordsCombined());
      await Promise.allSettled(jobs);
    }finally{
      refreshRunning=false;
      if(refreshQueued){refreshQueued=false;scheduleRefresh(150);}
    }
  }

  function scheduleRefresh(delay=CHANGE_DEBOUNCE_MS){
    clearTimeout(refreshTimer);
    refreshTimer=setTimeout(refreshShipmentViews,delay);
  }

  function subscribe(){
    const db=client();
    if(!db||typeof db.channel!=="function"||channel)return;
    channel=db.channel(CHANNEL_NAME)
      .on("postgres_changes",{event:"*",schema:"public",table:"sevkiyatlar"},()=>scheduleRefresh())
      .on("postgres_changes",{event:"*",schema:"public",table:"cimento_sevkiyatlar"},()=>scheduleRefresh())
      .subscribe();
  }

  function init(){
    subscribe();
    pollTimer=setInterval(()=>scheduleRefresh(0),POLL_INTERVAL_MS);
    window.addEventListener("focus",()=>scheduleRefresh(0));
    document.addEventListener("visibilitychange",()=>{
      if(document.visibilityState==="visible")scheduleRefresh(0);
    });
    const db=client();
    if(db?.auth?.onAuthStateChange){
      db.auth.onAuthStateChange((event,session)=>{
        if(session&&(event==="SIGNED_IN"||event==="INITIAL_SESSION"||event==="TOKEN_REFRESHED")){
          subscribe();scheduleRefresh(100);
        }
      });
    }
  }

  window.refreshShipmentViews=options=>refreshShipmentViews(options||{});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
