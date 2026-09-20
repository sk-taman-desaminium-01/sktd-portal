-- UASA berasingan daripada sumatif PBD. Selamat dijalankan berulang kali.
alter table public.pbd_nilai
  add column if not exists uasa text;

do $$ begin
  alter table public.pbd_nilai
    add constraint pbd_nilai_uasa_check
    check (uasa is null or uasa in ('A','B','C'));
exception when duplicate_object then null;
end $$;

create table if not exists public.pbd_uasa_tetapan (
  tahun_sesi int not null references public.pbd_sesi(tahun_sesi) on delete cascade,
  tahun smallint not null check (tahun = 6),
  aktif boolean not null default false,
  dikemaskini timestamptz not null default now(),
  primary key (tahun_sesi, tahun)
);

alter table public.pbd_uasa_tetapan enable row level security;
