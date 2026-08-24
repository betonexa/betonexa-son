(function(root){
  'use strict';

  const DB_NAME='BetonexaSafetyBackups';
  const STORE_NAME='snapshots';
  const MAX_SNAPSHOTS=30;
  const DAILY_MS=24*60*60*1000;
  const LAST_BACKUP_KEY='betonexa_last_verified_backup_at';
  const TABLES=['sevkiyatlar','cimento_sevkiyatlar','sozlesmeler','sozlesme_fiyat_gecmisi'];
  let running=false;
  let changeTimer=null;

  const $=id=>document.getElementById(id);
  const trDateTime=value=>new Date(value).toLocaleString('tr-TR');
  function client(){return root.BetonexaAuthClient||(typeof root.ensureDb==='function'?root.ensureDb():null)}

  function openBackupDb(){
    return new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);
      request.onupgradeneeded=()=>{
        const db=request.result;
        if(!db.objectStoreNames.contains(STORE_NAME))db.createObjectStore(STORE_NAME,{keyPath:'id'});
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||new Error('Yerel yedek alanı açılamadı.'));
    });
  }

  async function storeSnapshot(snapshot){
    const db=await openBackupDb();
    const all=await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE_NAME,'readonly'),req=tx.objectStore(STORE_NAME).getAll();
      req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error);
    });
    const remove=all.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(MAX_SNAPSHOTS-1);
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE_NAME,'readwrite'),store=tx.objectStore(STORE_NAME);
      remove.forEach(item=>store.delete(item.id));store.put(snapshot);
      tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
    });
    db.close();
  }

  async function latestSnapshot(){
    const db=await openBackupDb();
    const all=await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE_NAME,'readonly'),req=tx.objectStore(STORE_NAME).getAll();
      req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error);
    });
    db.close();
    return all.sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0]||null;
  }

  async function fetchTables(){
    const db=client();if(!db)throw new Error('Veritabanı bağlantısı yüklenemedi.');
    const data={};
    for(const table of TABLES){
      const result=await db.from(table).select('*');
      if(result.error)throw new Error(`${table} tablosu alınamadı: ${result.error.message}`);
      data[table]=result.data||[];
    }
    return data;
  }

  function publicSettings(){try{return JSON.parse(localStorage.getItem('betonexa_settings')||'{}')}catch(_){return {}}}
  function status(message,isError=false){const el=$('backupStatus');if(!el)return;el.textContent=message||'';el.classList.toggle('backup-error',isError)}

  async function createBackup(reason='manual'){
    if(running)return null;running=true;status('Yedek hazırlanıyor…');
    try{
      const tables=await fetchTables(),createdAt=new Date().toISOString();
      const counts=Object.fromEntries(TABLES.map(name=>[name,tables[name].length]));
      const snapshot={id:`betonexa-${createdAt}`,format:'betonexa-backup',version:1,createdAt,reason,counts,tables,settings:publicSettings()};
      await storeSnapshot(snapshot);localStorage.setItem(LAST_BACKUP_KEY,createdAt);
      status(`Son doğrulanmış yedek: ${trDateTime(createdAt)} · ${counts.sevkiyatlar} beton · ${counts.cimento_sevkiyatlar} çimento · ${counts.sozlesmeler} sözleşme`);
      return snapshot;
    }catch(error){console.error('Betonexa yedekleme hatası:',error);status(`Yedek alınamadı: ${error.message||error}`,true);return null}
    finally{running=false}
  }

  function downloadSnapshot(snapshot){
    const blob=new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=`Betonexa-Yedek-${snapshot.createdAt.slice(0,10)}-${snapshot.createdAt.slice(11,16).replace(':','')}.json`;
    document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  async function downloadLatest(){
    status('Son yedek hazırlanıyor…');const snapshot=await latestSnapshot();
    if(!snapshot){status('İndirilecek yerel yedek bulunamadı.',true);return}
    downloadSnapshot(snapshot);status(`Yedek indirildi: ${trDateTime(snapshot.createdAt)}`);
  }

  function dueForDailyBackup(){const last=Date.parse(localStorage.getItem(LAST_BACKUP_KEY)||'');return !Number.isFinite(last)||(Date.now()-last)>=DAILY_MS}
  function scheduleAfterChange(){clearTimeout(changeTimer);changeTimer=setTimeout(()=>createBackup('data-change'),3500)}

  function injectUi(){
    const grid=document.querySelector('#settingsPage .settings-grid');if(!grid||$('backupCenter'))return false;
    const box=document.createElement('div');box.id='backupCenter';box.className='settings-box backup-center';
    box.innerHTML=`<h3>🛡️ Yedekleme Merkezi</h3><div class="settings-body"><p>Beton, çimento, sözleşme ve fiyat geçmişi bu cihazda otomatik olarak yedeklenir. Son 30 doğrulanmış kopya korunur.</p><div class="backup-actions"><button id="backupNowBtn" type="button" class="btn btn-primary">Şimdi Yedekle</button><button id="backupDownloadBtn" type="button" class="btn btn-light">Son Yedeği İndir</button></div><div id="backupStatus" class="backup-status">Yedek durumu kontrol ediliyor…</div><small>Şifreler ve oturum anahtarları yedeğe dahil edilmez.</small></div>`;
    grid.appendChild(box);$('backupNowBtn').addEventListener('click',()=>createBackup('manual'));$('backupDownloadBtn').addEventListener('click',downloadLatest);
    latestSnapshot().then(snapshot=>status(snapshot?`Son doğrulanmış yedek: ${trDateTime(snapshot.createdAt)}`:'Bu cihazda henüz yedek bulunmuyor.')).catch(error=>status(`Yedek durumu okunamadı: ${error.message}`,true));
    return true;
  }

  function addStyles(){
    if($('backupCenterStyles'))return;const style=document.createElement('style');style.id='backupCenterStyles';
    style.textContent=`#backupCenter{grid-column:1/-1}#backupCenter p{margin:0 0 14px;color:var(--muted);line-height:1.45}#backupCenter .backup-actions{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:12px}#backupCenter .backup-status{padding:11px 12px;border-radius:11px;background:rgba(22,122,77,.09);color:var(--success);font-weight:750;margin-bottom:9px}#backupCenter .backup-status.backup-error{background:rgba(204,51,42,.10);color:var(--danger)}#backupCenter small{color:var(--muted)}@media(max-width:700px){#backupCenter .backup-actions .btn{width:100%}}`;
    document.head.appendChild(style);
  }

  function bind(){
    addStyles();injectUi();const settings=$('settingsPage');if(settings)new MutationObserver(()=>injectUi()).observe(settings,{subtree:true,childList:true});
    document.addEventListener('click',event=>{if(event.target.closest('#shipmentForm button[type="submit"],#cementSaveBtn,#cementRows button,#contractSaveBtn,#historySaveBtn,#contractsList button'))scheduleAfterChange()},true);
    document.addEventListener('submit',event=>{if(event.target?.id==='shipmentForm')scheduleAfterChange()},true);
    const db=client();if(db?.auth?.onAuthStateChange)db.auth.onAuthStateChange((event,session)=>{if(session&&['SIGNED_IN','INITIAL_SESSION','TOKEN_REFRESHED'].includes(event)&&dueForDailyBackup())setTimeout(()=>createBackup('daily'),1200)});
    setTimeout(()=>{if(dueForDailyBackup())createBackup('daily')},1800);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  root.BetonexaBackup=Object.freeze({create:createBackup,downloadLatest,latest:latestSnapshot});
})(typeof window!=='undefined'?window:null);
