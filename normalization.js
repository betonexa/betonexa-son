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
