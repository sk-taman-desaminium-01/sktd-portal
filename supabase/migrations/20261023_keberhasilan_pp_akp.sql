-- e-Keberhasilan: kerani/AKP yang dilantik sebagai PP bagi rakan AKP
-- (cth. Ketua Kerani). Ditetapkan admin/pentadbir. Idempoten.
create table if not exists public.ekb_pp_akp (
  guru_id uuid primary key references public.pbd_guru(id) on delete cascade,
  dicipta timestamptz not null default now()
);
alter table public.ekb_pp_akp enable row level security;
grant all on public.ekb_pp_akp to service_role;
