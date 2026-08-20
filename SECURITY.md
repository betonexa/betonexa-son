# Betonexa güvenlik notları

- Tarayıcıda yalnızca Supabase publishable/anon anahtarı kullanılabilir.
- `service_role` veya başka bir yönetici anahtarı depoya kesinlikle eklenmez.
- `sevkiyatlar`, `cimento_sevkiyatlar` ve `sozlesmeler` tablolarında RLS açık olmalıdır.
- Yazma ve silme politikaları yalnızca oturum açmış, yetkili kullanıcıları kapsamalıdır.
- Demo kullanıcı için salt okunur politikalar ayrı tanımlanmalıdır.
- `sozlesme_fiyat_gecmisi.sozlesme_id` ilişkisi silinen sözleşmeler için
  `ON DELETE CASCADE` kullanmalı veya silme işlemini açıkça engellemelidir.
- Sözleşme ve fiyat geçmişi yazma/silme politikaları `auth.uid()` üzerinden
  yetkili kullanıcıyı kontrol etmelidir; istemci doğrulamasına güvenilmemelidir.
- Yeni kod doğrudan `main` dalına gönderilmez; testli pull request kullanılır.

RLS politikaları Supabase panelinde ayrıca doğrulanmalıdır. Bu depo testi, sunucu
tarafındaki politika durumunu tek başına kanıtlamaz.
