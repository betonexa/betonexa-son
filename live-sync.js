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

  const client=()=>typeof window.ensureDb==="function"?window.ensureDb():null;
  const appIsOpen=()=>{
    const app=document.getElementById("app");
    return !!app&&!app.classList.contains("hidden");
  };

  async function refreshShipmentViews(){
    if(!appIsOpen()||document.visibilityState==="hidden")return;
    if(refreshRunning){refreshQueued=true;return;}
    refreshRunning=true;
    try{
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

  window.refreshShipmentViews=refreshShipmentViews;
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
