# Audit ketahanan portal dan Supabase

Tarikh: 19 September 2026

## Punca kegagalan

Kod portal dan SQL pangkalan data dibina daripada aliran yang berasingan.
Apabila potongan SQL Copilot dijalankan, ia mewujudkan jadual asas tetapi
tertinggal tiga kontrak yang kod telah gunakan:

1. `pbd_disiplin.murid_id` untuk padanan murid dan kiraan kes berulang.
2. RPC `tetap_tugasan_sekolah` untuk lantikan guru kelas, RMT, disiplin dan
   pengurus pasukan.
3. kekangan unik `(tahun_sesi, murid_id)` bagi RMT yang diperlukan oleh
   `on_conflict` semasa import semula roster.

Akibatnya tidak sama bagi setiap modul: Disiplin menerima ralat kolum,
lantikan tugasan menerima ralat RPC, dan RMT akan menerima ralat kekangan
unik hanya selepas butang simpan ditekan.

## Kawalan yang telah dimasukkan

- `pembaikan-disiplin.sql` menyatukan ketiga-tiga pembaikan dan boleh diulang.
- `belumDipasang()` kini mengenal pasti jadual, kolum, cache PostgREST dan
  kekangan unik yang belum ada. Halaman memaparkan status pemasangan,
  bukan ralat teknikal mentah.
- `uji-kontrak-modul` mengunci kontrak kod–SQL untuk tiga kegagalan tersebut.
- `uji-kuasa` mengunci matriks: Admin Mutlak mendapat semua kuasa; Admin dan
  Pentadbir mendapat seluruh kuasa operasi tetapi tidak boleh mengurus akaun
  berperanan `admin`.
- Perlindungan akaun `admin` kini dibuat dalam tindakan pelayan, bukan hanya
  dengan menyembunyikan baris pada skrin Senarai Akses.
- Matriks kuasa kini menggunakan satu senarai operasi. Modul baharu tidak
  perlu ditambah dua kali untuk Admin dan Pentadbir.

## Peraturan penerbitan baharu

Setiap perubahan pangkalan data mesti berada dalam repo bersama kod yang
memanggilnya. Fail SQL manual ialah sumber pemasangan semasa; pindaan
seterusnya diletakkan dalam `supabase/migrations/` sebelum kod diterbitkan.
Selepas pengambilan keadaan pangkalan data semasa ke migrasi, gunakan aliran
Supabase `db pull`, semak diff, dan `db push` supaya rekod migrasi dan skema
pengeluaran tidak lagi boleh berpisah. Supabase sendiri mengesyorkan migrasi
berversi, ujian reset tempatan, dan commit SQL bersama kod:
https://supabase.com/docs/guides/deployment/database-migrations

## Had yang masih perlu dijaga

Audit statik mengesahkan kontrak yang didaftarkan sahaja. Ia tidak boleh
mengesahkan kandungan pangkalan data pengeluaran tanpa akses pangkalan data
tempatan atau CI yang dihubungkan kepada Supabase. Oleh itu, setiap kontrak
baharu perlu ditambah ke `uji-kontrak-modul` dalam commit yang sama.
