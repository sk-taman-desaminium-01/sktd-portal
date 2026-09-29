-- Kehadiran murid satu-satu setiap hari (jambatan ke extension iSPEL).
-- Berbeza daripada pbd_kawalan_kelas.bil_hadir/bil_murid (kiraan sahaja,
-- per subjek) — ini SATU fakta sehari semurid, dengan status disahkan.
--
-- Jalankan SEKALI dalam Supabase SQL Editor. Idempoten (IF NOT EXISTS).

create table if not exists pbd_kehadiran_status (
  id uuid primary key default gen_random_uuid(),
  tahun_sesi int not null,
  tarikh date not null,
  kelas text not null,
  disahkan_oleh text,
  disahkan_pada timestamptz,
  dicipta_oleh text,
  dicipta_pada timestamptz not null default now(),
  unique (tahun_sesi, tarikh, kelas)
);

create table if not exists pbd_kehadiran_murid (
  id uuid primary key default gen_random_uuid(),
  tahun_sesi int not null,
  tarikh date not null,
  kelas text not null,
  murid_id uuid not null references pbd_murid(id),
  nama_murid text not null,
  kategori text not null,
  sebab text not null,
  dicipta_oleh text,
  dicipta_pada timestamptz not null default now(),
  unique (tahun_sesi, tarikh, kelas, murid_id)
);

create index if not exists idx_kehadiran_murid_carian
  on pbd_kehadiran_murid (tahun_sesi, tarikh, kelas);

alter table pbd_kehadiran_status enable row level security;
alter table pbd_kehadiran_murid enable row level security;

-- Peraturan keras: jadual BAHARU perlu geran EKSPLISIT, jika tidak Data API
-- PostgREST menolak dengan "permission denied" walaupun SQL ini berjaya.
grant select, insert, update, delete on pbd_kehadiran_status to service_role;
grant select, insert, update, delete on pbd_kehadiran_murid to service_role;
