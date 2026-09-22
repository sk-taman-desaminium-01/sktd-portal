-- Kejohanan beberapa hari: tarikh mula (tarikh) + tarikh tamat (pilihan).
-- Idempoten. Kod portal berfungsi sebelum dan selepas SQL ini dijalankan.
alter table public.borang_aktiviti add column if not exists tarikh_tamat date;
do $$ begin
  alter table public.borang_aktiviti add constraint borang_aktiviti_tamat_selepas_mula
    check (tarikh_tamat is null or tarikh_tamat >= tarikh);
exception when duplicate_object then null; end $$;
notify pgrst, 'reload schema';
