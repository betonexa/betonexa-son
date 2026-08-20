(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BetonexaContracts=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';

  const number=value=>{
    const parsed=Number(value??0);
    return Number.isFinite(parsed)?parsed:0;
  };

  function shipmentTotal(contract,records,names){
    const companyKey=names.key(contract.firma);
    const siteKey=names.key(contract.santiye);
    const carryDate=contract.devir_tarihi||'';
    const contractDate=contract.sozlesme_tarihi||'';
    return (records||[]).filter(record=>{
      if(names.key(record.firma)!==companyKey)return false;
      if(names.key(record.santiye)!==siteKey)return false;
      if(carryDate)return Boolean(record.tarih)&&record.tarih>carryDate;
      if(contractDate)return Boolean(record.tarih)&&record.tarih>=contractDate;
      return true;
    }).reduce((sum,record)=>sum+number(record.metraj),0);
  }

  function progress(contract,records,names){
    const carry=number(contract.devir_m3);
    const afterCarry=shipmentTotal(contract,records,names);
    const realized=carry+afterCarry;
    const total=number(contract.toplam_sozlesme_m3);
    return {
      total,carry,afterCarry,realized,
      remaining:Math.max(0,total-realized),
      overrun:Math.max(0,realized-total)
    };
  }

  function validate(contract){
    const errors=[];
    if(!String(contract.firma||'').trim())errors.push('Firma bilgisi zorunludur.');
    if(!String(contract.santiye||'').trim())errors.push('Şantiye bilgisi zorunludur.');
    const total=number(contract.toplam_sozlesme_m3);
    const carry=number(contract.devir_m3);
    if(total<=0)errors.push('Toplam sözleşme m³ değeri sıfırdan büyük olmalıdır.');
    if(carry<0)errors.push('Devir m³ negatif olamaz.');
    if(carry>total)errors.push('Devir m³ toplam sözleşme m³ değerini aşamaz.');
    if(carry>0&&!contract.devir_tarihi)errors.push('Devir m³ girildiğinde devir tarihi zorunludur.');
    if(number(contract.alis_fiyati)<0||number(contract.satis_fiyati)<0)errors.push('Fiyatlar negatif olamaz.');
    if(number(contract.vade_gunu)<0)errors.push('Vade günü negatif olamaz.');
    if(contract.sabitlik_bitis_tarihi&&contract.sozlesme_tarihi&&contract.sabitlik_bitis_tarihi<contract.sozlesme_tarihi){
      errors.push('Fiyat sabitlik bitişi sözleşme tarihinden önce olamaz.');
    }
    return errors;
  }

  return Object.freeze({shipmentTotal,progress,validate});
});
