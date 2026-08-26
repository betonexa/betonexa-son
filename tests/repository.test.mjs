import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('ana HTML tek ve doğru yerde kapanır',async()=>{
  const html=await read('index.html');
  assert.equal((html.match(/^\s*<\/body>\s*$/gim)||[]).length,1);
  assert.equal((html.match(/^\s*<\/html>\s*$/gim)||[]).length,1);
  assert.match(html,/<\/body>\s*<\/html>\s*$/i);
});

test('HTML içindeki yerel script ve stil dosyaları vardır',async()=>{
  const html=await read('index.html');
  const refs=[...html.matchAll(/(?:src|href)=["']\.\/([^"'?]+)(?:\?[^"']*)?["']/g)]
    .map(match=>match[1])
    .filter(path=>/\.(?:js|css|webmanifest|png)$/i.test(path));
  for(const path of refs)assert.ok(existsSync(new URL(`../${path}`,import.meta.url)),`${path} bulunamadı`);
});

test('service worker uygulamanın yerel modüllerini önbelleğe alır',async()=>{
  const worker=await read('service-worker.js');
  for(const asset of [
    'cimento-module.js','cimento-history.js','cimento-enhancements.js',
    'contracts-module.js','normalization.js','contract-calculations.js','menu-layout.js','tracking-finalizer.js','records-cement-addon.js'
  ])assert.match(worker,new RegExp(asset.replace('.','\\.')));
  assert.doesNotMatch(worker,/r\|\|caches\.match\('\.\/index\.html'\)/);
});

test('firma ve şantiye adları tek kuralla normalleşir',async()=>{
  const names=(await import('../normalization.js')).default||globalThis.BetonexaNames;
  assert.equal(names.label('  ŞEN   BETON  '),'Şen Beton');
  assert.equal(names.label('önerge inş.'),'Önerge İnşaat');
  assert.equal(names.key('ÖNERGE İNŞ.'),names.key('onerge insaat'));
  assert.equal(names.label('Haktan İnş.'),'Haktan İnşaat');
  assert.equal(names.key('Haktan İnş.'),names.key('Haktan İnşaat'));
  assert.equal(names.key('IŞIKLAR'),names.key('ışıklar'));
  assert.equal(names.key('Usta'),names.key('USTA'));
  const grouped=names.group([
    {firma:'Şen Beton',metraj:25},
    {firma:'şen   beton',metraj:30},
    {firma:'ŞEN-BETON',metraj:20}
  ],row=>row.firma,row=>row.metraj);
  assert.equal(grouped.length,1);
  assert.equal(grouped[0].name,'Şen Beton');
  assert.equal(grouped[0].total,75);
  assert.equal(names.group([
    {santiye:'Haktan İnş.'},{santiye:'Haktan İnşaat'}
  ],row=>row.santiye).length,1);
});

test('şantiye tekilleştirme dosyaları önbellekten eski sürümle açılmaz',async()=>{
  const html=await read('index.html');
  const cement=await read('cimento-module.js');
  assert.match(html,/normalization\.js\?v=20260824-site-dedupe2/);
  assert.match(cement,/contracts-module\.js\?v=20260826-filter-status1/);
});

test('form seçenekleri, kayıt ve yarınki rapor aynı ad anahtarını kullanır',async()=>{
  const html=await read('index.html');
  assert.match(html,/function uniqueNames\(values\)/);
  assert.match(html,/firma:window\.BetonexaNames\.label/);
  assert.match(html,/santiye:window\.BetonexaNames\.label/);
  assert.match(html,/const key=analysisCanonicalKey\(raw\)/);
  assert.doesNotMatch(html,/const key=String\(r\.firma\|\|"Firma belirtilmemiş"\)\.trim/);
});

test('sözleşme gerçekleşen ve kalan m³ hesapları tarihe göre doğrudur',async()=>{
  await import('../normalization.js');
  await import('../contract-calculations.js');
  const names=globalThis.BetonexaNames,contracts=globalThis.BetonexaContracts;
  const contract={firma:'Şen Beton',santiye:'Işıklar',sozlesme_tarihi:'2026-01-01',devir_m3:100,devir_tarihi:'2026-06-30',toplam_sozlesme_m3:500};
  const records=[
    {firma:'ŞEN-BETON',santiye:'ışıklar',tarih:'2026-06-30',metraj:25},
    {firma:'şen beton',santiye:'IŞIKLAR',tarih:'2026-07-01',metraj:30},
    {firma:'Başka Firma',santiye:'Işıklar',tarih:'2026-07-02',metraj:50}
  ];
  const progress=contracts.progress(contract,records,names);
  assert.equal(progress.afterCarry,30);
  assert.equal(progress.realized,130);
  assert.equal(progress.remaining,370);
  assert.equal(progress.overrun,0);
});

test('sözleşme girişi hatalı devir ve tarihleri reddeder',async()=>{
  await import('../contract-calculations.js');
  const errors=globalThis.BetonexaContracts.validate({
    firma:'Önerge',santiye:'Işıklar',sozlesme_tarihi:'2026-08-01',
    sabitlik_bitis_tarihi:'2026-07-01',toplam_sozlesme_m3:100,devir_m3:120,
    devir_tarihi:null,alis_fiyati:10,satis_fiyati:20,vade_gunu:30
  });
  assert.ok(errors.some(error=>error.includes('aşamaz')));
  assert.ok(errors.some(error=>error.includes('devir tarihi')));
  assert.ok(errors.some(error=>error.includes('önce olamaz')));
});

test('sevkiyat takibi çıktı düğmeleri yarınki sevkiyat düzenini kullanır',async()=>{
  const layout=await read('menu-layout.js');
  assert.match(layout,/trackingExportFinalHost/);
  assert.match(layout,/host\.className='tomorrow-actions tracking-export-slot'/);
  for(const id of ['pdfBtn','excelBtn','printBtn'])assert.match(layout,new RegExp(id));
  assert.match(layout,/justify-content','flex-end','important'/);
  assert.match(layout,/gap','8px','important'/);
});

test('çalışan son yerleşim düzelticisi yeni sürüm adresiyle en sonda yüklenir',async()=>{
  const html=await read('index.html');
  const finalizer=await read('tracking-finalizer.js');
  assert.match(html,/tracking-finalizer\.js\?v=20260820-restore1/);
  assert.ok(html.indexOf('tracking-finalizer.js?v=20260820-restore1')>html.indexOf('menu-layout.js'));
  assert.match(finalizer,/trackingExportFinalHost/);
  assert.match(finalizer,/host\.className='tomorrow-actions'/);
});

test('sevkiyat takibi beton tablosunda sorumlu ve telefon görünür',async()=>{
  const addon=await read('records-cement-addon.js');
  assert.match(addon,/<th>Pompa<\/th><th>Sorumlu<\/th><th>Telefon<\/th><th class="shipment-status-head">Durum<\/th><th>İşlem<\/th>/);
  assert.match(addon,/r\.sorumlu_kisi/);
  assert.match(addon,/r\.telefon/);
  const history=await read('cimento-history.js');
  assert.match(history,/records-cement-addon\.js\?v=20260826-stable-status2/);
});

test('yarınki sevkiyat geçişi içerik kaybolmadan yenilenir',async()=>{
  const html=await read('index.html');
  const cement=await read('cimento-module.js');
  assert.match(html,/scrollbar-gutter:\s*stable/);
  assert.match(html,/cimento-module\.js\?v=20260825-tomorrow-stable1/);
  assert.doesNotMatch(cement,/if\(old\)old\.remove\(\);const items=await tomorrowCementRecords/);
  assert.match(cement,/if\(old\)old\.replaceWith\(section\);else report\.appendChild\(section\)/);
});

test('GitHub iş akışları depo içeriğini otomatik değiştirmez',async()=>{
  const directory=new URL('../.github/workflows/',import.meta.url);
  const files=await readdir(directory);
  for(const file of files){
    const workflow=await read(`.github/workflows/${file}`);
    assert.doesNotMatch(workflow,/git\s+push/i,`${file} git push içeriyor`);
    assert.doesNotMatch(workflow,/contents:\s*write/i,`${file} yazma izni istiyor`);
  }
});

test('istemci kodunda Supabase yönetici anahtarı bulunmaz',async()=>{
  const files=['index.html','cimento-module.js','cimento-history.js','contracts-module.js'];
  for(const file of files){
    const content=await read(file);
    assert.doesNotMatch(content,/service[_-]?role/i,`${file} yönetici anahtarı işareti içeriyor`);
  }
});

test('otomatik yedekleme tüm iş tablolarını kapsar ve gizli anahtar saklamaz',async()=>{
  const backup=await read('backup-manager.js');
  for(const table of ['sevkiyatlar','cimento_sevkiyatlar','sozlesmeler','sozlesme_fiyat_gecmisi']){
    assert.match(backup,new RegExp(`['\"]${table}['\"]`));
  }
  assert.match(backup,/MAX_SNAPSHOTS=30/);
  assert.doesNotMatch(backup,/service_role|secret[_-]?key|refresh_token|access_token/i);
  assert.match(await read('index.html'),/backup-manager\.js\?v=20260824-backup1/);
});

test('yarınki ve tüm sevkiyat PDFleri aynı profesyonel rapor motorunu kullanır',async()=>{
  const pdf=await read('professional-pdf-reports.js');
  assert.match(pdf,/SEVKİYAT RAPORU/);
  assert.match(pdf,/BETON SEVKİYATLARI/);
  assert.match(pdf,/ÇİMENTO SEVKİYATLARI/);
  assert.match(pdf,/Firma Toplamı/);
  assert.match(pdf,/TOPLAM BETON/);
  assert.match(pdf,/TOPLAM ÇİMENTO/);
  assert.match(pdf,/Sayfa/);
  assert.match(pdf,/replacePdfButton\('tomorrowPdfBtn','tomorrow'\)/);
  assert.match(pdf,/replacePdfButton\('pdfBtn','all'\)/);
  assert.match(pdf,/savePrepared/);
  const contracts=await read('contracts-module.js');
  assert.match(contracts,/BetonexaProfessionalPdf\.savePrepared/);
  assert.doesNotMatch(contracts,/Filtrelenmiş (Beton|Çimento|Sevkiyat)/);
  assert.doesNotMatch(contracts,/Filtrelenmis-Sevkiyatlar\.(pdf|xlsx)/);
  assert.match(await read('index.html'),/professional-pdf-reports\.js\?v=20260826-status-amount1/);
});

test('durum ve değişen miktar ilk çizimde yer ayırır, PDFye aktarılır',async()=>{
  const addon=await read('records-cement-addon.js');
  const status=await read('shipment-status.js');
  const pdf=await read('professional-pdf-reports.js');
  assert.match(addon,/data-shipment-type/);
  assert.match(addon,/planlanan_metraj/);
  assert.match(addon,/box\.dataset\.renderSignature===signature/);
  assert.match(status,/shipment-status-select\[data-shipment-type\]\[data-shipment-id\]/);
  assert.match(pdf,/\['No','Tarih','Saat','Santral','Firma','Şantiye','Beton','Özellik','Pompa','Miktar','Durum','Sorumlu','Telefon'\]/);
  assert.match(pdf,/amountText\(item,'planlanan_metraj','metraj','m³'/);
});

test('otomatik öneriler son kez tekilleştirilir ve filtreli PDF durum bilgisini korur',async()=>{
  const cement=await read('cimento-enhancements.js');
  const contracts=await read('contracts-module.js');
  const html=await read('index.html');
  assert.match(cement,/function uniqueSuggestionValues\(values\)/);
  assert.match(cement,/const matches=uniqueSuggestionValues\(values\(\)\)/);
  assert.match(cement,/function dedupeRenderedMenus\(root=document\)/);
  assert.match(cement,/guardRenderedSuggestionMenus\(\)/);
  assert.match(html,/id="sorumluKisi"[^>]+autocomplete="new-password"/);
  assert.match(contracts,/Durum:statusOf\(r\)/);
  assert.match(contracts,/durum:row\.Durum/);
  assert.match(contracts,/planlanan_metraj:row\.Planlanan/);
  assert.match(contracts,/planlanan_tonaj:row\.Planlanan/);
});
