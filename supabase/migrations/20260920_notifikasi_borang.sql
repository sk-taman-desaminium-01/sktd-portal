-- Benarkan kategori notifikasi yang sudah digunakan oleh modul Borang Sekolah.
-- Selamat dijalankan berulang kali.
alter table if exists public.notifikasi
  drop constraint if exists notifikasi_jenis_check;

alter table if exists public.notifikasi
  add constraint notifikasi_jenis_check
  check (jenis in ('tempahan','inventori','akses','pbd','surat','borang','umum'));
