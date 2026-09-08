(function(){
  'use strict';

  const $=id=>document.getElementById(id);
  const clean=v=>String(v??'').replace(/\u00a0/g,' ').trim().replace(/\s+/g,' ');
  const norm=v=>clean(v).toLocaleLowerCase('tr-TR');
  const canonicalKey=v=>{
    try{
      return window.BetonexaNames?.key?.(v)
        ||window.BetonexaShipmentFilterNames?.key?.(v)
        ||norm(v);
    }catch(_){return norm(v)}
  };
  const parseNumber=text=>{
    const raw=clean(text).replace(/m³|ton/gi,'').replace(/\+/g,'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,'');
    const n=Number(raw);return Number.isFinite(n)?n:0;
  };
  const trNum=n=>Number(n||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const MONTHS={ocak:'01',şubat:'02',mart:'03',nisan:'04',mayıs:'05',haziran:'06',temmuz:'07',ağustos:'08',eylül:'09',ekim:'10',kasım:'11',aralık:'12'};

  function headers(row){
    const table=row?.closest('table');
    return [...(table?.querySelectorAll('thead th')||[])].map(th=>norm(th.textContent));
  }
  function cell(row,label,fallback){
    const index=headers(row).indexOf(norm(label));
    return clean(row?.children?.[index>=0?index:fallback]?.textContent);
  }
  function rowIso(row){
    const text=cell(row,'Tarih',1);
    let match=text.match(/(\d{2})[.\/-](\d{2})[.\/-](\d{4})/);
    if(match)return `${match[3]}-${match[2]}-${match[1]}`;
    match=text.match(/(\d{4})-(\d{2})-(\d{2})/);
    if(match)return match[0];
    match=norm(text).match(/(\d{1,2})\s+(ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık)\s+(\d{4})/u);
    if(match)return `${match[3]}-${MONTHS[match[2]]}-${String(match[1]).padStart(2,'0')}`;
    return '';
  }
  function blocks(){
    const box=$('recordsCombinedView');if(!box)return{};
    const all=[...box.querySelectorAll('.rc-block')];
    return{
      box,
      concrete:all.find(section=>/Beton Sevkiyatları/i.test(section.querySelector('h3')?.textContent||'')),
      cement:all.find(section=>/Çimento Sevkiyatları/i.test(section.querySelector('h3')?.textContent||''))
    };
  }
  function dataRows(block){return block?[...block.querySelectorAll('.rc-table tbody tr')].filter(row=>row.querySelectorAll('td').length>1):[]}
  function matchesDate(row,start,end){
    const date=rowIso(row);
    if((start||end)&&!date)return false;
    return(!start||date>=start)&&(!end||date<=end);
  }
  function setDisplay(element,show){const wanted=show?'':'none';if(element&&element.style.display!==wanted)element.style.display=wanted}
  function setHtml(element,html){if(element&&element.innerHTML!==html)element.innerHTML=html}

  function repair(){
    const panel=$('shipmentQuickFilters');
    const {concrete:concreteBlock,cement:cementBlock}=blocks();
    if(!panel||(!concreteBlock&&!cementBlock))return;

    const type=$('shipmentFilterType')?.value||'all';
    const company=canonicalKey($('shipmentFilterCompany')?.value);
    const site=canonicalKey($('shipmentFilterSite')?.value);
    const plant=norm($('shipmentFilterPlant')?.value);
    const concreteClass=norm($('shipmentFilterConcrete')?.value);
    const delivery=canonicalKey($('shipmentFilterDelivery')?.value);
    const start=$('shipmentFilterStart')?.value||'';
    const end=$('shipmentFilterEnd')?.value||'';
    let concreteCount=0,m3=0,cementCount=0,vehicles=0,pallets=0,tons=0;

    dataRows(concreteBlock).forEach(row=>{
      const ok=type!=='cement'
        &&(!company||canonicalKey(cell(row,'Firma',4))===company)
        &&(!site||canonicalKey(cell(row,'Şantiye',5))===site)
        &&(!plant||norm(cell(row,'Santral',3))===plant)
        &&(!concreteClass||norm(cell(row,'Beton',6))===concreteClass)
        &&matchesDate(row,start,end);
      setDisplay(row,ok);
      if(ok){concreteCount++;m3+=parseNumber(cell(row,'Metraj',7))}
    });

    dataRows(cementBlock).forEach(row=>{
      const ok=type!=='concrete'
        &&(!company||canonicalKey(cell(row,'Firma',2))===company)
        &&(!delivery||canonicalKey(cell(row,'Teslim Yeri',3))===delivery)
        &&matchesDate(row,start,end);
      setDisplay(row,ok);
      if(ok){cementCount++;vehicles+=parseNumber(cell(row,'Araç',4));pallets+=parseNumber(cell(row,'Palet',5));tons+=parseNumber(cell(row,'Tonaj',6))}
    });

    setDisplay(concreteBlock,type!=='cement');
    setDisplay(cementBlock,type!=='concrete');
    setHtml(concreteBlock?.querySelector('.rc-total'),`<span>BETON SEVKİYATI: ${concreteCount}</span><span>GENEL BETON: ${trNum(m3)} m³</span>`);
    setHtml(cementBlock?.querySelector('.rc-total'),`<span>ÇİMENTO SEVKİYATI: ${cementCount}</span><span>TOPLAM ARAÇ: ${vehicles}</span><span>TOPLAM PALET: ${pallets}</span><span>TOPLAM TONAJ: ${trNum(tons)} ton</span>`);
  }

  let timer;
  function schedule(delay=0){clearTimeout(timer);timer=setTimeout(repair,delay)}
  function onFilterEvent(event){if(event.target?.closest?.('#shipmentQuickFilters'))schedule(220)}
  document.addEventListener('change',onFilterEvent,true);
  document.addEventListener('input',onFilterEvent,true);
  document.addEventListener('click',event=>{if(event.target?.closest?.('#shipmentQuickFilters .sqf-quick,#shipmentFilterClear'))schedule(220)},true);
  document.addEventListener('betonexa:records-rendered',()=>schedule(240));

  function observe(){
    const host=$('recordsCombinedView');
    if(!host||host.dataset.dateFilterFixObserver==='2')return false;
    host.dataset.dateFilterFixObserver='2';
    new MutationObserver(mutations=>{
      if(mutations.some(mutation=>mutation.type==='childList'||(mutation.type==='attributes'&&mutation.attributeName==='style')))schedule(260);
    }).observe(host,{subtree:true,childList:true,attributes:true,attributeFilter:['style']});
    return true;
  }
  function boot(){
    observe();schedule(300);
    const page=$('recordsPage');
    if(page&&!page.dataset.dateFilterFixBootObserverV2){
      page.dataset.dateFilterFixBootObserverV2='1';
      new MutationObserver(()=>{observe();schedule(280)}).observe(page,{subtree:true,childList:true});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
