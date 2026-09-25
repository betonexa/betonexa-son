alter table public.cimento_sevkiyatlar add column if not exists cimento_ozelligi text;
comment on column public.cimento_sevkiyatlar.cimento_ozelligi is 'Sevk edilen çimentonun türü ve dayanım sınıfı';
