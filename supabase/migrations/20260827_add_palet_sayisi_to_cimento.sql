alter table if exists public.cimento_sevkiyatlar
  add column if not exists palet_sayisi integer;

comment on column public.cimento_sevkiyatlar.palet_sayisi is 'Çimento sevkiyatındaki palet sayısı';
