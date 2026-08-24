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

/*
 * Betonexa — "Beni hatırla" kalıcı oturum düzeltmesi
 *
 * Parola hiçbir zaman localStorage/sessionStorage içine yazılmaz.
 * Supabase'in kendi güvenli oturum/refresh-token mekanizması korunur.
 * Kullanıcı "Beni hatırla" seçtiğinde zaten kaydedilen
 * betonexaRememberedUsername anahtarı, kalıcı oturum tercihi olarak kullanılır.
 */
(function(root){
  'use strict';
  if(!root || !root.supabase || typeof root.supabase.createClient!=='function')return;
  if(root.__betonexaRememberAuthPatch)return;
  root.__betonexaRememberAuthPatch=true;

  const originalCreateClient=root.supabase.createClient.bind(root.supabase);

  function wantsRememberedSession(){
    try{
      return !!localStorage.getItem('betonexaRememberedUsername');
    }catch(_){
      return false;
    }
  }

  root.supabase.createClient=function(){
    const client=originalCreateClient.apply(null,arguments);
    root.BetonexaAuthClient=client;

    if(client?.auth && !client.auth.__betonexaRememberAuthPatched){
      const originalSignOut=client.auth.signOut.bind(client.auth);
      let bootSignOutBypassed=false;

      client.auth.signOut=async function(options){
        const isLocalSignOut=!options || options.scope===undefined || options.scope==='local';
        const isInitialPageBoot=document.readyState==='loading';

        if(
          !bootSignOutBypassed &&
          isInitialPageBoot &&
          isLocalSignOut &&
          wantsRememberedSession()
        ){
          bootSignOutBypassed=true;
          return {error:null};
        }

        return originalSignOut(options);
      };

      client.auth.__betonexaRememberAuthPatched=true;
    }

    return client;
  };

  async function restoreRememberedSession(){
    if(!wantsRememberedSession())return;

    const client=root.BetonexaAuthClient;
    if(!client?.auth || typeof client.auth.getSession!=='function')return;

    try{
      const {data,error}=await client.auth.getSession();
      if(error || !data?.session)return;

      try{sessionStorage.setItem('betonexa_login','1')}catch(_){}

      const login=document.getElementById('login');
      const app=document.getElementById('app');
      login?.classList.add('hidden');
      app?.classList.remove('hidden');

      if(typeof root.showPage==='function')root.showPage('home');
      if(typeof root.loadRecords==='function')await root.loadRecords();
    }catch(error){
      console.warn('Hatırlanan oturum geri yüklenemedi:',error);
    }
  }

  function scheduleRestore(){
    setTimeout(restoreRememberedSession,0);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',scheduleRestore,{once:true});
  }else{
    scheduleRestore();
  }
})(typeof window!=='undefined'?window:null);
