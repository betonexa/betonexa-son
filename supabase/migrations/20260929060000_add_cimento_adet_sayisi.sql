alter table public.cimento_sevkiyatlar add column if not exists adet_sayisi integer;
comment on column public.cimento_sevkiyatlar.adet_sayisi is 'Çimento siparişindeki adet sayısı';
