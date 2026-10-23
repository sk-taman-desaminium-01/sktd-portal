-- e-Keberhasilan (Borang Keberhasilan PBPPP) — dua hala PYD ↔ PP1 ↔ PP2.
-- Idempoten: selamat dijalankan berulang kali. TIADA DROP TABLE/COLUMN.
--
-- Semua akses melalui pelayan portal (service_role) yang menyemak Clerk +
-- kuasa per borang. RLS dihidupkan TANPA dasar: kunci awam tidak boleh
-- membaca atau menulis apa-apa di sini.

-- Siapa menilai siapa, setiap tahun. Ditetapkan pentadbir.
create table if not exists public.ekb_penilai (
  tahun   int  not null,
  pyd_id  uuid not null references public.pbd_guru(id) on delete cascade,
  pp1_id  uuid references public.pbd_guru(id) on delete set null,
  pp2_id  uuid references public.pbd_guru(id) on delete set null,
  dikemas timestamptz not null default now(),
  primary key (tahun, pyd_id),
  constraint ekb_penilai_bukan_diri check (pp1_id is distinct from pyd_id and pp2_id is distinct from pyd_id)
);
-- PP1 dan PP2 mesti orang berbeza (ditambah berasingan supaya jadual sedia ada turut mendapatnya).
do $$ begin
  alter table public.ekb_penilai add constraint ekb_penilai_pp_berbeza check (pp1_id is null or pp2_id is null or pp1_id <> pp2_id);
exception when duplicate_object then null; end $$;
create index if not exists ekb_penilai_pp1 on public.ekb_penilai (tahun, pp1_id);
create index if not exists ekb_penilai_pp2 on public.ekb_penilai (tahun, pp2_id);

-- Satu borang setiap PYD setiap tahun. `versi` = kunci optimistik: tulisan
-- hanya berjaya jika versi belum berubah sejak dibaca (PYD dan PP1 boleh
-- membuka borang yang sama serentak).
create table if not exists public.ekb_borang (
  id        uuid primary key default gen_random_uuid(),
  tahun     int  not null,
  pyd_id    uuid not null references public.pbd_guru(id) on delete cascade,
  versi     int  not null default 1,
  pyd       jsonb not null default '{}'::jsonb,
  bidang    jsonb not null default '[]'::jsonb,
  peringkat jsonb not null default '{}'::jsonb,
  dicipta   timestamptz not null default now(),
  dikemas   timestamptz not null default now(),
  unique (tahun, pyd_id)
);

create table if not exists public.ekb_ulasan (
  id           uuid primary key default gen_random_uuid(),
  borang_id    uuid not null references public.ekb_borang(id) on delete cascade,
  sasaran_id   text not null,
  oleh_id      uuid references public.pbd_guru(id) on delete set null,
  oleh_nama    text not null,
  oleh_peranan text not null check (oleh_peranan in ('PYD','PP1','PP2')),
  teks         text not null check (char_length(teks) between 1 and 1000),
  dicipta      timestamptz not null default now()
);
create index if not exists ekb_ulasan_borang on public.ekb_ulasan (borang_id, dicipta);

create table if not exists public.ekb_bukti (
  id         uuid primary key default gen_random_uuid(),
  borang_id  uuid not null references public.ekb_borang(id) on delete cascade,
  sasaran_id text not null,
  peringkat  text not null check (peringkat in ('p1','akhir')),
  nama       text not null,
  saiz       int  not null check (saiz > 0),
  laluan     text not null unique,
  oleh_id    uuid references public.pbd_guru(id) on delete set null,
  dicipta    timestamptz not null default now()
);
create index if not exists ekb_bukti_borang on public.ekb_bukti (borang_id);

create table if not exists public.ekb_log (
  id           bigint generated always as identity primary key,
  borang_id    uuid not null references public.ekb_borang(id) on delete cascade,
  oleh_id      uuid references public.pbd_guru(id) on delete set null,
  oleh_nama    text not null,
  oleh_peranan text not null,
  teks         text not null,
  dicipta      timestamptz not null default now()
);
create index if not exists ekb_log_borang on public.ekb_log (borang_id, dicipta desc);

alter table public.ekb_penilai enable row level security;
alter table public.ekb_borang  enable row level security;
alter table public.ekb_ulasan  enable row level security;
alter table public.ekb_bukti   enable row level security;
alter table public.ekb_log     enable row level security;

grant all on public.ekb_penilai, public.ekb_borang, public.ekb_ulasan, public.ekb_bukti, public.ekb_log to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Baldi bukti PERSENDIRIAN (bukan web-media yang awam). Portal juga
-- menciptanya sendiri jika tiada; baris ini hanya memastikan.
insert into storage.buckets (id, name, public, file_size_limit)
values ('ekb-bukti', 'ekb-bukti', false, 10485760)
on conflict (id) do update set public = false;
