# Betonexa

Betonexa; beton ve çimento sevkiyatlarının planlanması, takibi, analizi ve
raporlanması için kullanılan PWA uygulamasıdır.

## Güncel kapsam

- Beton sevkiyatı ekleme, düzenleme ve silme
- Çimento sevkiyatı, tamamlanan sevkiyat geçmişi ve tonaj takibi
- Yarınki beton ve çimento sevkiyatlarının birleşik görünümü
- Firma, şantiye, santral ve tarih bazlı sevkiyat filtreleri
- PDF, Excel ve yazdırma çıktıları
- Sözleşme ve fiyat takibi
- Firma/şantiye adlarının Türkçe karakter ve yazım farklarına göre birleştirilmesi
- Supabase kimlik doğrulaması ve PWA desteği

## Güvenli geliştirme akışı

1. Değişiklik ayrı bir dalda hazırlanır.
2. `npm test` çalıştırılır.
3. Değişiklik pull request üzerinden incelenir.
4. Canlı `main` dalına yalnızca kullanıcı onayından sonra birleştirilir.

## Yerel doğrulama

Node.js 20 veya üzeri ile:

```bash
npm test
```

`archive/index-legacy-20260818.html`, önceki tek-dosya sürümünün yalnızca geri
dönüş amacıyla saklanan kopyasıdır; canlı uygulama tarafından kullanılmaz.
