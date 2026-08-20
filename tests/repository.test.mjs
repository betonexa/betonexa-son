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
    'contracts-module.js','normalization.js','menu-layout.js','records-cement-addon.js'
  ])assert.match(worker,new RegExp(asset.replace('.','\\.')));
  assert.doesNotMatch(worker,/r\|\|caches\.match\('\.\/index\.html'\)/);
});

test('firma ve şantiye adları tek kuralla normalleşir',async()=>{
  const names=(await import('../normalization.js')).default||globalThis.BetonexaNames;
  assert.equal(names.label('  ŞEN   BETON  '),'Şen Beton');
  assert.equal(names.label('önerge inş.'),'Önerge İnşaat');
  assert.equal(names.key('ÖNERGE İNŞ.'),names.key('onerge insaat'));
  assert.equal(names.key('IŞIKLAR'),names.key('ışıklar'));
  const grouped=names.group([
    {firma:'Şen Beton',metraj:25},
    {firma:'şen   beton',metraj:30},
    {firma:'ŞEN-BETON',metraj:20}
  ],row=>row.firma,row=>row.metraj);
  assert.equal(grouped.length,1);
  assert.equal(grouped[0].name,'Şen Beton');
  assert.equal(grouped[0].total,75);
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
