-- Pembaikan Disiplin & Sahsiah selepas pemasangan SQL awal.
-- Selamat dijalankan sekali atau berulang kali di Supabase SQL Editor.
begin;

-- Kod portal menggunakan ID murid bagi mengelakkan dua murid bernama sama
-- disatukan ketika kes berulang dikira. Skrip awal mencipta jadual tanpa
-- kolum ini.
alter table public.pbd_disiplin
  add column if not exists murid_id uuid references public.pbd_murid(id) on delete set null;
create index if not exists pbd_disiplin_murid_sesi
  on public.pbd_disiplin(tahun_sesi, murid_id)
  where murid_id is not null;
alter table public.pbd_disiplin enable row level security;
revoke all on public.pbd_disiplin from anon, authenticated;
grant all on public.pbd_disiplin to service_role;

-- Pentadbir melantik Guru Disiplin pada /admin/guru-kelas. Skrip awal
-- membenarkan nilai peranan tetapi tidak menyediakan RPC yang dipanggil UI.
alter table public.pbd_guru_kelas
  drop constraint if exists pbd_guru_kelas_peranan_check;
alter table public.pbd_guru_kelas
  add constraint pbd_guru_kelas_peranan_check
  check (peranan in (
    'guru_kelas', 'guru_pembantu', 'penyelaras', 'guru_subjek',
    'guru_rmt', 'guru_disiplin', 'pengurus_pasukan'
  ));
alter table public.pbd_guru_kelas
  drop constraint if exists pbd_guru_kelas_pkey;
alter table public.pbd_guru_kelas
  add primary key (guru_id, tahun_sesi, tahun, kelas, subjek, peranan);

create or replace function public.tetap_tugasan_sekolah(
  p_guru uuid, p_sesi integer, p_tahun integer, p_kelas text, p_peranan text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_peranan not in ('guru_kelas', 'guru_rmt', 'guru_disiplin', 'pengurus_pasukan')
     or length(btrim(p_kelas)) = 0 then
    raise exception 'Tugasan tidak sah';
  end if;

  if not exists (
    select 1 from public.pbd_sesi where tahun_sesi = p_sesi and status = 'aktif'
  ) then
    raise exception 'Sesi tidak aktif';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_sesi::text || ':' || p_tahun::text || ':' || p_kelas || ':' || p_peranan, 0)
  );
  delete from public.pbd_guru_kelas
   where tahun_sesi = p_sesi and tahun = p_tahun and kelas = p_kelas and peranan = p_peranan;
  insert into public.pbd_guru_kelas (guru_id, tahun_sesi, tahun, kelas, subjek, peranan)
  values (p_guru, p_sesi, p_tahun, p_kelas, '', p_peranan);
end;
$$;

revoke all on function public.tetap_tugasan_sekolah(uuid, integer, integer, text, text)
  from public, anon, authenticated;
grant execute on function public.tetap_tugasan_sekolah(uuid, integer, integer, text, text)
  to service_role;

commit;
