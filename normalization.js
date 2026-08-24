(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BetonexaNames=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';

  const clean=value=>String(value??'').trim().replace(/\s+/g,' ');

  function label(value){
    let text=clean(value);
    if(!text)return '';
    text=text
      .toLocaleLowerCase('tr-TR')
      .replace(/(^|\s)(?:inş|ins)\s*\.?(?=\s|$)/gu,'$1inşaat');
    return text.replace(/(^|[\s\-/])([\p{L}\p{N}])/gu,
      (match,separator,character)=>separator+character.toLocaleUpperCase('tr-TR'));
  }

  function key(value){
    return label(value)
      .toLocaleLowerCase('tr-TR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/ı/g,'i')
      .replace(/ß/g,'ss')
      .replace(/[^a-z0-9]+/g,' ')
      .trim()
      .replace(/\s+/g,' ');
  }

  function group(items,valueOf,totalOf=()=>0){
    const groups=new Map();
    for(const item of items||[]){
      const raw=clean(valueOf(item))||'Belirtilmemiş';
      const canonical=key(raw)||'belirtilmemis';
      if(!groups.has(canonical))groups.set(canonical,{name:label(raw),count:0,total:0,records:[]});
      const current=groups.get(canonical);
      current.count+=1;
      current.total+=Number(totalOf(item)||0);
      current.records.push(item);
    }
    return [...groups.values()].sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name,'tr'));
  }

  return Object.freeze({clean,label,key,group});
});

/* Betonexa — kalıcı "Beni hatırla" oturumu
   Parola saklanmaz. Supabase oturumu cihazda kalıcı tutulur.
   Otomatik açılış signOut çağrıları engellenir; yalnızca kullanıcı
   gerçek Çıkış düğmesine bastığında oturum kapatılır. */
(function(root){
  'use strict';
  if(!root || !root.supabase || typeof root.supabase.createClient!=='function')return;
  if(root.__betonexaRememberAuthPatch)return;
  root.__betonexaRememberAuthPatch=true;

  const SESSION_BACKUP_KEY='betonexaRememberedSessionV3';
  const originalCreateClient=root.supabase.createClient.bind(root.supabase);
  let userRequestedLogout=false;

  function wantsRememberedSession(){
    try{return !!localStorage.getItem('betonexaRememberedUsername')}catch(_){return false}
  }

  function saveSessionBackup(session){
    if(!wantsRememberedSession() || !session?.access_token || !session?.refresh_token)return;
    try{
      localStorage.setItem(SESSION_BACKUP_KEY,JSON.stringify({
        access_token:session.access_token,
        refresh_token:session.refresh_token,
        saved_at:Date.now()
      }));
    }catch(_){}
  }

  function readSessionBackup(){
    if(!wantsRememberedSession())return null;
    try{
      const raw=localStorage.getItem(SESSION_BACKUP_KEY);
      if(!raw)return null;
      const data=JSON.parse(raw);
      if(!data?.access_token || !data?.refresh_token)return null;
      return data;
    }catch(_){return null}
  }

  function clearSessionBackup(){
    try{localStorage.removeItem(SESSION_BACKUP_KEY)}catch(_){}
  }

  /* Kullanıcının gerçek Çıkış tıklamasını, uygulamanın otomatik signOut'undan ayır. */
  document.addEventListener('click',function(event){
    const target=event.target?.closest?.('#logoutBtn');
    if(target)userRequestedLogout=true;
  },true);

  root.supabase.createClient=function(){
    const args=[...arguments];
    const existingOptions=args[2]||{};
    const existingAuth=existingOptions.auth||{};
    args[2]={
      ...existingOptions,
      auth:{
        persistSession:true,
        autoRefreshToken:true,
        detectSessionInUrl:true,
        ...existingAuth
      }
    };

    const client=originalCreateClient.apply(null,args);
    root.BetonexaAuthClient=client;

    if(client?.auth && !client.auth.__betonexaRememberAuthPatched){
      const originalSignIn=client.auth.signInWithPassword.bind(client.auth);
      const originalSignOut=client.auth.signOut.bind(client.auth);

      client.auth.signInWithPassword=async function(credentials){
        const result=await originalSignIn(credentials);
        if(!result?.error && result?.data?.session){
          saveSessionBackup(result.data.session);
        }
        return result;
      };

      client.auth.signOut=async function(options){
        const isLocalSignOut=!options || options.scope===undefined || options.scope==='local';

        /* Hatırlanan kullanıcıda, gerçek Çıkış tıklaması dışındaki yerel signOut'ları engelle. */
        if(isLocalSignOut && wantsRememberedSession() && !userRequestedLogout){
          return {error:null};
        }

        if(userRequestedLogout){
          clearSessionBackup();
          userRequestedLogout=false;
        }

        return originalSignOut(options);
      };

      client.auth.__betonexaRememberAuthPatched=true;
    }

    return client;
  };

  async function openApp(){
    try{sessionStorage.setItem('betonexa_login','1')}catch(_){}
    const login=document.getElementById('login');
    const app=document.getElementById('app');
    login?.classList.add('hidden');
    app?.classList.remove('hidden');
    if(typeof root.showPage==='function')root.showPage('home');
    if(typeof root.loadRecords==='function')await root.loadRecords();
  }

  async function restoreRememberedSession(){
    if(!wantsRememberedSession())return false;
    const client=root.BetonexaAuthClient;
    if(!client?.auth)return false;

    try{
      if(typeof client.auth.getSession==='function'){
        const current=await client.auth.getSession();
        if(!current?.error && current?.data?.session){
          saveSessionBackup(current.data.session);
          await openApp();
          return true;
        }
      }

      const backup=readSessionBackup();
      if(!backup || typeof client.auth.setSession!=='function'){
        /* Eski e-posta tercihi tek başına oturum değildir; kutuyu yanıltıcı bırakma. */
        try{localStorage.removeItem('betonexaRememberedUsername')}catch(_){}
        return false;
      }

      const restored=await client.auth.setSession({
        access_token:backup.access_token,
        refresh_token:backup.refresh_token
      });
      if(restored?.error || !restored?.data?.session){
        clearSessionBackup();
        try{localStorage.removeItem('betonexaRememberedUsername')}catch(_){}
        return false;
      }

      saveSessionBackup(restored.data.session);
      await openApp();
      return true;
    }catch(error){
      console.warn('Hatırlanan oturum geri yüklenemedi:',error);
      return false;
    }
  }

  /* index.html açılış akışı gecikmeden aynı güvenli geri yüklemeyi kullanabilsin. */
  root.BetonexaRestoreRememberedSession=restoreRememberedSession;

  function startRestoreLoop(){
    let tries=0;
    const timer=setInterval(async()=>{
      tries+=1;
      const restored=await restoreRememberedSession();
      if(restored || tries>=40)clearInterval(timer);
    },250);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',startRestoreLoop,{once:true});
  }else{
    startRestoreLoop();
  }
})(typeof window!=='undefined'?window:null);
