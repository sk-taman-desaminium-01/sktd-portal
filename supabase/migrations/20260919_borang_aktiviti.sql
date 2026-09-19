-- Borang Akuan Kebenaran & Kesihatan Aktiviti/Pertandingan.
--
-- Idempoten: boleh dijalankan berulang kali dalam Supabase SQL Editor.
-- Semua bacaan/tulisan dibuat oleh Server Action menggunakan service_role;
-- data penjaga, kesihatan dan No. KP tidak dibuka kepada anon/authenticated.

begin;

create extension if not exists pgcrypto;

create table if not exists public.borang_aktiviti (
  id uuid primary key default gen_random_uuid(),
  nama text not null check (char_length(btrim(nama)) between 1 and 500),
  tarikh date not null,
  masa text not null check (char_length(btrim(masa)) between 1 and 500),
  tempat text not null check (char_length(btrim(tempat)) between 1 and 500),
  anjuran text not null check (char_length(btrim(anjuran)) between 1 and 500),
  skop text not null check (char_length(btrim(skop)) between 1 and 500),
  pengurus_emel text not null,
  tutup date not null check (tutup <= tarikh),
  aktif boolean not null default true,
  dicipta timestamptz not null default now()
);

create index if not exists borang_aktiviti_buka
  on public.borang_aktiviti (aktif, tutup, tarikh, id)
  where aktif;
create index if not exists borang_aktiviti_pengurus
  on public.borang_aktiviti (pengurus_emel, dicipta desc, id);

create table if not exists public.borang_peserta (
  aktiviti_id uuid not null references public.borang_aktiviti(id) on delete cascade,
  murid_id uuid not null references public.pbd_murid(id) on delete restrict,
  nama text not null,
  no_kp text not null check (no_kp ~ '^[0-9]{12}$'),
  kelas text not null,
  dicipta timestamptz not null default now(),
  primary key (aktiviti_id, murid_id),
  unique (aktiviti_id, no_kp)
);

create index if not exists borang_peserta_carian_kp
  on public.borang_peserta (aktiviti_id, no_kp);

create table if not exists public.borang_jawapan (
  id uuid primary key default gen_random_uuid(),
  aktiviti_id uuid not null references public.borang_aktiviti(id) on delete cascade,
  murid_id uuid not null references public.pbd_murid(id) on delete restrict,
  data jsonb not null,
  resit_hash text not null check (resit_hash ~ '^[0-9a-f]{64}$'),
  dicipta timestamptz not null default now(),
  unique (aktiviti_id, murid_id),
  unique (resit_hash)
);

create index if not exists borang_jawapan_aktiviti_dicipta
  on public.borang_jawapan (aktiviti_id, dicipta, id);

-- Had percubaan tidak menyimpan IP; hanya cap SHA-256 daripada IP + aktiviti.
-- Ia mengelakkan borang awam dibanjiri tanpa menyimpan data pelawat mentah.
create table if not exists public.borang_had_akuan (
  kunci text primary key check (kunci ~ '^[0-9a-f]{64}$'),
  hari date not null default current_date,
  cubaan smallint not null default 0 check (cubaan >= 0),
  dikemas timestamptz not null default now()
);

create or replace function public.borang_ambil_giliran(p_kunci text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cubaan smallint;
begin
  if p_kunci is null or p_kunci !~ '^[0-9a-f]{64}$' then
    return false;
  end if;

  insert into public.borang_had_akuan (kunci, hari, cubaan, dikemas)
  values (p_kunci, current_date, 1, now())
  on conflict (kunci) do update
  set hari = current_date,
      cubaan = case
        when public.borang_had_akuan.hari < current_date then 1
        else least(public.borang_had_akuan.cubaan + 1, 13)
      end,
      dikemas = now()
  returning cubaan into v_cubaan;

  -- 12 cubaan sehari bagi satu cap aktiviti/pelawat: cukup untuk membetulkan
  -- taipan penjaga, tetapi kecil untuk serangan automatik.
  return v_cubaan <= 12;
end;
$$;

alter table public.borang_aktiviti enable row level security;
alter table public.borang_peserta enable row level security;
alter table public.borang_jawapan enable row level security;
alter table public.borang_had_akuan enable row level security;

revoke all on table public.borang_aktiviti, public.borang_peserta,
  public.borang_jawapan, public.borang_had_akuan from anon, authenticated;
grant all on table public.borang_aktiviti, public.borang_peserta,
  public.borang_jawapan, public.borang_had_akuan to service_role;

revoke all on function public.borang_ambil_giliran(text) from public, anon, authenticated;
grant execute on function public.borang_ambil_giliran(text) to service_role;

commit;
