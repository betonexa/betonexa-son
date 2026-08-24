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

/* Betonexa — kalıcı "Beni hatırla" oturumu */
(function(root){
  'use strict';
  if(!root || !root.supabase || typeof root.supabase.createClient!=='function')return;
  if(root.__betonexaRememberAuthPatch)return;
  root.__betonexaRememberAuthPatch=true;

  const patchStartedAt=Date.now();
  const originalCreateClient=root.supabase.createClient.bind(root.supabase);

  function wantsRememberedSession(){
    try{
      return !!localStorage.getItem('betonexaRememberedUsername');
    }catch(_){
      return false;
    }
  }

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
      const originalSignOut=client.auth.signOut.bind(client.auth);
      let startupSignOutBypassed=false;

      client.auth.signOut=async function(options){
        const isLocalSignOut=!options || options.scope===undefined || options.scope==='local';
        const withinStartupWindow=(Date.now()-patchStartedAt)<10000;

        if(
          !startupSignOutBypassed &&
          withinStartupWindow &&
          isLocalSignOut &&
          wantsRememberedSession()
        ){
          startupSignOutBypassed=true;
          return {error:null};
        }

        return originalSignOut(options);
      };

      client.auth.__betonexaRememberAuthPatched=true;
    }

    return client;
  };

  async function restoreRememberedSession(){
    if(!wantsRememberedSession())return false;

    const client=root.BetonexaAuthClient;
    if(!client?.auth || typeof client.auth.getSession!=='function')return false;

    try{
      const {data,error}=await client.auth.getSession();
      if(error || !data?.session)return false;

      try{sessionStorage.setItem('betonexa_login','1')}catch(_){}

      const login=document.getElementById('login');
      const app=document.getElementById('app');
      login?.classList.add('hidden');
      app?.classList.remove('hidden');

      if(typeof root.showPage==='function')root.showPage('home');
      if(typeof root.loadRecords==='function')await root.loadRecords();
      return true;
    }catch(error){
      console.warn('Hatırlanan oturum geri yüklenemedi:',error);
      return false;
    }
  }

  function startRestoreLoop(){
    let tries=0;
    const timer=setInterval(async()=>{
      tries+=1;
      const restored=await restoreRememberedSession();
      if(restored || tries>=20)clearInterval(timer);
    },250);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',startRestoreLoop,{once:true});
  }else{
    startRestoreLoop();
  }
})(typeof window!=='undefined'?window:null);
