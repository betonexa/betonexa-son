(function(){
  'use strict';

  const $=id=>document.getElementById(id);
  const norm=v=>String(v||'').trim().toLocaleLowerCase('tr-TR').replace(/\s+/g,' ');
  const canonicalKey=v=>{
    try{return window.BetonexaShipmentFilterNames?.key?.(v)||norm(v)}catch(e){return norm(v)}
  };
  const parseNumber=text=>{
    const raw=String(text||'').replace(/m³|ton/gi,'').replace(/\+/g,'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,'');
    const n=Number(raw);return Number.isFinite(n)?n:0;
  };
  const trNum=n=>Number(n||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const MONTHS={ocak:'01',şubat:'02',mart:'03',nisan:'04',mayıs:'05',haziran:'06',temmuz:'07',ağustos:'08',eylül:'09',ekim:'10',kasım:'11',aralık:'12'};

  function rowIso(row){
    const t=(row?.children?.[1]?.textContent||'').trim();
    let m=t.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if(m)return `${m[3]}-${m[2]}-${m[1]}`;
    m=t.match(/(\d{4})-(\d{2})-(\d{2})/);
    if(m)return m[0];
    m=t.toLocaleLowerCase('tr-TR').match(/(\d{1,2})\s+(ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık)\s+(\d{4})/u);
    if(m)return `${m[3]}-${MONTHS[m[2]]}-${String(m[1]).padStart(2,'0')}`;
    return '';
  }

  function blocks(){
    const box=$('recordsCombinedView');if(!box)return{};
    const all=[...box.querySelectorAll('.rc-block')];
    return{
      box,
      concrete:all.find(x=>/Beton Sevkiyatları/i.test(x.querySelector('h3')?.textContent||'')),
      cement:all.find(x=>/Çimento Sevkiyatları/i.test(x.querySelector('h3')?.textContent||''))
    };
  }
  function concreteRows(){const b=blocks().concrete;return b?[...b.querySelectorAll('.rc-table tbody tr')].filter(r=>r.children.length>=9):[]}
  function cementRows(){const b=blocks().cement;return b?[...b.querySelectorAll('.rc-table tbody tr')].filter(r=>r.children.length>=6):[]}
  function matchesDate(row,start,end){const d=rowIso(row);return(!start||d>=start)&&(!end||d<=end)}

  function repair(){
    const start=$('shipmentFilterStart')?.value||'',end=$('shipmentFilterEnd')?.value||'';
    if(!start&&!end)return;

    const type=$('shipmentFilterType')?.value||'all';
    const company=canonicalKey($('shipmentFilterCompany')?.value);
    const site=canonicalKey($('shipmentFilterSite')?.value);
    const plant=norm($('shipmentFilterPlant')?.value);
    const concrete=norm($('shipmentFilterConcrete')?.value);
    const delivery=canonicalKey($('shipmentFilterDelivery')?.value);
    const {concrete:cb,cement:ceb}=blocks();
    let cc=0,m3=0,zc=0,vehicles=0,pallets=0,tons=0;

    concreteRows().forEach(r=>{
      const ok=type!=='cement'&&(!company||canonicalKey(r.children[4]?.textContent)===company)&&(!site||canonicalKey(r.children[5]?.textContent)===site)&&(!plant||norm(r.children[3]?.textContent)===plant)&&(!concrete||norm(r.children[6]?.textContent)===concrete)&&matchesDate(r,start,end);
      r.style.display=ok?'':'none';
      if(ok){cc++;m3+=parseNumber(r.children[7]?.textContent)}
    });

    cementRows().forEach(r=>{
      const ok=type!=='concrete'&&(!company||canonicalKey(r.children[2]?.textContent)===company)&&(!delivery||canonicalKey(r.children[3]?.textContent)===delivery)&&matchesDate(r,start,end);
      r.style.display=ok?'':'none';
      if(ok){zc++;vehicles+=parseNumber(r.children[4]?.textContent);pallets+=parseNumber(r.children[5]?.textContent);tons+=parseNumber(r.children[6]?.textContent)}
    });

    if(cb)cb.style.display=type==='cement'?'none':'';
    if(ceb)ceb.style.display=type==='concrete'?'none':'';
    if(cb?.querySelector('.rc-total'))cb.querySelector('.rc-total').innerHTML=`<span>BETON SEVKİYATI: ${cc}</span><span>GENEL BETON: ${trNum(m3)} m³</span>`;
    if(ceb?.querySelector('.rc-total'))ceb.querySelector('.rc-total').innerHTML=`<span>ÇİMENTO SEVKİYATI: ${zc}</span><span>TOPLAM ARAÇ: ${vehicles}</span><span>TOPLAM PALET: ${pallets}</span><span>TOPLAM TONAJ: ${trNum(tons)} ton</span>`;
  }

  let timer;
  function schedule(){clearTimeout(timer);timer=setTimeout(repair,0)}

  document.addEventListener('change',e=>{if(e.target?.closest?.('#shipmentQuickFilters'))schedule()},true);
  document.addEventListener('click',e=>{if(e.target?.closest?.('#shipmentQuickFilters .sqf-quick'))schedule()},true);
  document.addEventListener('betonexa:records-rendered',schedule);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
